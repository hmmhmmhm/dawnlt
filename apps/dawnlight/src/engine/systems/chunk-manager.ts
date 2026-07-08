import type { Scene } from 'three'
import { CHUNK_SIZE } from '../../constants'
import { CHUNK_Y_SIZE } from '../../shared/constants'
import type { ChunkMeshData } from '../../types'
import type { ChunkLoadTask } from '../../types/game-state'
import type { MeshWorkerManager } from '../../workers/mesh-worker-manager'
import { buildChunkMesh3D, cleanupChunkMeshes, disposeMesh } from '../mesh'
import { type ChunkConnectivity, calculateChunkConnectivity, getChunkKey3D, getChunksInRadius3D } from '../world'

// Constants for chunk management
export const CHUNK_CACHE_SIZE = 512
export const MESH_CACHE_SIZE = 256
export const CHUNKS_PER_FRAME = 4
export const MAX_MESH_TIME_MS = 10

export interface ChunkManagerState {
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes3D: Map<string, ChunkMeshData>
  chunkDataCache: Map<string, Uint8Array>
  chunkCacheOrder: string[]
  meshCache: Map<string, ChunkMeshData>
  meshCacheOrder: string[]
  columnCache: Map<string, Uint8Array>
  chunkConnectivity: Map<string, ChunkConnectivity>
  chunkVersions: Map<string, number>
  rebuildingChunks: Set<string>
  chunkLoadQueue: ChunkLoadTask[]
}

export function createChunkManagerState(): ChunkManagerState {
  return {
    chunks: new Map(),
    chunks3D: new Map(),
    chunkMeshes3D: new Map(),
    chunkDataCache: new Map(),
    chunkCacheOrder: [],
    meshCache: new Map(),
    meshCacheOrder: [],
    columnCache: new Map(),
    chunkConnectivity: new Map(),
    chunkVersions: new Map(),
    rebuildingChunks: new Set(),
    chunkLoadQueue: [],
  }
}

export function rebuildSingleChunk3D(cx: number, cy: number, cz: number, state: ChunkManagerState, scene: Scene, meshWorkerManager: MeshWorkerManager | null): void {
  const key = getChunkKey3D(cx, cy, cz)

  // Skip if already rebuilding this chunk
  if (state.rebuildingChunks.has(key)) {
    return
  }

  const chunkData = state.chunks3D.get(key)
  if (!chunkData) {
    return
  }

  // Mark as rebuilding
  state.rebuildingChunks.add(key)

  // Increment version for this chunk
  const oldVersion = state.chunkVersions.get(key) ?? 0
  const newVersion = oldVersion + 1
  state.chunkVersions.set(key, newVersion)

  // Cancel any pending worker tasks for this chunk
  if (meshWorkerManager) {
    meshWorkerManager.cancelChunkMeshBuild(cx, cy, cz)
  }

  // Force cleanup of any stale meshes
  cleanupChunkMeshes(cx, cy, cz, scene)

  // Get old mesh reference
  const oldMeshData = state.chunkMeshes3D.get(key)

  // Update connectivity for this chunk
  const connectivity = calculateChunkConnectivity(chunkData)
  state.chunkConnectivity.set(key, connectivity)

  // Build mesh synchronously on main thread for immediate feedback
  const newMeshData = buildChunkMesh3D(cx, cy, cz, chunkData, state.chunks3D, scene)

  state.chunkMeshes3D.set(key, newMeshData)

  // Now dispose old mesh
  if (oldMeshData) {
    disposeMesh(oldMeshData, scene)
  }

  // Remove from rebuilding set
  state.rebuildingChunks.delete(key)
}

export function rebuildChunk3D(cx: number, cy: number, cz: number, state: ChunkManagerState, scene: Scene, meshWorkerManager: MeshWorkerManager | null, worldX?: number, worldY?: number, worldZ?: number): void {
  // Rebuild the main chunk
  rebuildSingleChunk3D(cx, cy, cz, state, scene, meshWorkerManager)

  // If world coordinates provided, check if we need to rebuild neighbors
  if (worldX !== undefined && worldY !== undefined && worldZ !== undefined) {
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
    const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

    // Check X boundaries
    if (localX === 0) rebuildSingleChunk3D(cx - 1, cy, cz, state, scene, meshWorkerManager)
    if (localX === CHUNK_SIZE - 1) rebuildSingleChunk3D(cx + 1, cy, cz, state, scene, meshWorkerManager)

    // Check Y boundaries
    if (localY === 0) rebuildSingleChunk3D(cx, cy - 1, cz, state, scene, meshWorkerManager)
    if (localY === CHUNK_Y_SIZE - 1) rebuildSingleChunk3D(cx, cy + 1, cz, state, scene, meshWorkerManager)

    // Check Z boundaries
    if (localZ === 0) rebuildSingleChunk3D(cx, cy, cz - 1, state, scene, meshWorkerManager)
    if (localZ === CHUNK_SIZE - 1) rebuildSingleChunk3D(cx, cy, cz + 1, state, scene, meshWorkerManager)
  }
}

