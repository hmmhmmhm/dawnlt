/**
 * Terrain utilities for SceneSystem
 * Terrain height calculation utilities
 */

import { CHUNK_HEIGHT, WATER_LEVEL } from '../../../constants'
import { getBlock3D, getChunkKey3D, worldToChunk3D } from '../../../engine/world'
import { BlockType } from '../../../types'

/**
 * Calculate terrain height at a specific position
 * Returns -1 if chunk is not loaded
 */
export function getTerrainHeight(x: number, z: number, chunks3D: Map<string, Uint8Array>): number {
  const blockX = Math.floor(x)
  const blockZ = Math.floor(z)

  // Check if chunk at this position is loaded (check mid-height chunk)
  const checkY = 64 // Approximate surface height
  const { cx, cy, cz } = worldToChunk3D(blockX, checkY, blockZ)
  const chunkKey = getChunkKey3D(cx, cy, cz)
  if (!chunks3D.has(chunkKey)) {
    return -1 // Chunk not loaded
  }

  // Scan from top to bottom to find first solid block
  for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
    const block = getBlock3D(blockX, y, blockZ, chunks3D)
    if (block !== BlockType.AIR && block !== BlockType.WATER) {
      return y + 1 // Position above block
    }
  }
  return WATER_LEVEL // Default value (when all blocks are AIR/WATER)
}
