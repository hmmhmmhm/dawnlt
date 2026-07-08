/**
 * Web Worker for offloading mesh geometry calculations
 * This worker handles the heavy computation of vertices, normals, UVs, and indices
 * The main thread only needs to create BufferGeometry from the results
 */

import { WorldGenerator } from '../../shared/world-generator'
import { buildMeshData } from './builder-2d'
import { buildMeshData3D } from './builder-3d'
import type { MeshWorkerInput, MeshWorkerOutput } from './types'
import { setBlockUVs } from './utils'

// Re-export types for external use
export type { MeshWorkerInput, MeshWorkerOutput } from './types'

// Global world generator instance (initialized with seed from main thread)
let workerWorldGen: WorldGenerator | null = null

/**
 * Collect transferable buffers from mesh result
 */
function collectTransferables(result: Omit<MeshWorkerOutput, 'type' | 'taskId' | 'cy'>): Transferable[] {
  const transferables: Transferable[] = []

  if (result.solid) {
    transferables.push(result.solid.vertices.buffer as ArrayBuffer, result.solid.normals.buffer as ArrayBuffer, result.solid.uvs.buffer as ArrayBuffer, result.solid.colors.buffer as ArrayBuffer, result.solid.indices.buffer as ArrayBuffer)
  }
  if (result.transparent) {
    transferables.push(result.transparent.vertices.buffer as ArrayBuffer, result.transparent.normals.buffer as ArrayBuffer, result.transparent.uvs.buffer as ArrayBuffer, result.transparent.colors.buffer as ArrayBuffer, result.transparent.indices.buffer as ArrayBuffer)
  }
  if (result.foliage) {
    transferables.push(result.foliage.vertices.buffer as ArrayBuffer, result.foliage.normals.buffer as ArrayBuffer, result.foliage.uvs.buffer as ArrayBuffer, result.foliage.colors.buffer as ArrayBuffer, result.foliage.indices.buffer as ArrayBuffer, result.foliage.windWeights.buffer as ArrayBuffer)
  }
  if (result.fluid) {
    transferables.push(result.fluid.vertices.buffer as ArrayBuffer, result.fluid.normals.buffer as ArrayBuffer, result.fluid.uvs.buffer as ArrayBuffer, result.fluid.colors.buffer as ArrayBuffer, result.fluid.indices.buffer as ArrayBuffer)
  }

  return transferables
}

// Worker message handler
self.onmessage = (e: MessageEvent<MeshWorkerInput | { type: 'init'; blockUVs: Record<string, number[]>; seed?: number }>) => {
  const { type } = e.data

  // Handle initialization message with blockUVs and seed
  if (type === 'init') {
    const initData = e.data as { type: 'init'; blockUVs: Record<string, number[]>; seed?: number }
    setBlockUVs(initData.blockUVs)
    if (initData.seed !== undefined) {
      workerWorldGen = new WorldGenerator(initData.seed)
      console.log('[MeshWorker] Initialized with seed', initData.seed, 'and', Object.keys(initData.blockUVs).length, 'UV mappings')
    } else {
      console.log('[MeshWorker] Initialized with', Object.keys(initData.blockUVs).length, 'UV mappings (no seed)')
    }
    return
  }

  if (type === 'buildMesh') {
    const { cx, cz, chunkData, neighborChunks, taskId } = e.data as MeshWorkerInput
    const result = buildMeshData(cx, cz, chunkData!, neighborChunks)
    const transferables = collectTransferables(result)

    const output: MeshWorkerOutput = {
      type: 'meshBuilt',
      taskId,
      ...result,
    }

    ;(self as unknown as Worker).postMessage(output, transferables)
  }

  // 3D chunk mesh building
  if (type === 'buildMesh3D') {
    const { cx, cy, cz, chunkData, neighborChunks, taskId } = e.data as MeshWorkerInput
    const result = buildMeshData3D(cx, cy!, cz, chunkData!, neighborChunks)
    const transferables = collectTransferables(result)

    const output: MeshWorkerOutput = {
      type: 'meshBuilt',
      taskId,
      cy,
      ...result,
    }

    ;(self as unknown as Worker).postMessage(output, transferables)
  }

  // Generate chunk AND build mesh in one go (fully offloaded)
  if (type === 'generateAndMesh3D') {
    const { cx, cy, cz, neighborChunks, taskId } = e.data as MeshWorkerInput

    if (!workerWorldGen) {
      console.error('[MeshWorker] WorldGenerator not initialized!')
      return
    }

    // Generate chunk data in worker
    const chunkData = workerWorldGen.generateChunk3D(cx, cy!, cz)

    // Build mesh
    const result = buildMeshData3D(cx, cy!, cz, chunkData, neighborChunks)

    // Collect transferable buffers
    const transferables: Transferable[] = [chunkData.buffer as ArrayBuffer]
    transferables.push(...collectTransferables(result))

    const output = {
      ...result,
      type: 'chunkGenerated' as const,
      taskId,
      cy,
      chunkData, // Include generated chunk data
    }

    ;(self as unknown as Worker).postMessage(output, transferables)
  }
}
