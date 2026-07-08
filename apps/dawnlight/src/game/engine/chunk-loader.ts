/**
 * ChunkLoader - Utility for initial chunk loading
 */
import { Vector3 } from 'three'
import { CHUNK_HEIGHT, CRITICAL_RENDER_DISTANCE, CRITICAL_RENDER_DISTANCE_Y, INITIAL_RENDER_DISTANCE, INITIAL_RENDER_DISTANCE_Y, SPAWN_X, SPAWN_Z } from '../../constants'
import { buildChunkMesh3D } from '../../engine/mesh'
import { calculateChunkConnectivity, getBlock3D, getChunkKey3D, getChunksInRadius3D, isChunk3DEmpty, worldToChunk3D } from '../../engine/world'
import { BlockType, type ChunkMeshData } from '../../types'
import type { MeshWorkerManager } from '../../workers/mesh-worker-manager'
import type { GameEngine } from './game-engine'
import type { ChunkLoadingCallbacks } from './types'

// Fixed shadow direction at 8 AM (same as create-lighting.ts and day-night.ts)
const FIXED_SHADOW_HOUR = 8
const FIXED_SHADOW_TIME_NORM = FIXED_SHADOW_HOUR / 24
const FIXED_SUN_ANGLE = (FIXED_SHADOW_TIME_NORM - 0.25) * Math.PI * 2
const FIXED_SHADOW_X = Math.cos(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Y = Math.sin(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Z = Math.cos(FIXED_SUN_ANGLE) * 0.2

// Shadow camera grid snap size (same as day-night.ts)
const SHADOW_GRID_SIZE = 1

/**
 * Update directional light position to match camera position for proper shadow rendering
 */
function updateLightPositionForShadow(engine: GameEngine): void {
  const lightDir = new Vector3(FIXED_SHADOW_X, FIXED_SHADOW_Y, FIXED_SHADOW_Z)
  // Snap to grid for stable shadows
  const snappedX = Math.floor(engine.camera.position.x / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedY = Math.floor(engine.camera.position.y / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedZ = Math.floor(engine.camera.position.z / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedPosition = new Vector3(snappedX, snappedY, snappedZ)
  engine.directionalLight.position.copy(lightDir).normalize().multiplyScalar(200).add(snappedPosition)
  engine.directionalLight.target.position.copy(snappedPosition)
  engine.directionalLight.target.updateMatrixWorld()
}

async function prewarmVisibleScene(engine: GameEngine): Promise<void> {
  const { renderer, scene, camera } = engine
  try {
    if ('compileAsync' in renderer && typeof renderer.compileAsync === 'function') {
      await renderer.compileAsync(scene, camera)
      return
    }
    renderer.compile(scene, camera)
  } catch {
    renderer.compile(scene, camera)
  }
}

export interface ChunkLoaderContext {
  engine: GameEngine
  callbacks: ChunkLoadingCallbacks
  generateChunk3DSync: (cx: number, cy: number, cz: number) => Uint8Array
  disposeMeshData: (meshData: ChunkMeshData) => void
}

export async function loadInitialChunks(ctx: ChunkLoaderContext): Promise<void> {
  console.log('[ChunkLoader] Starting initial chunk load...')

  const { engine, callbacks, generateChunk3DSync, disposeMeshData } = ctx
  const { player, camera, chunks3D, chunkMeshes3D, meshWorkerManager, scene, chunkConnectivity } = engine

  const { cx, cy, cz } = worldToChunk3D(player.position.x, player.position.y, player.position.z)
  console.log(`[ChunkLoader] Player chunk position: (${cx}, ${cy}, ${cz})`)

  const criticalChunks = getChunksInRadius3D(cx, cy, cz, CRITICAL_RENDER_DISTANCE, CRITICAL_RENDER_DISTANCE_Y, CRITICAL_RENDER_DISTANCE_Y)
  console.log(`[ChunkLoader] Critical chunks to load: ${criticalChunks.length}`)

  const extendedChunks = getChunksInRadius3D(cx, cy, cz, INITIAL_RENDER_DISTANCE, INITIAL_RENDER_DISTANCE_Y, INITIAL_RENDER_DISTANCE_Y).filter((chunk) => !criticalChunks.some((c) => c.cx === chunk.cx && c.cy === chunk.cy && c.cz === chunk.cz))

  const pendingConnectivity: Array<{ key: string; chunkData: Uint8Array }> = []

  const loadChunkAsync = (chunk: { cx: number; cy: number; cz: number }, mgr: MeshWorkerManager) => {
    const { cx, cy, cz } = chunk
    const key = getChunkKey3D(cx, cy, cz)

    if (chunkMeshes3D.has(key)) return Promise.resolve(key)

    return mgr
      .generateAndBuildChunk3DAsync(cx, cy, cz, chunks3D, (chunkData) => {
        if (!chunks3D.has(key)) {
          chunks3D.set(key, chunkData)
          pendingConnectivity.push({ key, chunkData })
        }
      })
      .then((meshData) => {
        if (chunkMeshes3D.has(key)) {
          disposeMeshData(meshData)
          return key
        }
        const isEmpty = !meshData.solid && !meshData.transparent && !meshData.foliage && !meshData.fluid
        if (isEmpty) {
          chunkMeshes3D.set(key, {})
        } else {
          if (meshData.solid) scene.add(meshData.solid)
          if (meshData.transparent) scene.add(meshData.transparent)
          if (meshData.foliage) scene.add(meshData.foliage)
          if (meshData.fluid) scene.add(meshData.fluid)
          chunkMeshes3D.set(key, meshData)
        }
        return key
      })
      .catch((err) => {
        console.error(`Failed to load chunk ${key}:`, err)
        return null
      })
  }

  const startTime = performance.now()

  if (meshWorkerManager) {
    console.log('[ChunkLoader] Using mesh workers for loading')
    callbacks.onLoadingProgress?.(0, 'Loading core terrain...')

    try {
      console.log('[ChunkLoader] Starting Promise.all for critical chunks...')
      await Promise.all(criticalChunks.map((chunk) => loadChunkAsync(chunk, meshWorkerManager)))
      console.log('[ChunkLoader] All critical chunks loaded successfully')
    } catch (err) {
      console.error('[ChunkLoader] Error loading critical chunks:', err)
      throw err
    }

    const spawnY = findSpawnY(chunks3D)
    player.position.y = spawnY
    camera.position.y = spawnY + 1.62 * 0.9

    // Update light position to match camera, then trigger shadow map update
    updateLightPositionForShadow(engine)
    engine.renderer.shadowMap.needsUpdate = true
    callbacks.onLoadingProgress?.(95, 'Warming render pipeline...')
    await prewarmVisibleScene(engine)
    callbacks.onLoadingProgress?.(100, 'Done!')
    callbacks.onLoadingComplete?.()
    engine.gameStarted = true

    console.log(`[ChunkLoader] Game ready in ${(performance.now() - startTime).toFixed(0)}ms!`)

    setTimeout(async () => {
      const BATCH_SIZE = 4
      for (let i = 0; i < extendedChunks.length; i += BATCH_SIZE) {
        await Promise.all(extendedChunks.slice(i, i + BATCH_SIZE).map((c) => loadChunkAsync(c, meshWorkerManager)))
        await new Promise((r) => setTimeout(r, 16))
      }
    }, 100)
  } else {
    callbacks.onLoadingProgress?.(0, 'Generating terrain...')
    for (let i = 0; i < criticalChunks.length; i++) {
      const { cx, cy, cz } = criticalChunks[i]
      const chunkData = generateChunk3DSync(cx, cy, cz)
      const key = getChunkKey3D(cx, cy, cz)
      chunks3D.set(key, chunkData)
      pendingConnectivity.push({ key, chunkData })
      if (!isChunk3DEmpty(chunkData)) {
        chunkMeshes3D.set(key, buildChunkMesh3D(cx, cy, cz, chunkData, chunks3D, scene))
      } else {
        chunkMeshes3D.set(key, {})
      }
      callbacks.onLoadingProgress?.(Math.floor(((i + 1) / criticalChunks.length) * 100), `Loading chunks... ${i + 1}/${criticalChunks.length}`)
    }
    const spawnY = findSpawnY(chunks3D)
    player.position.y = spawnY
    camera.position.y = spawnY + 1.62 * 0.9

    // Update light position to match camera, then trigger shadow map update
    updateLightPositionForShadow(engine)
    engine.renderer.shadowMap.needsUpdate = true
    callbacks.onLoadingProgress?.(95, 'Warming render pipeline...')
    await prewarmVisibleScene(engine)
    callbacks.onLoadingProgress?.(100, 'Done!')
    callbacks.onLoadingComplete?.()
    engine.gameStarted = true
  }

  processConnectivityInBackground(pendingConnectivity, chunkConnectivity)
}

function findSpawnY(chunks3D: Map<string, Uint8Array>): number {
  for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
    const block = getBlock3D(SPAWN_X, y, SPAWN_Z, chunks3D)
    if (block !== BlockType.AIR && block !== BlockType.WATER) {
      const a1 = getBlock3D(SPAWN_X, y + 1, SPAWN_Z, chunks3D)
      const a2 = getBlock3D(SPAWN_X, y + 2, SPAWN_Z, chunks3D)
      if ((a1 === BlockType.AIR || a1 === BlockType.WATER) && (a2 === BlockType.AIR || a2 === BlockType.WATER)) {
        return y + 1.5
      }
    }
  }
  return 60
}

function processConnectivityInBackground(pending: Array<{ key: string; chunkData: Uint8Array }>, chunkConnectivity: Map<string, ReturnType<typeof calculateChunkConnectivity>>): void {
  setTimeout(() => {
    let idx = 0
    const process = () => {
      const start = performance.now()
      while (idx < pending.length && performance.now() - start < 3) {
        const { key, chunkData } = pending[idx]
        if (!chunkConnectivity.has(key)) {
          chunkConnectivity.set(key, calculateChunkConnectivity(chunkData))
        }
        idx++
      }
      if (idx < pending.length) {
        typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(process) : setTimeout(process, 32)
      }
    }
    process()
  }, 1000)
}
