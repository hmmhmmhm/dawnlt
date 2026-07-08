/**
 * Utility functions for mesh worker
 */

import { BlockType } from '../../shared/block-types'
import { isBlockTransparent as sharedIsBlockTransparent } from '../../shared/block-utils'
import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_SIZE } from '../../shared/constants'

// Block UVs received from main thread (dynamic texture atlas mapping)
let blockUVs: Record<string, number[]> = {}

export function setBlockUVs(uvs: Record<string, number[]>): void {
  blockUVs = uvs
}

export function getBlockUVs(): Record<string, number[]> {
  return blockUVs
}

export function getTextureUV(block: number, faceType: 'top' | 'side' | 'bottom'): [number, number, number, number] {
  const key = `${block}:${faceType}`
  const uv = blockUVs[key]
  if (uv) {
    return [uv[0], uv[1], uv[2], uv[3]]
  }
  // Fallback to dirt if not found
  const fallback = blockUVs[`${BlockType.DIRT}:side`]
  if (fallback) {
    return [fallback[0], fallback[1], fallback[2], fallback[3]]
  }
  // Ultimate fallback
  return [0, 0, 0.0625, 0.0625]
}

// Use shared isBlockTransparent (adapted for number type)
export function isBlockTransparent(block: number): boolean {
  return sharedIsBlockTransparent(block as BlockType)
}

export function getBlockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

// 3D chunk block index (16x32x16)
export function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

export function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

// Get block from 3D chunk system
export function getBlock3D(worldX: number, worldY: number, worldZ: number, chunks3D: Map<string, Uint8Array>, defaultIfMissing: number = BlockType.AIR): number {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return BlockType.AIR

  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  const chunk = chunks3D.get(getChunkKey3D(cx, cy, cz))
  if (!chunk) return defaultIfMissing

  return chunk[getBlockIndex3D(localX, localY, localZ)]
}

export function getBlock(worldX: number, worldY: number, worldZ: number, chunks: Map<string, Uint8Array>): number {
  if (worldY < 0 || worldY >= CHUNK_HEIGHT) return BlockType.AIR

  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  const chunk = chunks.get(getChunkKey(cx, cz))
  if (!chunk) return BlockType.AIR

  return chunk[getBlockIndex(localX, worldY, localZ)]
}

export function getChunkYRange(chunkData: Uint8Array): { minY: number; maxY: number } {
  let minY = CHUNK_HEIGHT
  let maxY = 0

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        if (chunkData[getBlockIndex(x, y, z)] !== BlockType.AIR) {
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
  }

  return { minY: Math.max(0, minY), maxY: Math.min(CHUNK_HEIGHT - 1, maxY) }
}

/**
 * Create a seeded random function for consistent placement
 */
export function createSeededRandom(worldX: number, worldZ: number) {
  const seed = (worldX * 73856093) ^ (worldZ * 19349663)
  return (n: number) => {
    const s = Math.sin(seed + n * 12.9898) * 43758.5453
    return s - Math.floor(s)
  }
}

export function createSeededRandom3D(worldX: number, worldY: number, worldZ: number) {
  const seed = worldX * 73856093 + worldY * 19349663 + worldZ * 83492791
  return (offset: number) => {
    const n = Math.sin(seed + offset) * 43758.5453123
    return n - Math.floor(n)
  }
}
