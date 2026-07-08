/**
 * Terrain Generation - Height and continental value calculations
 */

import { WATER_LEVEL } from '../constants'
import type { NoiseGenerators } from './types'

/**
 * Get continental value at a position (-1 to 1)
 * Used for beach/lake placement (no deep oceans)
 */
export function getContinentalValue(noiseGenerators: NoiseGenerators, worldX: number, worldZ: number): number {
  // Large scale noise for beach/lake placement
  const continental = noiseGenerators.continentalNoise.octaveNoise2D(worldX, worldZ, 3, 0.5, 0.003)
  // Add medium scale variation for more interesting coastlines
  const coastDetail = noiseGenerators.continentalNoise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.01) * 0.25
  return continental + coastDetail
}

/**
 * Get terrain height at a specific world position (for neighbor checks and fireflies)
 * No deep oceans - only beaches and small lakes
 */
export function getTerrainHeight(noiseGenerators: NoiseGenerators, worldX: number, worldZ: number): number {
  const continental = getContinentalValue(noiseGenerators, worldX, worldZ)

  // Beach/Lake zone: continental < 0 (creates shallow water areas and beaches)
  // Transition zone: 0.1 <= continental < 0.3 (gradual slope from beach to land)
  // Land: continental >= 0.3

  if (continental < -0.2) {
    // Shallow lake/pond area (just slightly below water level)
    const lakeNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.03)
    return Math.floor(WATER_LEVEL - 3 + lakeNoise * 2)
  } else if (continental < 0.1) {
    // Beach/shore zone - flat sandy areas around water level
    const t = (continental + 0.2) / 0.3 // 0 to 1 as we go from -0.2 to 0.1
    const beachNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.03)
    const beachBase = WATER_LEVEL - 1
    const beachTop = WATER_LEVEL + 4
    return Math.floor(beachBase + t * (beachTop - beachBase) + beachNoise * 1)
  } else if (continental < 0.3) {
    // Transition zone - gradual slope from beach to normal terrain
    // Use smoothstep for smoother transition
    const t = (continental - 0.1) / 0.2 // 0 to 1 as we go from 0.1 to 0.3
    const smoothT = t * t * (3 - 2 * t) // Smoothstep for natural curve

    const beachNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.03)
    const beachHeight = WATER_LEVEL + 4 + beachNoise * 1

    // Target land height at continental = 0.3
    const mountainNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 4, 0.5, 0.005)
    const hillNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 3, 0.5, 0.01)
    const detailNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.05)
    const baseHeight = 28
    const inlandBoost = Math.min((0.3 - 0.1) * 15, 12) // ~3 at continental=0.3
    const landHeight = baseHeight + inlandBoost + mountainNoise * 8 + hillNoise * 3 + detailNoise * 2

    // Interpolate between beach and land heights
    return Math.floor(beachHeight + smoothT * (landHeight - beachHeight))
  } else {
    // Normal land terrain
    const baseHeight = 28
    const mountainNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 4, 0.5, 0.005)
    const hillNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 3, 0.5, 0.01)
    const detailNoise = noiseGenerators.noise.octaveNoise2D(worldX, worldZ, 2, 0.5, 0.05)

    // Inland boost based on how far from coast
    const inlandBoost = Math.min((continental - 0.1) * 15, 12)

    return Math.floor(baseHeight + inlandBoost + mountainNoise * 8 + hillNoise * 3 + detailNoise * 2)
  }
}
