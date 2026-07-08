import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'
import { BlockType } from '../types'

/**
 * 2D Chunk System - Traditional horizontal chunk system (16x128x16)
 * Column-based chunks spanning the full Y axis
 */

/**
 * Generate 2D chunk key (using only X, Z coordinates)
 */
export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

/**
 * Convert world coordinates to chunk coordinates
 */
export function worldToChunk(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  }
}

/**
 * Calculate block index within 2D chunk (16x128x16)
 */
export function getBlockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

/**
 * Get block at world coordinates
 */
export function getBlock(worldX: number, worldY: number, worldZ: number, chunks: Map<string, Uint8Array>): BlockType {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return BlockType.AIR

  const { cx, cz } = worldToChunk(worldX, worldZ)
  const key = getChunkKey(cx, cz)
  const chunkData = chunks.get(key)

  if (!chunkData) return BlockType.AIR

  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  return chunkData[getBlockIndex(localX, worldY, localZ)]
}

/**
 * Set block at world coordinates
 */
export function setBlock(worldX: number, worldY: number, worldZ: number, blockType: BlockType, chunks: Map<string, Uint8Array>): boolean {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return false

  const { cx, cz } = worldToChunk(worldX, worldZ)
  const key = getChunkKey(cx, cz)
  const chunkData = chunks.get(key)

  if (!chunkData) return false

  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  chunkData[getBlockIndex(localX, worldY, localZ)] = blockType

  return true
}

/**
 * Get all 2D chunks within radius (sorted by distance)
 */
export function getChunksInRadius(centerCx: number, centerCz: number, radius: number): Array<{ cx: number; cz: number; dist: number }> {
  const chunks: Array<{ cx: number; cz: number; dist: number }> = []

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist <= radius) {
        chunks.push({ cx: centerCx + dx, cz: centerCz + dz, dist })
      }
    }
  }

  return chunks.sort((a, b) => a.dist - b.dist)
}

/**
 * Calculate Y range of chunk (for optimization)
 * Returns min/max Y coordinates where actual blocks exist
 */
export function getChunkYRange(chunkData: Uint8Array): { minY: number; maxY: number } {
  let minY = CHUNK_HEIGHT
  let maxY = 0

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        const block = chunkData[getBlockIndex(x, y, z)]
        if (block !== BlockType.AIR) {
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
  }

  // Add 1 to maxY to include top face rendering
  return { minY: Math.max(0, minY), maxY: Math.min(CHUNK_HEIGHT - 1, maxY + 1) }
}
