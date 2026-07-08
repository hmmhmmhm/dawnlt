import { BackSide, type BufferGeometry, DoubleSide, type Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { getFluidMaterial } from '../../../engine/materials'
import { DEBUG_DISABLE_SIDE_FACES, DEBUG_FORCE_WIREFRAME, DEBUG_USE_BASIC_MATERIAL, logDebugLod } from './far-renderer-debug'

export const MIN_RENDER_LEVEL = 1
export const BASE_OPACITY = 1
export const FADE_IN_SPEED = 6
export const FADE_OUT_SPEED = 8
export const BLEND_ALPHA_EPSILON = 0.02
export const COVERAGE_READY_ALPHA = 0.98
export const FAR_WATER_OPACITY_SCALE = 0.9
export const MAX_SECTION_COMMITS_PER_UPDATE = 1

const NIGHT_ROUGHNESS = 0.3
const NIGHT_METALNESS = 0.4
const DAY_ROUGHNESS = 0.8
const DAY_METALNESS = 0.1

export interface SectionVisualState {
  alpha: number
  targetAlpha: number
}

export interface SectionTriangleStats {
  level: number
  topTriangles: number
  boundaryTriangles: number
  internalTriangles: number
  totalTriangles: number
}

export interface TrianglePercentileSummary {
  p50: number
  p90: number
  p99: number
  max: number
}

export type FarSectionMaterial = MeshStandardMaterial | MeshBasicMaterial
export type FarSectionMaterialSet = [FarSectionMaterial, FarSectionMaterial, FarSectionMaterial]
export type FarSectionMesh = Mesh<BufferGeometry, FarSectionMaterial | FarSectionMaterialSet>
export type FarWaterMesh = Mesh<BufferGeometry, FarSectionMaterial>

export interface PendingSectionCommit {
  mesh: FarSectionMesh | null
  waterMesh: FarWaterMesh | null
  stats: SectionTriangleStats | null
}

export function createSectionMaterials(): FarSectionMaterialSet {
  const topMaterialConfig = {
    vertexColors: true,
    transparent: true,
    opacity: 0,
    fog: true,
    roughness: 0.8,
    metalness: 0.1,
    side: DoubleSide,
    wireframe: DEBUG_FORCE_WIREFRAME,
    depthTest: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
  }
  const boundaryMaterialConfig = {
    ...topMaterialConfig,
    polygonOffsetFactor: 6,
    polygonOffsetUnits: 6,
  }
  const internalMaterialConfig = {
    ...topMaterialConfig,
    side: BackSide,
    polygonOffsetFactor: 10,
    polygonOffsetUnits: 10,
  }
  if (DEBUG_USE_BASIC_MATERIAL) {
    logDebugLod('material=MeshBasicMaterial', {
      wireframe: DEBUG_FORCE_WIREFRAME,
      sideFacesDisabled: DEBUG_DISABLE_SIDE_FACES,
    })
    return [new MeshBasicMaterial(topMaterialConfig), new MeshBasicMaterial(boundaryMaterialConfig), new MeshBasicMaterial(internalMaterialConfig)]
  }
  logDebugLod('material=MeshStandardMaterial', {
    wireframe: DEBUG_FORCE_WIREFRAME,
    sideFacesDisabled: DEBUG_DISABLE_SIDE_FACES,
  })
  return [new MeshStandardMaterial(topMaterialConfig), new MeshStandardMaterial(boundaryMaterialConfig), new MeshStandardMaterial(internalMaterialConfig)]
}

export function forEachMaterial(material: FarSectionMaterial | FarSectionMaterialSet, fn: (entry: FarSectionMaterial) => void): void {
  if (Array.isArray(material)) {
    for (const entry of material) fn(entry)
    return
  }
  fn(material)
}

export function disposeMaterial(material: FarSectionMaterial | FarSectionMaterialSet): void {
  forEachMaterial(material, (entry) => entry.dispose())
}

export function applyLightingResponse(material: FarSectionMaterial, sunLight: number): void {
  if (!(material as MeshStandardMaterial).isMeshStandardMaterial) return
  const standard = material as MeshStandardMaterial
  const t = Math.max(0, Math.min(1, sunLight / 2))
  standard.roughness = NIGHT_ROUGHNESS + (DAY_ROUGHNESS - NIGHT_ROUGHNESS) * t
  standard.metalness = NIGHT_METALNESS + (DAY_METALNESS - NIGHT_METALNESS) * t
}

export function createWaterMaterial(): FarSectionMaterial {
  const fluid = getFluidMaterial()
  const baseConfig = {
    color: fluid.color.clone(),
    transparent: true,
    opacity: 0,
    fog: true,
    side: DoubleSide,
    wireframe: DEBUG_FORCE_WIREFRAME,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }
  if (DEBUG_USE_BASIC_MATERIAL) return new MeshBasicMaterial(baseConfig)
  return new MeshStandardMaterial({
    ...baseConfig,
    roughness: fluid.roughness,
    metalness: fluid.metalness,
  })
}

export function applyWaterLightingResponse(material: FarSectionMaterial): number {
  const fluid = getFluidMaterial()
  material.color.copy(fluid.color)
  if ((material as MeshStandardMaterial).isMeshStandardMaterial) {
    const standard = material as MeshStandardMaterial
    standard.roughness = fluid.roughness
    standard.metalness = fluid.metalness
  }
  return fluid.opacity
}

export function summarizePercentiles(values: readonly number[]): TrianglePercentileSummary {
  if (values.length === 0) return { p50: 0, p90: 0, p99: 0, max: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
  }
}

export function buffersToTriangleCount(geometry: BufferGeometry): number {
  const indexCount = geometry.getIndex()?.count ?? 0
  return Math.floor(indexCount / 3)
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) return 0
  const clampedRatio = Math.min(1, Math.max(0, ratio))
  const index = Math.min(sortedValues.length - 1, Math.ceil(clampedRatio * sortedValues.length) - 1)
  return sortedValues[index]
}
