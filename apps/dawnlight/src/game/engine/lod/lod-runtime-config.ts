import type { LodQuality } from '../../../constants'

export const DEFAULT_MAX_QUEUE_SIZE = 256
export const FAR_COVER_HYSTERESIS_MS = 260
export const INITIAL_LOD_WARMUP_MS = 1500
export const INITIAL_LOD_VISIBILITY_WARMUP_MS = 4000
export const MAX_SYNC_LOD_COLUMN_GENERATIONS_PER_TICK = 2
export const MAX_SECTION_INPUT_BUILDS_PER_TICK = 1
export const MAX_COMPLETED_SECTION_APPLIES_PER_TICK = 1
export const MAX_NEW_VISIBLE_SECTIONS_PER_TICK = 1

export function getMaxLevelByQuality(quality: LodQuality): number {
  if (quality === 'low') return 2
  if (quality === 'high') return 4
  return 3
}
