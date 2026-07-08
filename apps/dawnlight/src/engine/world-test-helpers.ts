/**
 * Shared test helpers for world.test.ts
 * Contains MockWorld class and utility functions for chunk visibility testing
 */

import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE } from '../constants'
import { BlockType } from '../types'
import { type ChunkConnectivity, calculateChunkConnectivity, getBlockIndex3D, getChunkKey3D, getVisibleChunks3D } from './world'

// Type definitions
export type ChunkMap = Map<string, Uint8Array>
export type ConnectivityMap = Map<string, ChunkConnectivity>

/**
 * MockWorld - A test utility class for creating and managing mock chunk data
 */
export class MockWorld {
  chunks: ChunkMap = new Map()
  connectivity: ConnectivityMap = new Map()

  createChunk(cx: number, cy: number, cz: number, fill: BlockType = BlockType.AIR): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE).fill(fill)
    const key = getChunkKey3D(cx, cy, cz)
    this.chunks.set(key, data)
    return data
  }

  setBlock(cx: number, cy: number, cz: number, lx: number, ly: number, lz: number, type: BlockType) {
    const key = getChunkKey3D(cx, cy, cz)
    let data = this.chunks.get(key)
    if (!data) {
      data = this.createChunk(cx, cy, cz, BlockType.AIR)
    }
    const index = getBlockIndex3D(lx, ly, lz)
    data[index] = type
  }

  updateConnectivity() {
    this.connectivity.clear()
    for (const [key, data] of this.chunks) {
      this.connectivity.set(key, calculateChunkConnectivity(data))
    }
  }

  /**
   * Helper to create a hollow box (room)
   */
  createRoom(cx: number, cy: number, cz: number, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, wallType: BlockType = BlockType.STONE) {
    // Ensure chunk exists
    const key = getChunkKey3D(cx, cy, cz)
    if (!this.chunks.has(key)) this.createChunk(cx, cy, cz, BlockType.AIR)

    const data = this.chunks.get(key)!

    // Fill area with air (inside)
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const idx = getBlockIndex3D(x, y, z)
          data[idx] = BlockType.AIR
        }
      }
    }

    // Build walls
    // Min/Max X
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (minX > 0) data[getBlockIndex3D(minX - 1, y, z)] = wallType
        if (maxX < CHUNK_SIZE - 1) data[getBlockIndex3D(maxX + 1, y, z)] = wallType
      }
    }
    // Min/Max Y
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (minY > 0) data[getBlockIndex3D(x, minY - 1, z)] = wallType
        if (maxY < CHUNK_Y_SIZE - 1) data[getBlockIndex3D(x, maxY + 1, z)] = wallType
      }
    }
    // Min/Max Z
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (minZ > 0) data[getBlockIndex3D(x, y, minZ - 1)] = wallType
        if (maxZ < CHUNK_SIZE - 1) data[getBlockIndex3D(x, y, maxZ + 1)] = wallType
      }
    }
  }
}

/**
 * Simple opaque check matching world.ts logic
 */
export const isOpaque = (b: BlockType) => b !== BlockType.AIR && b !== BlockType.WATER && b !== BlockType.GLASS && b !== BlockType.LEAVES

/**
 * Reference Algorithm: Unrestricted Block-by-Block Flood Fill
 * Used as ground truth for comparison with the runtime culling algorithm
 */
