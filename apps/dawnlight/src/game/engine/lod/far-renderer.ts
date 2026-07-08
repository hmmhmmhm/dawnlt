import { Group, Mesh, type Scene, type WebGLRenderer } from 'three'
import { DEBUG_DISABLE_SIDE_FACES, DEBUG_FORCE_WIREFRAME, DEBUG_USE_BASIC_MATERIAL, logDebugLod } from './far-renderer-debug'
import { buildSectionGeometry } from './far-renderer-geometry'
import { prewarmFarRendererMaterials } from './far-renderer-prewarm'
import {
  applyLightingResponse,
  applyWaterLightingResponse,
  BASE_OPACITY,
  BLEND_ALPHA_EPSILON,
  buffersToTriangleCount,
  COVERAGE_READY_ALPHA,
  createSectionMaterials,
  createWaterMaterial,
  disposeMaterial,
  FADE_IN_SPEED,
  FADE_OUT_SPEED,
  FAR_WATER_OPACITY_SCALE,
  type FarSectionMaterial,
  type FarSectionMesh,
  type FarWaterMesh,
  forEachMaterial,
  MAX_SECTION_COMMITS_PER_UPDATE,
  MIN_RENDER_LEVEL,
  type PendingSectionCommit,
  type SectionTriangleStats,
  type SectionVisualState,
  summarizePercentiles,
} from './far-renderer-support'
import { buildSectionWaterGeometry } from './far-renderer-water-geometry'
import { FarTreeRenderer } from './far-tree-renderer'
import type { LodSectionRenderData } from './lod-data-types'

export class FarRenderer {
  private readonly group: Group
  private readonly treeGroup: Group
  private readonly treeRenderer: FarTreeRenderer
  private readonly sectionMeshes = new Map<string, FarSectionMesh>()
  private readonly waterMeshes = new Map<string, FarWaterMesh>()
  private readonly visualStates = new Map<string, SectionVisualState>()
  private readonly sectionStats = new Map<string, SectionTriangleStats>()
  private readonly pendingCommits = new Map<string, PendingSectionCommit>()
  private prewarmPromise: Promise<void> | null = null

  constructor(
    scene: Scene,
    private readonly renderer: WebGLRenderer | null = null,
  ) {
    this.group = new Group()
    this.group.name = 'far-lod-terrain-group'
    this.treeGroup = new Group()
    this.treeGroup.name = 'far-lod-tree-group'
    scene.add(this.group)
    scene.add(this.treeGroup)
    this.treeRenderer = new FarTreeRenderer(this.treeGroup)
    logDebugLod('far renderer initialized', {
      sideFacesDisabled: DEBUG_DISABLE_SIDE_FACES,
      forceWireframe: DEBUG_FORCE_WIREFRAME,
      basicMaterial: DEBUG_USE_BASIC_MATERIAL,
    })
  }

  upsertSection(data: LodSectionRenderData): void {
    this.treeRenderer.upsertSection(data)
    this.visualStates.set(data.sectionKey, this.visualStates.get(data.sectionKey) ?? { alpha: 0, targetAlpha: 0 })
    if (data.level < MIN_RENDER_LEVEL) {
      logDebugLod('skip section: below min level', {
        sectionKey: data.sectionKey,
        level: data.level,
      })
      this.removeSection(data.sectionKey)
      return
    }

    const built = buildSectionGeometry(data)
    const geometry = built.geometry
    const hasTerrainGeometry = geometry.getAttribute('position').count > 0
    const waterGeometry = buildSectionWaterGeometry(data)
    if (!hasTerrainGeometry && !waterGeometry) {
      logDebugLod('skip section: empty terrain and water', {
        sectionKey: data.sectionKey,
        level: data.level,
      })
      geometry.dispose()
      this.removeTerrainSection(data.sectionKey)
      return
    }

    const mesh = hasTerrainGeometry ? new Mesh(geometry, createSectionMaterials()) : null
    const waterMesh = waterGeometry ? new Mesh(waterGeometry, createWaterMaterial()) : null
    if (mesh) {
      mesh.frustumCulled = true
      mesh.visible = false
      mesh.matrixAutoUpdate = true
    } else {
      geometry.dispose()
    }
    if (waterMesh) {
      waterMesh.frustumCulled = true
      waterMesh.visible = false
      waterMesh.matrixAutoUpdate = true
    }

    const previousState = this.visualStates.get(data.sectionKey)
    this.visualStates.set(data.sectionKey, {
      alpha: previousState?.alpha ?? 0,
      targetAlpha: previousState?.targetAlpha ?? 0,
    })
    this.disposePendingCommit(data.sectionKey)
    const stats = mesh
      ? {
          level: data.level,
          topTriangles: built.topTriangleCount,
          boundaryTriangles: built.boundaryTriangleCount,
          internalTriangles: built.internalTriangleCount,
          totalTriangles: buffersToTriangleCount(geometry),
        }
      : null
    this.pendingCommits.set(data.sectionKey, { mesh, waterMesh, stats })
    this.ensurePrewarmed(mesh, waterMesh)
    logDebugLod('upsert section', {
      sectionKey: data.sectionKey,
      level: data.level,
      vertices: hasTerrainGeometry ? geometry.getAttribute('position').count : 0,
      triangles: hasTerrainGeometry ? buffersToTriangleCount(geometry) : 0,
      hasWater: !!waterMesh,
      topTriangles: built.topTriangleCount,
      boundaryTriangles: built.boundaryTriangleCount,
      internalTriangles: built.internalTriangleCount,
    })
  }

