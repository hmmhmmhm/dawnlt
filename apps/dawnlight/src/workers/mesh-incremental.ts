/**
 * Mesh Incremental Processing
 * Handles incremental mesh building and chunk cancellation management
 */

import { Box3, Vector3 } from 'three'
import { CHUNK_SIZE } from '../constants'
import type { ChunkMeshData } from '../types'
import { createFluidMesh, createFoliageMesh, createSolidMesh, createTransparentMesh } from './mesh-creator'
import type { MeshWorkerOutput } from './mesh-worker'

/**
 * Queued mesh data waiting for incremental processing
 */
export interface QueuedMeshData {
  data: MeshWorkerOutput
  resolve: (meshData: ChunkMeshData) => void
  stage: number // 0=solid, 1=transparent, 2=foliage, 3=fluid, 4=done
  partialMesh: ChunkMeshData
}

/**
 * Configuration for incremental mesh processing
 */
export interface IncrementalConfig {
  maxMeshBuildTimeMs: number
  maxChunksPerFrame: number
}

const DEFAULT_CONFIG: IncrementalConfig = {
  maxMeshBuildTimeMs: 6, // Max time per frame for mesh building
  maxChunksPerFrame: 2, // Max chunks to process per frame
}

/**
 * Manages incremental mesh building and chunk cancellation
 */
export class MeshIncrementalProcessor {
  private meshBuildQueue: QueuedMeshData[] = []
  private cancelledChunks: Set<string> = new Set()
  private config: IncrementalConfig

  constructor(config: Partial<IncrementalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add mesh data to the processing queue
   */
  enqueue(queuedData: QueuedMeshData): void {
    this.meshBuildQueue.push(queuedData)
  }

  /**
   * Get current mesh build queue size
   */
  get queueSize(): number {
    return this.meshBuildQueue.length
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.meshBuildQueue.length === 0
  }

  /**
   * Process queued mesh data incrementally (call once per frame)
   * Uses time-based budgeting to prevent frame drops
   * Returns true if there's more work to do
   */
  processIncrementalMeshes(): boolean {
    if (this.meshBuildQueue.length === 0) return false

    const startTime = performance.now()
    let chunksProcessed = 0

    while (this.meshBuildQueue.length > 0 && chunksProcessed < this.config.maxChunksPerFrame) {
      // Time budget check - stop if we've used our time
      const elapsed = performance.now() - startTime
      if (elapsed > this.config.maxMeshBuildTimeMs) break

      const queued = this.meshBuildQueue[0]
      const data = queued.data

      // Check if this chunk was cancelled (rebuilt synchronously)
      // Use cy from data if available, otherwise default to 0 for 2D chunks
      const cy = data.cy ?? 0
      const chunkKey = `${data.cx},${cy},${data.cz}`
      if (this.cancelledChunks.has(chunkKey)) {
        // Skip this chunk - resolve with empty mesh
        queued.resolve({})
        this.meshBuildQueue.shift()
        chunksProcessed++
        continue
      }

      // Pre-calculate bounding box (shared across all mesh types)
      const chunkWorldX = data.cx * CHUNK_SIZE
      const chunkWorldZ = data.cz * CHUNK_SIZE
      const boundingBox = new Box3(new Vector3(chunkWorldX, data.minY, chunkWorldZ), new Vector3(chunkWorldX + CHUNK_SIZE, data.maxY + 1, chunkWorldZ + CHUNK_SIZE))

      // Process ALL mesh types for this chunk at once (faster than spreading across frames)
      // This is more efficient because bounding box is already calculated
      if (queued.stage === 0) {
        const chunkCy = data.cy ?? 0
        if (data.solid) {
          queued.partialMesh.solid = createSolidMesh(data.solid, boundingBox)
          queued.partialMesh.solid.userData = {
            isChunkMesh: true,
            cx: data.cx,
            cy: chunkCy,
            cz: data.cz,
            type: 'solid',
          }
        }
        if (data.transparent) {
          queued.partialMesh.transparent = createTransparentMesh(data.transparent, boundingBox)
          queued.partialMesh.transparent.userData = {
            isChunkMesh: true,
            cx: data.cx,
            cy: chunkCy,
            cz: data.cz,
            type: 'transparent',
          }
        }
        if (data.foliage) {
          queued.partialMesh.foliage = createFoliageMesh(data.foliage, boundingBox)
          queued.partialMesh.foliage.userData = {
            isChunkMesh: true,
            cx: data.cx,
            cy: chunkCy,
            cz: data.cz,
            type: 'foliage',
          }
        }
        if (data.fluid) {
          queued.partialMesh.fluid = createFluidMesh(data.fluid, boundingBox)
          queued.partialMesh.fluid.userData = {
            isChunkMesh: true,
            cx: data.cx,
            cy: chunkCy,
            cz: data.cz,
            type: 'fluid',
          }
        }
        queued.stage = 4
      }

      // Resolve and remove from queue
      if (queued.stage === 4) {
        queued.resolve(queued.partialMesh)
        this.meshBuildQueue.shift()
        chunksProcessed++
      }
    }

    return this.meshBuildQueue.length > 0
  }

  /**
   * Cancel pending mesh builds for a specific chunk
   * Call this before rebuilding a chunk synchronously
   */
  cancelChunkMeshBuild(cx: number, cy: number, cz: number): void {
    const key = `${cx},${cy},${cz}`
    this.cancelledChunks.add(key)

    // Limit cancelled chunks set size to prevent memory leak
    if (this.cancelledChunks.size > 500) {
      // Remove oldest entries (first 100)
      const entries = Array.from(this.cancelledChunks)
      for (let i = 0; i < 100; i++) {
        this.cancelledChunks.delete(entries[i])
      }
    }

    // Remove from mesh build queue
    this.meshBuildQueue = this.meshBuildQueue.filter((queued) => {
      if (queued.data.cx === cx && queued.data.cy === cy && queued.data.cz === cz) {
        return false
      }
      return true
    })
  }

  /**
   * Check if a chunk mesh build was cancelled
   */
  isChunkCancelled(cx: number, cy: number, cz: number): boolean {
    const key = `${cx},${cy},${cz}`
    return this.cancelledChunks.has(key)
  }

  /**
   * Clear cancelled status for a chunk (call after sync rebuild is done)
   */
  clearChunkCancelled(cx: number, cy: number, cz: number): void {
    const key = `${cx},${cy},${cz}`
    this.cancelledChunks.delete(key)
  }

  /**
   * Filter task queue to remove cancelled chunks
   */
  filterTaskQueue<T extends { input: { type: string; cx: number; cy?: number; cz: number } }>(taskQueue: T[]): T[] {
    return taskQueue.filter((task) => {
      if (task.input.type === 'buildMesh3D' && this.isChunkCancelled(task.input.cx, task.input.cy ?? 0, task.input.cz)) {
        return false
      }
      return true
    })
  }

  /**
   * Clear all queues and cancelled chunks
   */
  clear(): void {
    this.meshBuildQueue = []
    this.cancelledChunks.clear()
  }
}
