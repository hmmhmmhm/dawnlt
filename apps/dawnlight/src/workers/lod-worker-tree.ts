import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE } from '../constants'
import type { LodSectionBuildInput, TreeLodSectionData, TreeLodVoxel } from '../game/engine/lod/lod-data-types'
import { BlockType } from '../shared/block-types'

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function isTreeVisualBlock(block: BlockType): boolean {
  return block === BlockType.WOOD || block === BlockType.PALM_WOOD || block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES || block === BlockType.APPLE || block === BlockType.ORANGE || block === BlockType.PEACH || block === BlockType.BANANA
}

function getBlockAtWorld(worldX: number, worldY: number, worldZ: number, chunksByKey: Record<string, Uint8Array>): BlockType {
  if (worldY < 0 || worldY >= CHUNK_Y_COUNT * CHUNK_Y_SIZE) return BlockType.AIR
  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const chunk = chunksByKey[getChunkKey3D(cx, cy, cz)]
  if (!chunk) return BlockType.AIR
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = worldY - cy * CHUNK_Y_SIZE
  return chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
}

export function buildTreeLodSectionData(input: LodSectionBuildInput, baseSize: number): TreeLodSectionData {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE
  const worldEndX = worldStartX + baseSize
  const worldEndZ = worldStartZ + baseSize
  const minWorldY = Math.max(0, input.minCy) * CHUNK_Y_SIZE
  const maxWorldY = (Math.min(input.maxCy, CHUNK_Y_COUNT - 1) + 1) * CHUNK_Y_SIZE - 1
  const voxels: TreeLodVoxel[] = []

  for (let worldZ = worldStartZ; worldZ < worldEndZ; worldZ++) {
    for (let worldX = worldStartX; worldX < worldEndX; worldX++) {
      for (let worldY = minWorldY; worldY <= maxWorldY; worldY++) {
        const block = getBlockAtWorld(worldX, worldY, worldZ, input.chunksByKey)
        if (!isTreeVisualBlock(block)) continue
        voxels.push({ x: worldX, y: worldY, z: worldZ, block })
      }
    }
  }

  return {
    sectionKey: input.sectionKey,
    worldStartX,
    worldStartZ,
    voxels,
  }
}
