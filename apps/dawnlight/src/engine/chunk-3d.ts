import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE, RENDER_DISTANCE_Y } from '../constants'
import { BlockType } from '../types'

/**
 * 3D Chunk System - Vertical chunk division (16x32x16)
 * Vertical chunk sections for efficient Y-axis culling
 */

/**
 * Generate 3D chunk key (using X, Y, Z coordinates)
 */
export function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

/**
 * Convert world coordinates to 3D chunk coordinates
 */
export function worldToChunk3D(x: number, y: number, z: number): { cx: number; cy: number; cz: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cy: Math.floor(y / CHUNK_Y_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  }
}

/**
 * Calculate block index within 3D chunk section (16x32x16)
 */
export function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

/**
 * Get block from 3D chunk system
 * @param defaultIfMissing - Block type to return when chunk data is missing
 *   - false/undefined: Return AIR (default)
 *   - true: Return STONE (for collision, backward compatibility)
 *   - BlockType: Return specified block type (e.g., for water boundary handling)
 */
export function getBlock3D(worldX: number, worldY: number, worldZ: number, chunks3D: Map<string, Uint8Array>, defaultIfMissing: boolean | BlockType = false): BlockType {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return BlockType.AIR

  const { cx, cy, cz } = worldToChunk3D(worldX, worldY, worldZ)
  const key = getChunkKey3D(cx, cy, cz)
  const chunkData = chunks3D.get(key)

  if (!chunkData) {
    // Handle different default types for missing chunks
    if (typeof defaultIfMissing === 'boolean') {
      return defaultIfMissing ? BlockType.STONE : BlockType.AIR
    }
    return defaultIfMissing
  }

  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  return chunkData[getBlockIndex3D(localX, localY, localZ)]
}

/**
 * Set block in 3D chunk system
 */
export function setBlock3D(worldX: number, worldY: number, worldZ: number, blockType: BlockType, chunks3D: Map<string, Uint8Array>): boolean {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return false

  const { cx, cy, cz } = worldToChunk3D(worldX, worldY, worldZ)
  const key = getChunkKey3D(cx, cy, cz)
  const chunkData = chunks3D.get(key)

  if (!chunkData) return false

  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  chunkData[getBlockIndex3D(localX, localY, localZ)] = blockType

  return true
}

/**
 * Get all 3D chunks within render distance
 * Load more chunks above player than below (underground optimization)
 *
 * Uses Chebyshev distance: max(|dx|, |dz|)
 * This treats diagonal chunks as equal distance so they are not skipped
 */
export function getChunksInRadius3D(
  centerCx: number,
  centerCy: number,
  centerCz: number,
  radiusXZ: number,
  radiusY: number = RENDER_DISTANCE_Y,
  radiusYDown: number = 0, // Number of chunks to load below player (0 = current level and above only)
): Array<{ cx: number; cy: number; cz: number; dist: number }> {
  const chunks: Array<{ cx: number; cy: number; cz: number; dist: number }> = []

  // Asymmetric Y range: load more above, less below
  const minCy = Math.max(0, centerCy - radiusYDown)
  const maxCy = Math.min(CHUNK_Y_COUNT - 1, centerCy + radiusY)

  for (let dx = -radiusXZ; dx <= radiusXZ; dx++) {
    for (let dz = -radiusXZ; dz <= radiusXZ; dz++) {
      // Chebyshev distance: includes diagonal chunks (instead of Euclidean distance)
      const chebyshevDist = Math.max(Math.abs(dx), Math.abs(dz))
      if (chebyshevDist > radiusXZ) continue

      for (let cy = minCy; cy <= maxCy; cy++) {
        const dy = cy - centerCy
        // Distance for sorting: Euclidean distance (load closer ones first)
        const dist = Math.sqrt(dx * dx + dy * dy * 0.5 + dz * dz)
        chunks.push({ cx: centerCx + dx, cy, cz: centerCz + dz, dist })
      }
    }
  }

  return chunks.sort((a, b) => a.dist - b.dist)
}

/**
 * Calculate Y range of 3D chunk section
 */
export function getChunk3DYRange(chunkData: Uint8Array): { minY: number; maxY: number } {
  let minY = CHUNK_Y_SIZE
  let maxY = 0

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_Y_SIZE; y++) {
        const block = chunkData[getBlockIndex3D(x, y, z)]
        if (block !== BlockType.AIR) {
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
  }

  return { minY: Math.max(0, minY), maxY: Math.min(CHUNK_Y_SIZE - 1, maxY + 1) }
}
