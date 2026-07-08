export const MASTER_VOLUME = 1.0
export const VOLUME_PLACE = 1.0
export const VOLUME_BREAK = 1.0
export const VOLUME_WALK = 1.0
export const VOLUME_AMBIENT = 1.0
export const VOLUME_SWIMMING = 1.0

export const SFX_VOLUMES = {
  place: VOLUME_PLACE,
  break: VOLUME_BREAK,
  walk: VOLUME_WALK,
  ambient: VOLUME_AMBIENT,
  swimming: VOLUME_SWIMMING,
} as const

export const DEBOUNCE_MS = 50
export const PITCH_MIN = 0.9
export const PITCH_MAX = 1.1
export const AMBIENT_FADE_MS = 1000
