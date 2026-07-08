/**
 * SFX trigger helpers for the animation loop.
 *
 * Extracted to keep animation-loop.ts under the 450-line limit.
 */

import { PLAYER_HEIGHT } from '../../constants'
import { getBlock3D } from '../../engine/world'
import { WATER_LEVEL } from '../../shared/constants'
import { BlockType } from '../../types'
import type { GameEngine } from './game-engine'
import { SFX_VOLUMES } from './sfx-manager'
import { getBlockMaterial, SFX_PATHS } from './sfx-map'

/** Play a footstep sound based on the block material beneath the player */
export function playFootstepSfx(engine: GameEngine): void {
  const sfx = engine.sfxManager
  if (!sfx) return

  const px = Math.floor(engine.player.position.x)
  const py = Math.floor(engine.player.position.y) - 1
  const pz = Math.floor(engine.player.position.z)
  const blockBelow = getBlock3D(px, py, pz, engine.chunks3D)

  if (blockBelow === BlockType.AIR || blockBelow === BlockType.WATER) return

  const material = getBlockMaterial(blockBelow)
  if (material === 'water') return

  const walkSounds = SFX_PATHS.walk[material]
  if (walkSounds) {
    const vol = material === 'grass' ? 0.7 : SFX_VOLUMES.walk
    sfx.playRandom(walkSounds, vol)
  }
}

/** Play a block break sound */
export function playBreakSfx(engine: GameEngine, blockType: BlockType): void {
  const sfx = engine.sfxManager
  if (!sfx) return

  const material = getBlockMaterial(blockType)
  if (material === 'water') return

  const breakSound = SFX_PATHS.break[material]
  if (breakSound) {
    sfx.play(breakSound, SFX_VOLUMES.break)
  }
}

/**
 * Update swimming ambient SFX based on player water status.
 * Returns the new swimming state so the caller can track it.
 */
export function updateSwimmingSfx(engine: GameEngine, wasSwimming: boolean): boolean {
  const sfx = engine.sfxManager
  if (!sfx) return wasSwimming

  const px = Math.floor(engine.player.position.x)
  const py = Math.floor(engine.player.position.y + PLAYER_HEIGHT * 0.5)
  const pz = Math.floor(engine.player.position.z)
  const bodyBlock = getBlock3D(px, py, pz, engine.chunks3D)
  const isSwimming = bodyBlock === BlockType.WATER

  if (isSwimming && !wasSwimming) {
    // Just entered water — start swimming ambient
    const urls = SFX_PATHS.ambient.swimming
    const url = urls[Math.floor(Math.random() * urls.length)]
    sfx.startAmbient('swimming', url, SFX_VOLUMES.swimming)
  } else if (!isSwimming && wasSwimming) {
    // Just left water — stop swimming ambient
    sfx.stopAmbient('swimming')
  }

  return isSwimming
}

// ── Seaside ambient ─────────────────────────────────────────

const SEASIDE_MAX_RANGE = 60 // max detection radius (blocks)
const SEASIDE_FULL_RANGE = 9 // distance for full volume
const SEASIDE_SCAN_STEP = 2 // sample every Nth block (WorldGen is fast)
const SEASIDE_VOLUME_BOOST = 3 // seaside audio files are quiet — boost gain
const SEASIDE_MIN_DELAY = 0 // min pause between clips (ms)
const SEASIDE_MAX_DELAY = 6000 // max pause between clips (ms) — randomised

/**
 * Find the distance to the nearest water surface using WorldGenerator.
 * Uses terrain height vs WATER_LEVEL — no Y-axis limitation.
 * Much faster than scanning individual blocks.
 */
function nearestWaterDist(engine: GameEngine): number {
  const worldGen = engine.worldGen
  if (!worldGen) return Infinity

  const px = engine.player.position.x
  const pz = engine.player.position.z
  const r = SEASIDE_MAX_RANGE
  let minDistSq = Infinity

  for (let dx = -r; dx <= r; dx += SEASIDE_SCAN_STEP) {
    for (let dz = -r; dz <= r; dz += SEASIDE_SCAN_STEP) {
      const distSq = dx * dx + dz * dz
      if (distSq >= minDistSq) continue
      const height = worldGen.getTerrainHeight(px + dx, pz + dz)
      if (height <= WATER_LEVEL) {
        minDistSq = distSq
      }
    }
  }
  // Also check the 4 cardinal neighbors at step=1 for close-range accuracy
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ] as const) {
    const distSq = dx * dx + dz * dz
    if (distSq >= minDistSq) continue
    const height = worldGen.getTerrainHeight(px + dx, pz + dz)
    if (height <= WATER_LEVEL) {
      minDistSq = distSq
    }
  }

  return Math.sqrt(minDistSq)
}

/**
 * Update seaside ambient SFX based on distance to nearest water.
 * Uses WorldGenerator terrain data (same as minimap) for Y-independent detection.
 * Plays even while swimming — seaside and swimming sounds layer together.
 */
export function updateSeasideSfx(engine: GameEngine): void {
  const sfx = engine.sfxManager
  if (!sfx) return

  const dist = nearestWaterDist(engine)

  if (dist > SEASIDE_MAX_RANGE) {
    if (sfx.isRepeatAmbientPlaying('seaside')) sfx.stopRepeatAmbient('seaside')
    return
  }

  // Volume: full at FULL_RANGE, linearly fades to 0 at MAX_RANGE
  const t = Math.max(0, Math.min(1, 1 - (dist - SEASIDE_FULL_RANGE) / (SEASIDE_MAX_RANGE - SEASIDE_FULL_RANGE)))
  const volume = t * SFX_VOLUMES.ambient * SEASIDE_VOLUME_BOOST

  if (!sfx.isRepeatAmbientPlaying('seaside')) {
    sfx.startRepeatAmbient('seaside', SFX_PATHS.ambient.seaside, volume, SEASIDE_MIN_DELAY, SEASIDE_MAX_DELAY)
  } else {
    sfx.setRepeatAmbientVolume('seaside', volume)
  }
}

/**
 * Play SFX for block place or break.
 * Used as the `onSfx` callback in BlockActionDeps.
 */
export function handleBlockSfx(engine: GameEngine, type: 'place' | 'break', blockType: BlockType): void {
  const sfx = engine.sfxManager
  if (!sfx) return

  const material = getBlockMaterial(blockType)

  if (type === 'place') {
    sfx.play(SFX_PATHS.place[material], SFX_VOLUMES.place)
  } else if (type === 'break' && material !== 'water') {
    const breakSound = SFX_PATHS.break[material]
    if (breakSound) {
      sfx.play(breakSound, SFX_VOLUMES.break)
    }
  }
}
