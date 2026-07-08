/**
 * Mesh Worker Manager
 * Manages a pool of Web Workers for parallel mesh building
 */

import type { Scene } from 'three'
import type { ChunkMeshData } from '../types'
import { blockUVs } from '../utils/textures'
import { MeshGPUProcessor } from './mesh-gpu'
import { MeshIncrementalProcessor } from './mesh-incremental'
import type { MeshWorkerInput, MeshWorkerOutput } from './mesh-worker'

interface PendingTask {
  resolve: (meshData: ChunkMeshData) => void
  reject: (error: Error) => void
  cx: number
  cy?: number // For 3D chunks
  cz: number
  onChunkData?: (chunkData: Uint8Array) => void // Callback for generated chunk data
}

export class MeshWorkerManager {
  private workers: Worker[] = []
  private workerBusy: boolean[] = []
  private taskQueue: Array<{
    input: MeshWorkerInput
    resolve: (meshData: ChunkMeshData) => void
    reject: (error: Error) => void
    onChunkData?: (chunkData: Uint8Array) => void
  }> = []
  private pendingTasks: Map<number, PendingTask> = new Map()
  private nextTaskId = 0

  // Incremental mesh processor
  private incrementalProcessor: MeshIncrementalProcessor

  // GPU mesh processor (optional, for WebGPU-capable browsers)
  private gpuProcessor: MeshGPUProcessor

  private worldSeed: number = 12345

  constructor(scene: Scene, workerCount: number = navigator.hardwareConcurrency || 4, seed: number = 12345) {
    this.worldSeed = seed
    this.incrementalProcessor = new MeshIncrementalProcessor()
    this.gpuProcessor = new MeshGPUProcessor(scene)

    // Try to initialize GPU mesh generator
    this.gpuProcessor.initialize()

    // Create worker pool
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL('./mesh-worker.ts', import.meta.url), { type: 'module' })

      worker.onmessage = (e: MessageEvent<MeshWorkerOutput>) => {
        this.handleWorkerMessage(i, e.data)
      }

      worker.onerror = (error) => {
        console.error(`[MeshWorker ${i}] Error:`, error)
        this.workerBusy[i] = false
        this.processQueue()
      }

      // Send blockUVs and seed to worker for texture mapping and terrain generation
      worker.postMessage({ type: 'init', blockUVs, seed: this.worldSeed })

