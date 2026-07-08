import { advanceLoadedCrops, uniqueChunkPositionsForChanges } from '../farming-utils'
import type { GameEngine } from './game-engine'

export interface FarmingGrowthState {
  timer: number
  tick: number
}

export function updateFarmingGrowth(engine: GameEngine, state: FarmingGrowthState, deltaTime: number, rebuildChunk: (cx: number, cy: number, cz: number, worldX?: number, worldY?: number, worldZ?: number) => void): void {
  state.timer += deltaTime
  if (state.timer < 4) return

  state.timer = 0
  state.tick++
  const changes = advanceLoadedCrops(engine.chunks3D, {
    tick: state.tick,
    isRaining: engine.weather === 'rain',
  })

  for (const chunk of uniqueChunkPositionsForChanges(changes)) {
    rebuildChunk(chunk.cx, chunk.cy, chunk.cz, chunk.x, chunk.y, chunk.z)
  }
}
