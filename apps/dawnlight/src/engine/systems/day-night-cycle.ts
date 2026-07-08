import { Color, MathUtils } from 'three'

// Day/Night cycle color palettes
export const SkyColors = {
  NightTop: new Color(0x0b1026),
  NightBottom: new Color(0x162032),
  NightFog: new Color(0x162032),
  Sunrise: new Color(0xffa500),
  DayTop: new Color(0x0077ff),
  DayBottom: new Color(0x87ceeb),
  Sunset: new Color(0xff9900),
  SunsetBottom: new Color(0xff7700),
  SunsetTop: new Color(0x883355),
}

// Base water tint - light cyan that enhances sky reflection
const WATER_BASE_TINT = new Color(0x66aacc)
const WATER_TINT_STRENGTH = 0.15 // Lower = more sky color reflection

// Helper to create water color from sky color
function createWaterColor(skyColor: Color): Color {
  const waterColor = new Color()
  // Blend sky color with subtle water tint (85% sky, 15% water tint)
  waterColor.lerpColors(skyColor, WATER_BASE_TINT, WATER_TINT_STRENGTH)
  // Boost saturation slightly to make colors more vivid
  const hsl = { h: 0, s: 0, l: 0 }
  waterColor.getHSL(hsl)
  hsl.s = Math.min(1, hsl.s * 1.2) // Increase saturation by 20%
  waterColor.setHSL(hsl.h, hsl.s, hsl.l)
  return waterColor
}

export interface DayNightState {
  skyTop: Color
  skyBottom: Color
  sunIntensity: number
  moonIntensity: number
  moonOpacity: number
  fogColor: Color
  ambientColor: Color
  waterColor: Color
  starOpacity: number
  skyExponent: number
  blockRoughness: number
  blockMetalness: number
}

const NIGHT_ROUGHNESS = 0.3
const NIGHT_METALNESS = 0.4
const DAY_ROUGHNESS = 0.8
const DAY_METALNESS = 0.1
const MINUTES_PER_DAY = 1440

export type StartingTimePeriod = 'day' | 'evening' | 'night'

export interface StartingTimeRange {
  period: StartingTimePeriod
  start: number
  end: number
}

export const STARTING_TIME_RANGES: readonly StartingTimeRange[] = [
  { period: 'day', start: 540, end: 900 }, // 09:00 - 15:00
  { period: 'evening', start: 1020, end: 1140 }, // 17:00 - 19:00
  { period: 'night', start: 1260, end: 240 }, // 21:00 - 04:00
]

export function getRandomStartingGameTime(rng: () => number = Math.random): number {
  const range = STARTING_TIME_RANGES[Math.floor(rng() * STARTING_TIME_RANGES.length)]
  const duration = range.end >= range.start ? range.end - range.start : MINUTES_PER_DAY - range.start + range.end
  return (range.start + rng() * duration) % MINUTES_PER_DAY
}

