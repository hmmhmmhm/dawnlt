/**
 * Cave Generation - Cave system detection and entrance generation
 */

import type { NoiseGenerators, TerrainFunctions } from './types'

/**
 * Check if position is exposed to air on hillside (for horizontal cave entrances)
 */
export function isHillsideExposed(terrainFunctions: TerrainFunctions, worldX: number, y: number, worldZ: number): boolean {
  // Check 4 cardinal directions - if any neighbor has lower terrain, this could be a hillside
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2], // Check further out too
  ]

  for (const [dx, dz] of directions) {
    const neighborHeight = terrainFunctions.getTerrainHeight(worldX + dx, worldZ + dz)
    // If neighbor terrain is lower than current Y, this block is on a hillside
    if (neighborHeight < y) {
      return true
    }
  }
  return false
}

/**
 * Check if a position should be a cave (worm-like tunnel system)
 */
export function isCave(noiseGenerators: NoiseGenerators, worldX: number, y: number, worldZ: number, _surfaceHeight?: number): boolean {
  // Don't generate caves too close to bedrock
  if (y <= 5) return false

  // Scale factors for different cave types
  const wormScale = 0.05 // Medium worm-like caves

  // Worm caves: The "Pure Tunnel" type
  // Uses higher frequency noise for winding tunnels
  const wormNoise1 = noiseGenerators.caveNoise1.noise3D(
    worldX * wormScale + 500,
    y * wormScale * 1.0, // 1.0 = Round tunnels
    worldZ * wormScale + 500,
  )
  const wormNoise2 = noiseGenerators.caveNoise2.noise3D(worldX * wormScale + 500, y * wormScale * 1.0, worldZ * wormScale + 500)
  const wormValue = wormNoise1 * wormNoise1 + wormNoise2 * wormNoise2

  // Adjusted threshold for cleaner, thinner tunnels
  // Was 0.008, reduced to 0.006 for tighter tunnels
  let wormThreshold = 0.006

  // Depth-based cave density: slightly wider deeper down, but capped
  // Reduced depth influence significantly (0.3 -> 0.1) to prevent massive cracks
  const depthFactor = Math.max(0, 1 - y / 150)
  wormThreshold = wormThreshold * (1 + depthFactor * 0.1)

  // Cave carving: true if any cave type applies
  const isWormCave = wormValue < wormThreshold

  return isWormCave
}

/**
 * Check if a cave should be exposed at hillside (horizontal entrance)
 */
export function isCaveEntrance(noiseGenerators: NoiseGenerators, terrainFunctions: TerrainFunctions, worldX: number, y: number, worldZ: number, surfaceHeight: number): boolean {
  // Only check near surface level
  if (y > surfaceHeight || y < surfaceHeight - 15) return false

  // Must be a cave location first
  if (!isCave(noiseGenerators, worldX, y, worldZ, surfaceHeight)) return false

  // Check if this position is on a hillside (exposed to air horizontally)
  return isHillsideExposed(terrainFunctions, worldX, y, worldZ)
}