export function unloadDistantChunks(state: ChunkManagerState, scene: Scene, playerX: number, playerY: number, playerZ: number, renderDistance: number, renderDistanceY: number, renderDistanceYDown: number): void {
  const currentChunkX = Math.floor(playerX / CHUNK_SIZE)
  const currentChunkY = Math.floor(playerY / CHUNK_Y_SIZE)
  const currentChunkZ = Math.floor(playerZ / CHUNK_SIZE)

  const neededChunks3D = getChunksInRadius3D(currentChunkX, currentChunkY, currentChunkZ, renderDistance, renderDistanceY, renderDistanceYDown)
  const neededKeys3D = new Set(neededChunks3D.map((c) => getChunkKey3D(c.cx, c.cy, c.cz)))

  // Unload distant 3D chunks
  const chunksToRemove3D: string[] = []
  state.chunkMeshes3D.forEach((_, key) => {
    if (!neededKeys3D.has(key)) {
      chunksToRemove3D.push(key)
    }
  })

  chunksToRemove3D.forEach((key) => {
    const meshData = state.chunkMeshes3D.get(key)
    if (meshData) {
      // Remove from scene but keep mesh data for cache
      if (meshData.solid) scene.remove(meshData.solid)
      if (meshData.transparent) scene.remove(meshData.transparent)
      if (meshData.foliage) scene.remove(meshData.foliage)
      if (meshData.fluid) scene.remove(meshData.fluid)

      // Cache mesh data (LRU)
      state.meshCache.set(key, meshData)
      const existingMeshIdx = state.meshCacheOrder.indexOf(key)
      if (existingMeshIdx !== -1) state.meshCacheOrder.splice(existingMeshIdx, 1)
      state.meshCacheOrder.push(key)

      // Evict oldest meshes if cache is full
      while (state.meshCacheOrder.length > MESH_CACHE_SIZE) {
        const oldestKey = state.meshCacheOrder.shift()!
        const oldMesh = state.meshCache.get(oldestKey)
        if (oldMesh) {
          if (oldMesh.solid) oldMesh.solid.geometry.dispose()
          if (oldMesh.transparent) oldMesh.transparent.geometry.dispose()
          if (oldMesh.foliage) oldMesh.foliage.geometry.dispose()
          if (oldMesh.fluid) oldMesh.fluid.geometry.dispose()
          state.meshCache.delete(oldestKey)
        }
      }

      state.chunkMeshes3D.delete(key)
    }

    // Cache 3D chunk data before removing (LRU eviction)
    const chunkData = state.chunks3D.get(key)
    if (chunkData) {
      state.chunkDataCache.set(key, chunkData)
      const existingIdx = state.chunkCacheOrder.indexOf(key)
      if (existingIdx !== -1) state.chunkCacheOrder.splice(existingIdx, 1)
      state.chunkCacheOrder.push(key)

      while (state.chunkCacheOrder.length > CHUNK_CACHE_SIZE) {
        const oldestKey = state.chunkCacheOrder.shift()!
        state.chunkDataCache.delete(oldestKey)
      }
    }

    state.chunks3D.delete(key)
  })
}

export function updateChunkLoadQueue(state: ChunkManagerState, playerX: number, playerY: number, playerZ: number, renderDistance: number, renderDistanceY: number, renderDistanceYDown: number): void {
  const currentChunkX = Math.floor(playerX / CHUNK_SIZE)
  const currentChunkY = Math.floor(playerY / CHUNK_Y_SIZE)
  const currentChunkZ = Math.floor(playerZ / CHUNK_SIZE)

  const neededChunks3D = getChunksInRadius3D(currentChunkX, currentChunkY, currentChunkZ, renderDistance, renderDistanceY, renderDistanceYDown)

  // Clear existing queue and rebuild with new priorities
  state.chunkLoadQueue.length = 0

  // Queue 3D chunks that need data generation or mesh building
  neededChunks3D.forEach(({ cx, cy, cz, dist }) => {
    const key = getChunkKey3D(cx, cy, cz)
    if (!state.chunkMeshes3D.has(key)) {
      // Check mesh cache first (fastest - just add to scene)
      if (state.meshCache.has(key)) {
        state.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'mesh-cache' })
      } else if (!state.chunks3D.has(key)) {
        // Check data cache
        if (state.chunkDataCache.has(key)) {
          state.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'cache' })
        } else {
          state.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'data' })
        }
      } else {
        state.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'mesh' })
      }
    }
  })

  // Sort by distance (closest first)
  state.chunkLoadQueue.sort((a, b) => a.dist - b.dist)
}