      this.workers.push(worker)
      this.workerBusy.push(false)
    }

    console.log(`[MeshWorkerManager] Initialized with ${workerCount} workers`)
  }

  /**
   * Check if GPU mesh generation is available
   */
  get useGPU(): boolean {
    return this.gpuProcessor.useGPU
  }

  private handleWorkerMessage(workerIndex: number, data: MeshWorkerOutput & { chunkData?: Uint8Array }): void {
    this.workerBusy[workerIndex] = false

    if (data.type === 'meshBuilt') {
      const pending = this.pendingTasks.get(data.taskId)
      if (pending) {
        this.pendingTasks.delete(data.taskId)

        // Skip if this chunk was cancelled (rebuilt synchronously)
        const cy = pending.cy ?? 0
        if (this.incrementalProcessor.isChunkCancelled(pending.cx, cy, pending.cz)) {
          // Resolve with empty mesh data to avoid hanging promises
          pending.resolve({})
        } else {
          // Queue for incremental processing instead of immediate creation
          this.incrementalProcessor.enqueue({
            data,
            resolve: pending.resolve,
            stage: 0,
            partialMesh: {},
          })
        }
      }
    }

    // Handle chunk generation + mesh building result
    if (data.type === 'chunkGenerated') {
      const pending = this.pendingTasks.get(data.taskId)
      if (pending) {
        this.pendingTasks.delete(data.taskId)

        // Call chunk data callback if provided - CRITICAL for collision detection
        if (pending.onChunkData && data.chunkData) {
          // Make a copy since the original buffer is transferred
          const chunkDataCopy = new Uint8Array(data.chunkData)
          pending.onChunkData(chunkDataCopy)
        }

        // Skip mesh processing if this chunk was cancelled
        const cy = pending.cy ?? 0
        if (this.incrementalProcessor.isChunkCancelled(pending.cx, cy, pending.cz)) {
          pending.resolve({})
        } else {
          // Queue for incremental mesh processing
          this.incrementalProcessor.enqueue({
            data: { ...data, type: 'meshBuilt' }, // Convert to meshBuilt for processing
            resolve: pending.resolve,
            stage: 0,
            partialMesh: {},
          })
        }
      }
    }

    // Process next task in queue
    this.processQueue()
  }

  /**
   * Process queued mesh data incrementally (call once per frame)
   * Returns true if there's more work to do
   */
  processIncrementalMeshes(): boolean {
    return this.incrementalProcessor.processIncrementalMeshes()
  }

  /**
   * Get current mesh build queue size (for debugging)
   */
  get meshQueueSize(): number {
    return this.incrementalProcessor.queueSize
  }

  /**
   * Cancel pending mesh builds for a specific chunk
   */
  cancelChunkMeshBuild(cx: number, cy: number, cz: number): void {
    this.incrementalProcessor.cancelChunkMeshBuild(cx, cy, cz)

    // Remove from task queue
    this.taskQueue = this.taskQueue.filter((task) => {
      if (task.input.type === 'buildMesh3D' && task.input.cx === cx && task.input.cy === cy && task.input.cz === cz) {
        return false
      }
      return true
    })
  }

  /**
   * Check if a chunk mesh build was cancelled
   */
  isChunkCancelled(cx: number, cy: number, cz: number): boolean {
    return this.incrementalProcessor.isChunkCancelled(cx, cy, cz)
  }

  /**
   * Clear cancelled status for a chunk (call after sync rebuild is done)
   */
  clearChunkCancelled(cx: number, cy: number, cz: number): void {
    this.incrementalProcessor.clearChunkCancelled(cx, cy, cz)
  }

  private processQueue(): void {
    // Find an available worker
    const availableWorkerIndex = this.workerBusy.findIndex((busy) => !busy)
    if (availableWorkerIndex === -1) return

    // Get next task from queue
    const task = this.taskQueue.shift()
    if (!task) return

    // Mark worker as busy and send task
    this.workerBusy[availableWorkerIndex] = true
    this.pendingTasks.set(task.input.taskId, {
      resolve: task.resolve,
      reject: task.reject,
      cx: task.input.cx,
      cy: task.input.cy,
      cz: task.input.cz,
      onChunkData: task.onChunkData,
    })

    // For generateAndMesh3D, no chunkData is sent
    const transferables: Transferable[] = task.input.chunkData ? [task.input.chunkData.buffer as ArrayBuffer] : []
    this.workers[availableWorkerIndex].postMessage(task.input, transferables)
  }

  /**
   * Build mesh for a chunk using Web Worker
   */
  buildChunkMeshAsync(cx: number, cz: number, chunkData: Uint8Array, chunks: Map<string, Uint8Array>): Promise<ChunkMeshData> {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++

      // Collect neighbor chunk data
      const neighborChunks: { [key: string]: Uint8Array } = {}
      const neighbors = [
        [cx - 1, cz],
        [cx + 1, cz],
        [cx, cz - 1],
        [cx, cz + 1],
      ]
      for (const [ncx, ncz] of neighbors) {
        const key = `${ncx},${ncz}`
        const neighborData = chunks.get(key)
        if (neighborData) {
          neighborChunks[key] = new Uint8Array(neighborData)
        }
      }

      const input: MeshWorkerInput = {
        type: 'buildMesh',
        cx,
        cz,
        chunkData: new Uint8Array(chunkData),
        neighborChunks,
        taskId,
      }

      this.taskQueue.push({ input, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Build mesh for a 3D chunk section using Web Worker
   */
  buildChunkMesh3DAsync(cx: number, cy: number, cz: number, chunkData: Uint8Array, chunks3D: Map<string, Uint8Array>): Promise<ChunkMeshData> {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++

      // Collect neighbor chunk data (6 neighbors for 3D)
      const neighborChunks: { [key: string]: Uint8Array } = {}
      const neighbors = [
        [cx - 1, cy, cz],
        [cx + 1, cy, cz],
        [cx, cy - 1, cz],
        [cx, cy + 1, cz],
        [cx, cy, cz - 1],
        [cx, cy, cz + 1],
      ]
      for (const [ncx, ncy, ncz] of neighbors) {
        const key = `${ncx},${ncy},${ncz}`
        const neighborData = chunks3D.get(key)
        if (neighborData) {
          neighborChunks[key] = new Uint8Array(neighborData)
        }
      }

      const input: MeshWorkerInput = {
        type: 'buildMesh3D',
        cx,
        cy,
        cz,
        chunkData: new Uint8Array(chunkData),
        neighborChunks,
        taskId,
      }

      this.taskQueue.push({ input, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Generate chunk data AND build mesh in worker (fully offloaded)
   */
  generateAndBuildChunk3DAsync(cx: number, cy: number, cz: number, chunks3D: Map<string, Uint8Array>, onChunkData: (chunkData: Uint8Array) => void): Promise<ChunkMeshData> {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++

      this.pendingTasks.set(taskId, { resolve, reject, cx, cy, cz, onChunkData })

      // Collect neighbor chunks for mesh building
      const neighborChunks: { [key: string]: Uint8Array } = {}
      const neighbors = [
        [cx - 1, cy, cz],
        [cx + 1, cy, cz],
        [cx, cy - 1, cz],
        [cx, cy + 1, cz],
        [cx, cy, cz - 1],
        [cx, cy, cz + 1],
      ]
      for (const [ncx, ncy, ncz] of neighbors) {
        const key = `${ncx},${ncy},${ncz}`
        const neighborData = chunks3D.get(key)
        if (neighborData) {
          neighborChunks[key] = new Uint8Array(neighborData)
        }
      }

      const input: MeshWorkerInput = {
        type: 'generateAndMesh3D',
        cx,
        cy,
        cz,
        neighborChunks,
        taskId,
      }

      this.taskQueue.push({ input, resolve, reject, onChunkData })
      this.processQueue()
    })
  }

  /**
   * Build mesh using GPU compute (if available)
   * Returns null if GPU is not available
   */
  async buildChunkMeshGPU(cx: number, cz: number, chunkData: Uint8Array, chunks: Map<string, Uint8Array>): Promise<ChunkMeshData | null> {
    return this.gpuProcessor.buildChunkMesh(cx, cz, chunkData, chunks)
  }

  // Property getters for status monitoring
  get pendingCount(): number {
    return this.taskQueue.length + this.pendingTasks.size
  }

  get hasAvailableWorker(): boolean {
    return this.workerBusy.some((busy) => !busy)
  }

  get workerCount(): number {
    return this.workers.length
  }

  get busyWorkerCount(): number {
    return this.workerBusy.filter((busy) => busy).length
  }

  get taskQueueSize(): number {
    return this.taskQueue.length
  }

  get processingCount(): number {
    return this.pendingTasks.size
  }

  /**
   * Terminate all workers and cleanup resources
   */
  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.workerBusy = []
    this.taskQueue = []
    this.pendingTasks.clear()
    this.incrementalProcessor.clear()
    this.gpuProcessor.destroy()

    console.log('[MeshWorkerManager] Disposed')
  }
}
