import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { BlockColors } from '../../../constants'
import { BlockType } from '../../../shared/block-types'
import type { LodSectionRenderData, TreeLodVoxel } from './lod-data-types'

const BASE_OPACITY = 1
const TRIANGLES_PER_CUBE = 12

interface TreeSectionMeshes {
  root: Group
  meshes: InstancedMesh[]
  drawCalls: number
  triangleCount: number
  instanceCount: number
}

function getVoxelColorHex(block: BlockType): number {
  const base = BlockColors[block]
  // Trees are mostly observed from side faces in perspective view.
  // Match near-block appearance by preferring side tint for trunk-like blocks.
  let hex = 0x7f7f7f
  if (block === BlockType.WOOD || block === BlockType.PALM_WOOD) {
    hex = base?.side ?? base?.all ?? base?.top ?? base?.bottom ?? hex
  } else if (block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES) {
    hex = base?.all ?? base?.side ?? base?.top ?? base?.bottom ?? hex
  } else if (block === BlockType.VINE || block === BlockType.SNOW_VINE) {
    hex = base?.all ?? base?.side ?? base?.top ?? base?.bottom ?? hex
  } else {
    hex = base?.all ?? base?.side ?? base?.top ?? base?.bottom ?? hex
  }
  return hex
}

export class FarTreeRenderer {
  private readonly group: Group
  private readonly sections = new Map<string, TreeSectionMeshes>()
  private readonly transform = new Matrix4()
  private readonly rotation = new Quaternion()
  private readonly scale = new Vector3(1, 1, 1)
  private readonly position = new Vector3()

  constructor(group: Group) {
    this.group = group
  }

  upsertSection(data: LodSectionRenderData): void {
    this.removeSection(data.sectionKey)
    const voxels = data.treeData?.voxels ?? []
    if (voxels.length === 0) return

    const root = new Group()
    root.visible = false
    const cubeGeometry = new BoxGeometry(1, 1, 1)
    const meshes: InstancedMesh[] = []
    const byBlock = new Map<BlockType, TreeLodVoxel[]>()
    for (const voxel of voxels) {
      const list = byBlock.get(voxel.block)
      if (list) {
        list.push(voxel)
      } else {
        byBlock.set(voxel.block, [voxel])
      }
    }
    for (const [block, blockVoxels] of byBlock) {
      const material = new MeshStandardMaterial({
        color: getVoxelColorHex(block),
        roughness: 0.8,
        metalness: 0.05,
        fog: true,
        transparent: true,
        opacity: 0,
      })
      const mesh = new InstancedMesh(cubeGeometry, material, blockVoxels.length)
      this.fillTreeVoxels(mesh, blockVoxels)
      root.add(mesh)
      meshes.push(mesh)
    }
    this.group.add(root)

    this.sections.set(data.sectionKey, {
      root,
      meshes,
      drawCalls: meshes.length,
      triangleCount: TRIANGLES_PER_CUBE * voxels.length,
      instanceCount: voxels.length,
    })
  }

  private fillTreeVoxels(mesh: InstancedMesh, voxels: readonly TreeLodVoxel[]): void {
    for (let i = 0; i < voxels.length; i++) {
      const voxel = voxels[i]
      this.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5)
      this.transform.compose(this.position, this.rotation, this.scale)
      mesh.setMatrixAt(i, this.transform)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  setSectionVisible(sectionKey: string, visible: boolean): void {
    const section = this.sections.get(sectionKey)
    if (!section) return
    section.root.visible = visible
  }

  updateSectionVisualState(sectionKey: string, alpha: number, blending: boolean, sunLight: number): void {
    const section = this.sections.get(sectionKey)
    if (!section) return
    section.root.visible = alpha > 0.001
    for (const mesh of section.meshes) {
      if (Array.isArray(mesh.material)) continue
      const material = mesh.material as MeshStandardMaterial
      material.transparent = blending
      material.depthWrite = !blending
      material.opacity = blending ? BASE_OPACITY * alpha : BASE_OPACITY
      const t = Math.max(0, Math.min(1, sunLight / 2))
      material.roughness = 0.3 + (0.8 - 0.3) * t
      material.metalness = 0.4 + (0.1 - 0.4) * t
    }
  }

  removeSection(sectionKey: string): void {
    const section = this.sections.get(sectionKey)
    if (!section) return
    this.group.remove(section.root)
    for (const mesh of section.meshes) {
      mesh.geometry.dispose()
      if (!Array.isArray(mesh.material)) mesh.material.dispose()
    }
    this.sections.delete(sectionKey)
  }

  dispose(): void {
    for (const [sectionKey] of this.sections) {
      this.removeSection(sectionKey)
    }
  }

  getStats(): {
    sectionCount: number
    drawCalls: number
    instanceCount: number
    triangleCount: number
  } {
    let drawCalls = 0
    let instanceCount = 0
    let triangleCount = 0
    for (const section of this.sections.values()) {
      drawCalls += section.drawCalls
      instanceCount += section.instanceCount
      triangleCount += section.triangleCount
    }
    return {
      sectionCount: this.sections.size,
      drawCalls,
      instanceCount,
      triangleCount,
    }
  }
}
