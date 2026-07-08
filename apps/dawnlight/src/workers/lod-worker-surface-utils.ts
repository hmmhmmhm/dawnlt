import { BlockColors, CHUNK_SIZE, CHUNK_Y_SIZE } from '../constants'
import { BlockType } from '../shared/block-types'
import { isBlockTransparent, isFluidBlock } from '../shared/block-utils'

export function isTreeLodBlock(block: BlockType): boolean {
  return block === BlockType.WOOD || block === BlockType.PALM_WOOD || block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES || block === BlockType.APPLE || block === BlockType.ORANGE || block === BlockType.PEACH || block === BlockType.BANANA
}

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

export function getBlockColor(block: BlockType): number {
  const color = BlockColors[block]
  if (!color) return 0x7f7f7f
  return color.top ?? color.side ?? color.bottom ?? color.all ?? 0x7f7f7f
}

export function isDecorativeForLodSurface(block: BlockType): boolean {
  if (isTreeLodBlock(block)) return false
  switch (block) {
    case BlockType.BUSH:
    case BlockType.RED_FLOWER:
    case BlockType.YELLOW_FLOWER:
    case BlockType.CACTUS:
    case BlockType.DEAD_BUSH:
    case BlockType.BAMBOO:
    case BlockType.WINTER_FLOWER:
    case BlockType.FALLEN_LEAVES:
    case BlockType.MOSS:
    case BlockType.MUSHROOM_RED:
    case BlockType.MUSHROOM_BROWN:
    case BlockType.VINE:
    case BlockType.SNOW_VINE:
    case BlockType.PEBBLE:
    case BlockType.STONE_PEBBLE:
    case BlockType.SNOW_PEBBLE:
    case BlockType.STARFISH:
      return true
    default:
      return false
  }
}

export function isTerrainCandidate(block: BlockType): boolean {
  if (block === BlockType.AIR) return false
  if (isTreeLodBlock(block)) return false
  if (isDecorativeForLodSurface(block)) return false
  if (isFluidBlock(block)) return false
  if (isBlockTransparent(block)) return false
  return true
}

export function getBlockAtWorld(worldX: number, worldY: number, worldZ: number, chunksByKey: Record<string, Uint8Array>, minCy: number, maxCy: number): BlockType {
  if (worldY < 0) return BlockType.AIR
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  if (cy < minCy || cy > maxCy) return BlockType.AIR
  const localY = worldY - cy * CHUNK_Y_SIZE
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const chunk = chunksByKey[getChunkKey3D(Math.floor(worldX / CHUNK_SIZE), cy, Math.floor(worldZ / CHUNK_SIZE))]
  if (!chunk) return BlockType.AIR
  return chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
}

export function hasSolidSupportBelow(worldX: number, worldY: number, worldZ: number, chunksByKey: Record<string, Uint8Array>, minCy: number, maxCy: number): boolean {
  if (worldY <= 0) return true
  const below = getBlockAtWorld(worldX, worldY - 1, worldZ, chunksByKey, minCy, maxCy)
  if (below === BlockType.AIR) return false
  if (isFluidBlock(below)) return false
  if (isBlockTransparent(below)) return false
  return true
}