  hasSection(sectionKey: string): boolean {
    return this.sectionMeshes.has(sectionKey) || this.waterMeshes.has(sectionKey) || this.pendingCommits.has(sectionKey)
  }

  isSectionCoverageReady(sectionKey: string): boolean {
    const mesh = this.sectionMeshes.get(sectionKey)
    const state = this.visualStates.get(sectionKey)
    if (!mesh || !state) return false
    if (!mesh.visible) return false
    return state.alpha >= COVERAGE_READY_ALPHA
  }

  getStats() {
    let vertexCount = 0
    let triangleCount = 0
    const levelDistribution = new Map<number, number>()
    const topTriangles: number[] = []
    const boundaryTriangles: number[] = []
    const internalTriangles: number[] = []
    const totalTriangles: number[] = []
    for (const mesh of this.sectionMeshes.values()) {
      vertexCount += mesh.geometry.getAttribute('position').count
      triangleCount += buffersToTriangleCount(mesh.geometry)
    }
    for (const stats of this.sectionStats.values()) {
      levelDistribution.set(stats.level, (levelDistribution.get(stats.level) ?? 0) + 1)
      topTriangles.push(stats.topTriangles)
      boundaryTriangles.push(stats.boundaryTriangles)
      internalTriangles.push(stats.internalTriangles)
      totalTriangles.push(stats.totalTriangles)
    }
    const treeStats = this.treeRenderer.getStats()
    return {
      meshCount: this.sectionMeshes.size,
      vertexCount,
      triangleCount,
      treeSectionCount: treeStats.sectionCount,
      treeDrawCalls: treeStats.drawCalls,
      treeInstanceCount: treeStats.instanceCount,
      treeTriangleCount: treeStats.triangleCount,
      levelDistribution: Object.fromEntries([...levelDistribution.entries()].sort((a, b) => a[0] - b[0]).map(([level, count]) => [String(level), count])),
      trianglePercentiles: {
        sampleCount: totalTriangles.length,
        top: summarizePercentiles(topTriangles),
        boundary: summarizePercentiles(boundaryTriangles),
        internal: summarizePercentiles(internalTriangles),
        total: summarizePercentiles(totalTriangles),
      },
    }
  }

  setSectionVisible(sectionKey: string, visible: boolean): void {
    const state = this.visualStates.get(sectionKey)
    if (!state) return
    state.targetAlpha = visible ? 1 : 0
    if (visible) {
      const mesh = this.sectionMeshes.get(sectionKey)
      if (mesh) mesh.visible = true
      const water = this.waterMeshes.get(sectionKey)
      if (water) water.visible = true
      this.treeRenderer.setSectionVisible(sectionKey, true)
    }
  }

