import { type PerspectiveCamera, Vector3 } from 'three'
import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_SIZE, RENDER_DISTANCE_Y, RENDER_DISTANCE_Y_DOWN } from '../../constants'
import { attachFoliageWindController } from '../../engine/materials'
import { getChunkKey, getChunkKey3D, getChunksInRadius3D, isChunk3DEmpty, isChunk3DOccluded } from '../../engine/world'
import { BlockType, type ChunkMeshData } from '../../types'
import { loadInitialChunks } from './chunk-loader'
import { CHUNK_CACHE_SIZE, CHUNKS_PER_FRAME, MAX_MESH_TIME_MS, MESH_CACHE_SIZE } from './chunk-system-config'
import { applyChunkVisibility } from './chunk-system-visibility'
import type { GameEngine } from './game-engine'
import type { ChunkLoadingCallbacks } from './types'

export type { ChunkLoadingCallbacks }

export class ChunkSystem {
  private engine: GameEngine
  private callbacks: ChunkLoadingCallbacks
  private tempClipPos = new Vector3()

  constructor(engine: GameEngine, callbacks: ChunkLoadingCallbacks = {}) {
    this.engine = engine
    this.callbacks = callbacks
  }

  generateChunk3DSync(chunkX: number, chunkY: number, chunkZ: number): Uint8Array {
    const columnKey = getChunkKey(chunkX, chunkZ)
    let fullColumn = this.engine.columnCache.get(columnKey)
    if (!fullColumn) {
      fullColumn = this.engine.worldGen.generateChunk(chunkX, chunkZ)
      this.engine.columnCache.set(columnKey, fullColumn)
      this.engine.chunks.set(columnKey, fullColumn)
    }
    const sectionData = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    const startY = chunkY * CHUNK_Y_SIZE
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
          const worldY = startY + localY
          const sectionIndex = x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
          sectionData[sectionIndex] = worldY >= CHUNK_HEIGHT ? BlockType.AIR : fullColumn[x + worldY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT]
        }
      }
    }
    return sectionData
  }

  async loadInitialChunks(): Promise<void> {
    return loadInitialChunks({
      engine: this.engine,
      callbacks: this.callbacks,
      generateChunk3DSync: this.generateChunk3DSync.bind(this),
      disposeMeshData: this.disposeMeshData.bind(this),
    })
  }

  private disposeMeshData(meshData: ChunkMeshData): void {
    if (meshData.solid) meshData.solid.geometry.dispose()
    if (meshData.transparent) meshData.transparent.geometry.dispose()
    if (meshData.foliage) meshData.foliage.geometry.dispose()
    if (meshData.fluid) meshData.fluid.geometry.dispose()
  }

  private setChunkDataWithLodInvalidate(key: string, data: Uint8Array, cx: number, cz: number): void {
    this.engine.chunks3D.set(key, data)
    this.engine.lodRuntime.invalidateChunk(cx, cz)
  }

  updateChunks(deltaTime: number): void {
    const { player, chunks3D, chunkMeshes3D, chunkDataCache, chunkCacheOrder, meshCache, meshCacheOrder, scene } = this.engine

    this.engine.chunkUpdateTimer += deltaTime
    if (this.engine.chunkUpdateTimer < 0.1) return
    this.engine.chunkUpdateTimer = 0

    const currentChunkX = Math.floor(player.position.x / CHUNK_SIZE)
    const currentChunkY = Math.floor(player.position.y / CHUNK_Y_SIZE)
    const currentChunkZ = Math.floor(player.position.z / CHUNK_SIZE)

    // Only recalculate if player moved to a different chunk
    if (currentChunkX === this.engine.lastChunkX && currentChunkZ === this.engine.lastChunkZ && currentChunkY === this.engine.lastChunkY) {
      return
    }

    this.engine.lastChunkX = currentChunkX
    this.engine.lastChunkZ = currentChunkZ
    this.engine.lastChunkY = currentChunkY

    // Get needed chunks
    const neededChunks3D = getChunksInRadius3D(currentChunkX, currentChunkY, currentChunkZ, this.engine.renderDistance, RENDER_DISTANCE_Y, RENDER_DISTANCE_Y_DOWN)
    const neededKeys3D = new Set(neededChunks3D.map((c) => getChunkKey3D(c.cx, c.cy, c.cz)))

    // Unload distant chunks
    const chunksToRemove: string[] = []
    chunkMeshes3D.forEach((_, key) => {
      if (!neededKeys3D.has(key)) {
        chunksToRemove.push(key)
      }
    })

    chunksToRemove.forEach((key) => {
      const meshData = chunkMeshes3D.get(key)
      if (meshData) {
        // Remove from scene
        if (meshData.solid) scene.remove(meshData.solid)
        if (meshData.transparent) scene.remove(meshData.transparent)
        if (meshData.foliage) scene.remove(meshData.foliage)
        if (meshData.fluid) scene.remove(meshData.fluid)

        // Cache mesh data
        meshCache.set(key, meshData)
        const existingMeshIdx = meshCacheOrder.indexOf(key)
        if (existingMeshIdx !== -1) meshCacheOrder.splice(existingMeshIdx, 1)
        meshCacheOrder.push(key)

        // Evict oldest meshes if cache is full
        while (meshCacheOrder.length > MESH_CACHE_SIZE) {
          const oldestKey = meshCacheOrder.shift()!
          const oldMesh = meshCache.get(oldestKey)
          if (oldMesh) {
            this.disposeMeshData(oldMesh)
            meshCache.delete(oldestKey)
          }
        }

        chunkMeshes3D.delete(key)
      }

      // Cache chunk data
      const chunkData = chunks3D.get(key)
      if (chunkData) {
        chunkDataCache.set(key, chunkData)
        const existingIdx = chunkCacheOrder.indexOf(key)
        if (existingIdx !== -1) chunkCacheOrder.splice(existingIdx, 1)
        chunkCacheOrder.push(key)

        while (chunkCacheOrder.length > CHUNK_CACHE_SIZE) {
          const oldestKey = chunkCacheOrder.shift()!
          chunkDataCache.delete(oldestKey)
        }
      }

      chunks3D.delete(key)
    })

    // Clear and rebuild load queue
    this.engine.chunkLoadQueue.length = 0

    neededChunks3D.forEach(({ cx, cy, cz, dist }) => {
      const key = getChunkKey3D(cx, cy, cz)
      if (!chunkMeshes3D.has(key)) {
        if (meshCache.has(key)) {
          this.engine.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'mesh-cache' })
        } else if (!chunks3D.has(key)) {
          if (chunkDataCache.has(key)) {
            this.engine.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'cache' })
          } else {
            this.engine.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'data' })
          }
        } else {
          this.engine.chunkLoadQueue.push({ cx, cy, cz, dist, priority: 'mesh' })
        }
      }
    })

    // Sort by distance
    this.engine.chunkLoadQueue.sort((a, b) => a.dist - b.dist)
  }

  /**
   * Process chunk loading queue
   */
  processLoadQueue(): void {
    const { player, camera, scene, chunks3D, chunkMeshes3D, chunkDataCache, meshCache, meshCacheOrder, meshWorkerManager, chunkVersions } = this.engine

    const meshStartTime = performance.now()
    let chunksProcessed = 0

    while (this.engine.chunkLoadQueue.length > 0 && chunksProcessed < CHUNKS_PER_FRAME) {
      const elapsed = performance.now() - meshStartTime
      if (elapsed > MAX_MESH_TIME_MS && chunksProcessed > 0) break

      const task = this.engine.chunkLoadQueue.shift()!
      const key = getChunkKey3D(task.cx, task.cy, task.cz)

      if (task.priority === 'mesh-cache') {
        // Restore from mesh cache
        const cachedMesh = meshCache.get(key)
        if (cachedMesh && !chunkMeshes3D.has(key)) {
          meshCache.delete(key)
          const idx = meshCacheOrder.indexOf(key)
          if (idx !== -1) meshCacheOrder.splice(idx, 1)

          // CRITICAL: Also restore chunk data for collision detection!
          // Without this, mesh is visible but player falls through
          const cachedData = chunkDataCache.get(key)
          if (cachedData && !chunks3D.has(key)) {
            this.setChunkDataWithLodInvalidate(key, cachedData, task.cx, task.cz)
          } else if (!chunks3D.has(key)) {
            // Data cache was evicted - regenerate synchronously
            // This ensures collision detection works immediately
            const newData = this.generateChunk3DSync(task.cx, task.cy, task.cz)
            this.setChunkDataWithLodInvalidate(key, newData, task.cx, task.cz)
          }

          if (cachedMesh.solid) scene.add(cachedMesh.solid)
          if (cachedMesh.transparent) scene.add(cachedMesh.transparent)
          if (cachedMesh.foliage) scene.add(cachedMesh.foliage)
          if (cachedMesh.fluid) scene.add(cachedMesh.fluid)
          chunkMeshes3D.set(key, cachedMesh)

          // CRITICAL: Reset visibility - mesh may have been cached with visible=false
          // when player was looking away. Must set visible=true on restore.
          if (cachedMesh.solid) cachedMesh.solid.visible = true
          if (cachedMesh.transparent) cachedMesh.transparent.visible = true
          if (cachedMesh.foliage) {
            attachFoliageWindController(cachedMesh.foliage)
            cachedMesh.foliage.visible = true
          }
          if (cachedMesh.fluid) cachedMesh.fluid.visible = true
        }
        chunksProcessed++
      } else if (task.priority === 'cache') {
        // Restore from data cache
        const cachedData = chunkDataCache.get(key)
        if (cachedData && !chunks3D.has(key)) {
          this.setChunkDataWithLodInvalidate(key, cachedData, task.cx, task.cz)
          this.engine.chunkLoadQueue.push({ ...task, priority: 'mesh' })
        }
        chunksProcessed++
      } else if (task.priority === 'data') {
        // Generate new chunk data
        if (!chunks3D.has(key) && meshWorkerManager) {
          const versionAtRequest = chunkVersions.get(key) ?? 0

          meshWorkerManager
            .generateAndBuildChunk3DAsync(task.cx, task.cy, task.cz, chunks3D, (chunkData) => {
              if (!chunks3D.has(key)) {
                this.setChunkDataWithLodInvalidate(key, chunkData, task.cx, task.cz)
              }
            })
            .then((meshData) => {
              // Validate before adding
              const currentCx = Math.floor(player.position.x / CHUNK_SIZE)
              const currentCz = Math.floor(player.position.z / CHUNK_SIZE)
              const currentDistSq = (task.cx - currentCx) ** 2 + (task.cz - currentCz) ** 2

              if (currentDistSq > (this.engine.renderDistance + 3) ** 2) {
                this.disposeMeshData(meshData)
                return
              }

              const isEmpty = !meshData.solid && !meshData.transparent && !meshData.foliage && !meshData.fluid
              const currentVersion = chunkVersions.get(key) ?? 0

              if (currentVersion !== versionAtRequest || chunkMeshes3D.has(key)) {
                if (!isEmpty) this.disposeMeshData(meshData)
                return
              }

              if (isEmpty) {
                chunkMeshes3D.set(key, {})
              } else {
                if (meshData.solid) scene.add(meshData.solid)
                if (meshData.transparent) scene.add(meshData.transparent)
                if (meshData.foliage) scene.add(meshData.foliage)
                if (meshData.fluid) scene.add(meshData.fluid)
                chunkMeshes3D.set(key, meshData)
              }
            })
            .catch((err) => {
              console.error(`Worker error for chunk ${key}:`, err)
            })

          chunksProcessed++
        }
      } else if (task.priority === 'mesh') {
        // Build mesh for existing data
        const chunkData = chunks3D.get(key)
        if (chunkData && !chunkMeshes3D.has(key)) {
          if (isChunk3DEmpty(chunkData)) {
            chunkMeshes3D.set(key, {})
            continue
          }

          if (isChunk3DOccluded(task.cx, task.cy, task.cz, chunks3D)) {
            chunkMeshes3D.set(key, {})
            continue
          }

          if (meshWorkerManager) {
            const versionAtRequest = chunkVersions.get(key) ?? 0

            meshWorkerManager
              .buildChunkMesh3DAsync(task.cx, task.cy, task.cz, chunkData, chunks3D)
              .then((meshData) => {
                const currentCx = Math.floor(player.position.x / CHUNK_SIZE)
                const currentCz = Math.floor(player.position.z / CHUNK_SIZE)
                const currentDistSq = (task.cx - currentCx) ** 2 + (task.cz - currentCz) ** 2

                if (currentDistSq > (this.engine.renderDistance + 3) ** 2) {
                  this.disposeMeshData(meshData)
                  return
                }

                const isEmpty = !meshData.solid && !meshData.transparent && !meshData.foliage && !meshData.fluid
                if (isEmpty) {
                  // Register empty mesh to prevent infinite rebuild loop
                  chunkMeshes3D.set(key, {})
                  return
                }

                const currentVersion = chunkVersions.get(key) ?? 0
                if (currentVersion !== versionAtRequest || chunkMeshes3D.has(key)) {
                  this.disposeMeshData(meshData)
                  return
                }

                if (meshData.solid) scene.add(meshData.solid)
                if (meshData.transparent) scene.add(meshData.transparent)
                if (meshData.foliage) scene.add(meshData.foliage)
                if (meshData.fluid) scene.add(meshData.fluid)
                chunkMeshes3D.set(key, meshData)

                // Set initial visibility
                this.updateChunkVisibility(meshData, task.cx, task.cy, task.cz, camera)
              })
              .catch((err) => console.warn('[MeshWorker] Build failed:', err))

            chunksProcessed++
          }
        }
      }
    }
  }

  /**
   * Update chunk visibility
   */
  updateChunkVisibility(meshData: ChunkMeshData, cx: number, cy: number, cz: number, camera: PerspectiveCamera): void {
    this.applyChunkVisibility(meshData, cx, cy, cz, camera)
  }

  private applyChunkVisibility(meshData: ChunkMeshData, cx: number, cy: number, cz: number, camera: PerspectiveCamera): void {
    applyChunkVisibility(this.engine, this.tempClipPos, meshData, cx, cy, cz, camera)
  }

  /**
   * Update visibility of all chunks
   */
  updateAllChunksVisibility(camera: PerspectiveCamera): void {
    const { chunkMeshes3D } = this.engine
    camera.updateMatrixWorld()

    chunkMeshes3D.forEach((meshData, key) => {
      if (!meshData.solid && !meshData.transparent && !meshData.foliage && !meshData.fluid) return

      // Parse chunk coordinates from key
      const [cxStr, cyStr, czStr] = key.split(',')
      const cx = parseInt(cxStr, 10)
      const cy = parseInt(cyStr, 10)
      const cz = parseInt(czStr, 10)

      this.applyChunkVisibility(meshData, cx, cy, cz, camera)
    })
  }
}

export default ChunkSystem
