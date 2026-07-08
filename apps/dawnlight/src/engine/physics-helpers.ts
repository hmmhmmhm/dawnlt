import { BlockType } from '../types'
import { getBlock, getBlock3D } from './world'

/**
 * Helper to get block from either 2D or 3D chunk system
 * Prefers 3D chunks if available
 * @param treatMissingAsSolid - If true, return SOLID when chunk data is missing (for collision)
 */
export function getBlockFromChunks(x: number, y: number, z: number, chunks: Map<string, Uint8Array>, chunks3D?: Map<string, Uint8Array>, treatMissingAsSolid: boolean = false): BlockType {
  // Prefer 3D chunks if available
  if (chunks3D && chunks3D.size > 0) {
    return getBlock3D(x, y, z, chunks3D, treatMissingAsSolid)
  }
  return getBlock(x, y, z, chunks)
}

/**
 * Check if a block is solid (player cannot pass through it)
 */
export function isBlockSolid(block: BlockType): boolean {
  // Non-solid blocks that player can pass through
  return (
    block !== BlockType.AIR &&
    block !== BlockType.WATER &&
    block !== BlockType.BUSH &&
    block !== BlockType.RED_FLOWER &&
    block !== BlockType.YELLOW_FLOWER &&
    block !== BlockType.DEAD_BUSH &&
    block !== BlockType.BAMBOO &&
    block !== BlockType.SNOW_BUSH &&
    block !== BlockType.WINTER_FLOWER &&
    block !== BlockType.FALLEN_LEAVES &&
    block !== BlockType.MOSS &&
    block !== BlockType.MUSHROOM_RED &&
    block !== BlockType.MUSHROOM_BROWN &&
    block !== BlockType.VINE &&
    block !== BlockType.SNOW_VINE &&
    block !== BlockType.PEBBLE &&
    block !== BlockType.STONE_PEBBLE &&
    block !== BlockType.SNOW_PEBBLE &&
    block !== BlockType.STARFISH &&
    block !== BlockType.APPLE &&
    block !== BlockType.ORANGE &&
    block !== BlockType.PEACH &&
    block !== BlockType.BANANA &&
    block !== BlockType.WILD_WHEAT &&
    block !== BlockType.WILD_RICE &&
    block !== BlockType.WHEAT_CROP_1 &&
    block !== BlockType.WHEAT_CROP_2 &&
    block !== BlockType.WHEAT_CROP_3 &&
    block !== BlockType.WHEAT_CROP_4 &&
    block !== BlockType.RICE_CROP_1 &&
    block !== BlockType.RICE_CROP_2 &&
    block !== BlockType.RICE_CROP_3 &&
    block !== BlockType.RICE_CROP_4
  )
}
