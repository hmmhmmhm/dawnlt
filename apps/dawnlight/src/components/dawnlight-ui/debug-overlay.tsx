import type { DebugStats } from '../../types/game-state'

interface DebugOverlayProps {
  fps: number
  stats: DebugStats
  avoidTopLeftPreview?: boolean
}

export function DebugOverlay({ fps, stats, avoidTopLeftPreview = false }: DebugOverlayProps) {
  const positionClass = avoidTopLeftPreview ? 'top-44 left-2' : 'top-2 left-2'

  return (
    <div className={`absolute ${positionClass} text-white text-xs font-mono bg-black/80 px-2.5 py-2 rounded pointer-events-none select-none leading-relaxed`}>
      <div className={`font-bold text-sm ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
        {fps} FPS <span className="text-gray-400 font-normal text-xs">({stats.frameTime}ms)</span>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Position</div>
        <div>
          Chunk:{' '}
          <span className="text-cyan-300">
            ({stats.playerChunkX}, {stats.playerChunkZ})
          </span>
        </div>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Chunks</div>
        <div>
          Active: <span className="text-cyan-300">{stats.activeChunks}</span> / <span className="text-gray-400">{stats.loadedChunks}</span> <span className="text-gray-500 text-[10px]">({stats.culledChunks} culled)</span>
        </div>
        <div>
          Cache: <span className="text-green-300">{stats.cachedChunks}</span> data / <span className="text-pink-300">{stats.cachedMeshes}</span> mesh
        </div>
        <div>
          Queue: <span className={stats.queueLength > 10 ? 'text-red-400 font-bold' : stats.queueLength > 5 ? 'text-yellow-300' : 'text-gray-300'}>{stats.queueLength}</span>
          {' / '}
          <span className={stats.meshQueueSize > 5 ? 'text-red-400 font-bold' : stats.meshQueueSize > 2 ? 'text-yellow-300' : 'text-gray-300'}>{stats.meshQueueSize}</span> mesh
        </div>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Workers</div>
        <div>
          Active: <span className={stats.busyWorkers > 0 ? 'text-orange-300' : 'text-gray-300'}>{stats.busyWorkers}</span>
          <span className="text-gray-500">/{stats.workerCount}</span>
          {stats.pendingTasks > 0 && <span className="text-yellow-300 ml-1">(+{stats.pendingTasks} pending)</span>}
        </div>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Far LOD</div>
        <div>
          Selected: <span className="text-cyan-300">{stats.lodActiveSections ?? 0}</span>
          {' / '}
          Loaded: <span className="text-green-300">{stats.lodLoadedSections ?? 0}</span>
          {' / '}
          <span className={(stats.lodQueueSize ?? 0) > 24 ? 'text-red-400 font-bold' : (stats.lodQueueSize ?? 0) > 8 ? 'text-yellow-300' : 'text-gray-300'}>{stats.lodQueueSize ?? 0}</span> queue
        </div>
        <div>
          Proc: <span className={(stats.lodProcessingCount ?? 0) > 0 ? 'text-orange-300' : 'text-gray-300'}>{stats.lodProcessingCount ?? 0}</span>
          {' / '}
          Drop: <span className={(stats.lodDroppedTasks ?? 0) > 0 ? 'text-yellow-300' : 'text-gray-500'}>{stats.lodDroppedTasks ?? 0}</span>
          {' / '}
          Tick: <span className={(stats.lodUpdateMs ?? 0) > 2 ? 'text-yellow-300' : 'text-gray-300'}>{stats.lodUpdateMs ?? 0}</span>
          ms
        </div>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Rendering</div>
        <div>
          Visible: <span className="text-blue-300">{stats.visibleMeshes}</span> meshes
        </div>
        <div>
          Draw Calls: <span className={stats.drawCalls > 200 ? 'text-red-400' : stats.drawCalls > 100 ? 'text-yellow-300' : 'text-gray-300'}>{stats.drawCalls}</span>
        </div>
        <div>
          Triangles: <span className="text-purple-300">{stats.triangles.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-gray-400 border-t border-gray-600 pt-1.5 mt-1.5 space-y-0.5">
        <div className="text-gray-500 text-[10px] uppercase tracking-wide">Memory (Est.)</div>
        <div>
          Chunks: <span className="text-green-300">{stats.chunkMemory}</span> MB
          {' / '}
          Mesh: <span className="text-pink-300">{stats.meshMemory}</span> MB
        </div>
        <div>
          Total: <span className={stats.totalMemory > 500 ? 'text-red-400 font-bold' : stats.totalMemory > 200 ? 'text-yellow-300' : 'text-cyan-300'}>{stats.totalMemory}</span> MB
        </div>
      </div>

      {stats.isLoading && (
        <div className="text-orange-400 animate-pulse mt-1.5 pt-1.5 border-t border-gray-600">
          ⏳ Loading... ({stats.busyWorkers} workers, {stats.queueLength + stats.meshQueueSize} queued)
        </div>
      )}
    </div>
  )
}
