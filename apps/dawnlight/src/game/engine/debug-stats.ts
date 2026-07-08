import { worldToChunk3D } from '../../engine/world'
import type { GameEngine } from './game-engine'
import type { DebugStats } from './types'

/**
 * Collect debug statistics from the game engine
 */
export function collectDebugStats(engine: GameEngine, deltaTime: number): DebugStats {
  const { chunkMeshes3D, chunkDataCache, meshCache, chunkLoadQueue, meshWorkerManager, renderer } = engine
  const { cx, cz } = worldToChunk3D(engine.player.position.x, 0, engine.player.position.z)

  const renderInfo = renderer.info
  const meshQueueSize = meshWorkerManager?.meshQueueSize ?? 0
  const workerCount = meshWorkerManager?.workerCount ?? 0
  const busyWorkers = meshWorkerManager?.busyWorkerCount ?? 0
  const pendingTasks = meshWorkerManager?.pendingCount ?? 0
  const lodEnabled = engine.lodRuntime.isEnabled()
  const lodActiveSections = engine.lodRuntime.getActiveSectionCount()
  const lodQueueSize = engine.lodRuntime.getQueueSize()
  const lodProcessingCount = engine.lodRuntime.getProcessingCount()
  const lodDroppedTasks = engine.lodRuntime.getDroppedCount()
  const lodUpdateMs = Math.round(engine.lodRuntime.getLastUpdateMs() * 100) / 100
  const lodLoadedSections = engine.scene.getObjectByName('far-lod-group')?.children.length ?? 0

  // Count visible meshes
  let visibleMeshCount = 0
  let totalFaceCount = 0

  chunkMeshes3D.forEach((meshData) => {
    const meshes = [meshData.solid, meshData.transparent, meshData.foliage, meshData.fluid]
    meshes.forEach((mesh) => {
      if (mesh?.visible) {
        visibleMeshCount++
        const posAttr = mesh.geometry.attributes.position
        if (posAttr) {
          totalFaceCount += posAttr.count / 3
        }
      }
    })
  })

  // Memory estimation
  const chunkMemory = (chunkDataCache.size * (16 * 16 * 16)) / (1024 * 1024)
  const meshMemory = meshCache.size * 0.5
  const totalMemory = chunkMemory + meshMemory

  // Count active/culled chunks
  let activeChunks = 0
  let culledChunks = 0

  chunkMeshes3D.forEach((meshData) => {
    const hasMesh = meshData.solid || meshData.transparent || meshData.fluid || meshData.foliage
    if (hasMesh) {
      const isVisible = meshData.solid?.visible || meshData.transparent?.visible || meshData.foliage?.visible || meshData.fluid?.visible
      if (isVisible) {
        activeChunks++
      } else {
        culledChunks++
      }
    } else {
      culledChunks++
    }
  })

  return {
    loadedChunks: chunkMeshes3D.size,
    activeChunks,
    culledChunks,
    cachedChunks: chunkDataCache.size,
    cachedMeshes: meshCache.size,
    queueLength: chunkLoadQueue.length,
    meshQueueSize,
    lodEnabled,
    lodActiveSections,
    lodQueueSize,
    lodProcessingCount,
    lodDroppedTasks,
    lodUpdateMs,
    lodLoadedSections,
    visibleMeshes: visibleMeshCount,
    totalFaces: Math.round(totalFaceCount),
    isLoading: chunkLoadQueue.length > 0 || meshQueueSize > 0 || busyWorkers > 0 || lodQueueSize > 0 || lodProcessingCount > 0,
    playerChunkX: cx,
    playerChunkZ: cz,
    frameTime: Math.round(deltaTime * 1000 * 10) / 10,
    drawCalls: renderInfo.render.calls,
    triangles: renderInfo.render.triangles,
    workerCount,
    busyWorkers,
    pendingTasks,
    chunkMemory: Math.round(chunkMemory * 10) / 10,
    meshMemory: Math.round(meshMemory * 10) / 10,
    totalMemory: Math.round(totalMemory * 10) / 10,
  }
}