export function calculateDayNightState(timeNorm: number): DayNightState {
  const state: DayNightState = {
    skyTop: new Color(),
    skyBottom: new Color(),
    sunIntensity: 0,
    moonIntensity: 0,
    moonOpacity: 0,
    fogColor: new Color(),
    ambientColor: new Color(),
    waterColor: new Color(),
    starOpacity: 0,
    skyExponent: 0.6,
    blockRoughness: DAY_ROUGHNESS,
    blockMetalness: DAY_METALNESS,
  }

  if (timeNorm >= 0.2 && timeNorm < 0.3) {
    // Sunrise: Night -> Orange
    const t = (timeNorm - 0.2) / 0.1
    state.skyTop.lerpColors(SkyColors.NightTop, new Color(0x4466aa), t)
    state.skyBottom.lerpColors(SkyColors.NightBottom, SkyColors.Sunrise, t)
    state.sunIntensity = t * 1.2
    state.moonIntensity = (1 - t) * 1.2
    state.moonOpacity = 1 - t
    state.fogColor.lerpColors(SkyColors.NightFog, SkyColors.Sunrise, t)
    state.ambientColor.lerpColors(new Color(0x334466), new Color(0x888888), t)
    state.starOpacity = 1 - t
    state.skyExponent = 0.6 + t * 0.2
    state.blockRoughness = MathUtils.lerp(NIGHT_ROUGHNESS, DAY_ROUGHNESS, t)
    state.blockMetalness = MathUtils.lerp(NIGHT_METALNESS, DAY_METALNESS, t)
  } else if (timeNorm >= 0.3 && timeNorm < 0.4) {
    // Morning: Orange -> Day Blue
    const t = (timeNorm - 0.3) / 0.1
    state.skyTop.lerpColors(new Color(0x4466aa), SkyColors.DayTop, t)
    state.skyBottom.lerpColors(SkyColors.Sunrise, SkyColors.DayBottom, t)
    state.sunIntensity = 1.2 + t * 0.8
    state.moonIntensity = 0
    state.moonOpacity = 0
    state.fogColor.lerpColors(SkyColors.Sunrise, SkyColors.DayBottom, t)
    state.ambientColor.lerpColors(new Color(0x888888), new Color(0xffffff), t)
    state.starOpacity = 0
    state.skyExponent = 0.8 - t * 0.2
    state.blockRoughness = DAY_ROUGHNESS
    state.blockMetalness = DAY_METALNESS
  } else if (timeNorm >= 0.4 && timeNorm < 0.55) {
    // Day
    state.skyTop.copy(SkyColors.DayTop)
    state.skyBottom.copy(SkyColors.DayBottom)
    state.sunIntensity = 2.0
    state.moonIntensity = 0
    state.moonOpacity = 0
    state.fogColor.copy(SkyColors.DayBottom)
    state.ambientColor.setHex(0xffffff)
    state.starOpacity = 0
    state.skyExponent = 0.6
    state.blockRoughness = DAY_ROUGHNESS
    state.blockMetalness = DAY_METALNESS
  } else if (timeNorm >= 0.55 && timeNorm < 0.7) {
    // Evening: Day Blue -> Sunset
    const t = (timeNorm - 0.55) / 0.15
    state.skyTop.lerpColors(SkyColors.DayTop, SkyColors.SunsetTop, t)
    state.skyBottom.lerpColors(SkyColors.DayBottom, SkyColors.SunsetBottom, t)
    state.sunIntensity = MathUtils.lerp(2.0, 1.5, t)
    state.moonIntensity = 0
    state.moonOpacity = 0
    state.fogColor.lerpColors(SkyColors.DayBottom, SkyColors.SunsetBottom, t)
    state.ambientColor.setHex(0xffffff)
    state.starOpacity = 0
    state.skyExponent = 0.6 + t * 0.4
    state.blockRoughness = DAY_ROUGHNESS
    state.blockMetalness = DAY_METALNESS
  } else if (timeNorm >= 0.7 && timeNorm < 0.8) {
    // Sunset: Sunset -> Night
    const t = (timeNorm - 0.7) / 0.1
    state.skyTop.lerpColors(SkyColors.SunsetTop, SkyColors.NightTop, t)
    state.skyBottom.lerpColors(SkyColors.SunsetBottom, SkyColors.NightBottom, t)
    state.sunIntensity = (1 - t) * 1.5
    state.moonIntensity = t * 1.2
    state.moonOpacity = t
    state.fogColor.lerpColors(SkyColors.SunsetBottom, SkyColors.NightFog, t)
    state.ambientColor.lerpColors(new Color(0xffffff), new Color(0x334466), t)
    state.starOpacity = t
    state.skyExponent = 1.0 - t * 0.4
    state.blockRoughness = MathUtils.lerp(DAY_ROUGHNESS, NIGHT_ROUGHNESS, t)
    state.blockMetalness = MathUtils.lerp(DAY_METALNESS, NIGHT_METALNESS, t)
  } else {
    // Night (0.80 - 0.20)
    state.skyTop.copy(SkyColors.NightTop)
    state.skyBottom.copy(SkyColors.NightBottom)
    state.sunIntensity = 0
    state.moonIntensity = 1.2
    state.moonOpacity = 1
    state.fogColor.copy(SkyColors.NightFog)
    state.ambientColor.setHex(0x334466)
    state.starOpacity = 1
    state.skyExponent = 0.6
    state.blockRoughness = NIGHT_ROUGHNESS
    state.blockMetalness = NIGHT_METALNESS
  }

  // Calculate water color from sky reflection (water reflects skyBottom)
  state.waterColor.copy(createWaterColor(state.skyBottom))

  return state
}

export function updateGameTime(currentTime: number, deltaTime: number): number {
  // 20 real mins = 1440 game mins
  // 1 real sec = 1.2 game mins
  let newTime = currentTime + deltaTime * 1.2
  if (newTime >= 1440) newTime -= 1440
  return newTime
}

export function formatGameTime(gameTime: number): string {
  const hours = Math.floor(gameTime / 60)
  const minutes = Math.floor(gameTime % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