export function getGroundTruthVisibleChunks(world: MockWorld, startCx: number, startCy: number, startCz: number, localX: number, localY: number, localZ: number, maxChunkDist: number): Set<string> {
  const visibleChunks = new Set<string>()
  const visitedBlocks = new Set<string>()

  // Check if start block is solid
  const startKey = getChunkKey3D(startCx, startCy, startCz)
  const startChunk = world.chunks.get(startKey)
  if (!startChunk) return visibleChunks

  // If start block is opaque, nothing is visible
  const startBlockIdx = getBlockIndex3D(localX, localY, localZ)
  if (isOpaque(startChunk[startBlockIdx])) return visibleChunks

  // Queue: [cx, cy, cz, lx, ly, lz]
  const queue: [number, number, number, number, number, number][] = [[startCx, startCy, startCz, localX, localY, localZ]]
  const blockKey = (cx: number, cy: number, cz: number, lx: number, ly: number, lz: number) => `${cx},${cy},${cz}:${lx},${ly},${lz}`

  visitedBlocks.add(blockKey(startCx, startCy, startCz, localX, localY, localZ))
  visibleChunks.add(startKey)

  while (queue.length > 0) {
    const [cx, cy, cz, lx, ly, lz] = queue.shift()!

    // Neighbors
    const neighbors = [
      [lx + 1, ly, lz],
      [lx - 1, ly, lz],
      [lx, ly + 1, lz],
      [lx, ly - 1, lz],
      [lx, ly, lz + 1],
      [lx, ly, lz - 1],
    ]

    for (const [nx, ny, nz] of neighbors) {
      let nCx = cx,
        nCy = cy,
        nCz = cz
      let nLx = nx,
        nLy = ny,
        nLz = nz

      // Handle chunk boundaries
      if (nLx < 0) {
        nCx--
        nLx = CHUNK_SIZE - 1
      } else if (nLx >= CHUNK_SIZE) {
        nCx++
        nLx = 0
      }

      if (nLy < 0) {
        nCy--
        nLy = CHUNK_Y_SIZE - 1
      } else if (nLy >= CHUNK_Y_SIZE) {
        nCy++
        nLy = 0
      }

      if (nLz < 0) {
        nCz--
        nLz = CHUNK_SIZE - 1
      } else if (nLz >= CHUNK_SIZE) {
        nCz++
        nLz = 0
      }

      // Distance Check (Chunk Manhattan or Euclidean? Runtime uses Euclidean)
      const dist = Math.sqrt((nCx - startCx) ** 2 + (nCy - startCy) ** 2 + (nCz - startCz) ** 2)
      if (dist > maxChunkDist + 1) continue // +1 buffer for partials

      // Validity Check
      if (nCy < 0 || nCy >= CHUNK_Y_COUNT) continue

      const nChunkKey = getChunkKey3D(nCx, nCy, nCz)
      const nChunk = world.chunks.get(nChunkKey)

      // If chunk doesn't exist in our mock world, treat as solid/void
      if (!nChunk) continue

      const nBlockIdx = getBlockIndex3D(nLx, nLy, nLz)
      const nBlock = nChunk[nBlockIdx]

      // Check opacity
      if (isOpaque(nBlock)) continue

      const key = blockKey(nCx, nCy, nCz, nLx, nLy, nLz)
      if (!visitedBlocks.has(key)) {
        visitedBlocks.add(key)
        visibleChunks.add(nChunkKey)

        // Only continue BFS if within distance
        if (dist <= maxChunkDist) {
          queue.push([nCx, nCy, nCz, nLx, nLy, nLz])
        }
      }
    }
  }

  return visibleChunks
}

/**
 * Helper to print efficiency metrics
 */
export function printEfficiency(scenario: string, runtimeSet: Set<string>, truthSet: Set<string>) {
  const intersection = new Set([...runtimeSet].filter((x) => truthSet.has(x)))
  const overdraw = runtimeSet.size - intersection.size
  const precision = intersection.size / runtimeSet.size
  const recall = intersection.size / truthSet.size

  console.log(`\n=== [${scenario}] Efficiency Metrics ===`)
  console.log(`Total Rendered (Runtime): ${runtimeSet.size}`)
  console.log(`Actually Visible (Truth): ${truthSet.size}`)
  console.log(`Overdraw (Wasted): ${overdraw}`)
  console.log(`Precision (Useful/Rendered): ${(precision * 100).toFixed(1)}%`)
  console.log(`Recall (Safety Check): ${(recall * 100).toFixed(1)}%`)
  console.log(`=========================================\n`)
}

// Re-export commonly used functions and constants for convenience
export { BlockType, CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE, getBlockIndex3D, getChunkKey3D, getVisibleChunks3D }