  update(_cameraX: number, _cameraZ: number, deltaSeconds: number, sunLight: number): void {
    if (deltaSeconds <= 0) return
    this.commitPendingSections()
    for (const [sectionKey, state] of this.visualStates) {
      const speed = state.targetAlpha > state.alpha ? FADE_IN_SPEED : FADE_OUT_SPEED
      const step = speed * deltaSeconds
      if (state.targetAlpha > state.alpha) {
        state.alpha = Math.min(state.targetAlpha, state.alpha + step)
      } else if (state.targetAlpha < state.alpha) {
        state.alpha = Math.max(state.targetAlpha, state.alpha - step)
      }
      const requiresBlending = state.alpha > BLEND_ALPHA_EPSILON && state.alpha < 1 - BLEND_ALPHA_EPSILON
      const mesh = this.sectionMeshes.get(sectionKey)
      if (mesh) {
        forEachMaterial(mesh.material, (material) => {
          applyLightingResponse(material, sunLight)
          material.transparent = requiresBlending
          material.depthWrite = !requiresBlending
          material.opacity = requiresBlending ? BASE_OPACITY * state.alpha : BASE_OPACITY
        })
        mesh.visible = state.alpha > 0.001
      }
      const water = this.waterMeshes.get(sectionKey)
      if (water) {
        const sourceOpacity = applyWaterLightingResponse(water.material) ?? 1
        const visibleAlpha = sourceOpacity * FAR_WATER_OPACITY_SCALE * state.alpha
        water.material.opacity = visibleAlpha
        water.visible = visibleAlpha > 0.001
      }
      this.treeRenderer.updateSectionVisualState(sectionKey, state.alpha, requiresBlending, sunLight)
    }
  }

  removeSection(sectionKey: string): void {
    this.removeTerrainSection(sectionKey)
    this.treeRenderer.removeSection(sectionKey)
    this.visualStates.delete(sectionKey)
  }

  dispose(): void {
    for (const key of [...this.sectionMeshes.keys(), ...this.visualStates.keys()]) {
      this.removeSection(key)
    }
    this.treeRenderer.dispose()
    this.group.removeFromParent()
    this.treeGroup.removeFromParent()
  }

  private removeTerrainSection(sectionKey: string): void {
    this.disposePendingCommit(sectionKey)
    const mesh = this.sectionMeshes.get(sectionKey)
    if (mesh) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      disposeMaterial(mesh.material)
      this.sectionMeshes.delete(sectionKey)
      this.sectionStats.delete(sectionKey)
    }
    const water = this.waterMeshes.get(sectionKey)
    if (water) {
      this.group.remove(water)
      water.geometry.dispose()
      water.material.dispose()
      this.waterMeshes.delete(sectionKey)
    }
    logDebugLod('remove section', { sectionKey })
  }

  private commitPendingSections(): void {
    let committed = 0
    for (const [sectionKey, pending] of this.pendingCommits) {
      this.pendingCommits.delete(sectionKey)
      this.removeActiveTerrainSection(sectionKey)
      if (pending.mesh) {
        this.group.add(pending.mesh)
        this.sectionMeshes.set(sectionKey, pending.mesh)
      }
      if (pending.waterMesh) {
        this.group.add(pending.waterMesh)
        this.waterMeshes.set(sectionKey, pending.waterMesh)
      }
      if (pending.stats) {
        this.sectionStats.set(sectionKey, pending.stats)
      } else {
        this.sectionStats.delete(sectionKey)
      }
      committed++
      if (committed >= MAX_SECTION_COMMITS_PER_UPDATE) break
    }
  }

  private disposePendingCommit(sectionKey: string): void {
    const pending = this.pendingCommits.get(sectionKey)
    if (!pending) return
    if (pending.mesh) {
      pending.mesh.geometry.dispose()
      disposeMaterial(pending.mesh.material)
    }
    if (pending.waterMesh) {
      pending.waterMesh.geometry.dispose()
      pending.waterMesh.material.dispose()
    }
    this.pendingCommits.delete(sectionKey)
  }

  private removeActiveTerrainSection(sectionKey: string): void {
    const mesh = this.sectionMeshes.get(sectionKey)
    if (mesh) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      disposeMaterial(mesh.material)
      this.sectionMeshes.delete(sectionKey)
      this.sectionStats.delete(sectionKey)
    }
    const water = this.waterMeshes.get(sectionKey)
    if (water) {
      this.group.remove(water)
      water.geometry.dispose()
      water.material.dispose()
      this.waterMeshes.delete(sectionKey)
    }
  }

  private ensurePrewarmed(mesh: FarSectionMesh | null, waterMesh: FarWaterMesh | null): void {
    if (this.prewarmPromise) return
    const materials: FarSectionMaterial[] = []
    if (mesh) {
      if (Array.isArray(mesh.material)) materials.push(...mesh.material)
      else materials.push(mesh.material)
    }
    if (waterMesh) materials.push(waterMesh.material)
    if (materials.length === 0) return
    this.prewarmPromise = prewarmFarRendererMaterials(this.renderer, materials).catch(() => undefined)
  }
}
