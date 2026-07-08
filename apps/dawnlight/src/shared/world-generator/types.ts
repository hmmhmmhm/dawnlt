/**
 * World Generator Types - Shared type definitions for world generation
 */

import type { SimplexNoise } from '../noise'

/**
 * Noise generators used for world generation
 */
export interface NoiseGenerators {
  noise: SimplexNoise
  caveNoise1: SimplexNoise
  caveNoise2: SimplexNoise
  continentalNoise: SimplexNoise
}

/**
 * Terrain functions interface for cave generation
 */
export interface TerrainFunctions {
  getTerrainHeight: (worldX: number, worldZ: number) => number
  getContinentalValue: (worldX: number, worldZ: number) => number
}

/**
 * Trunk position for tree generation
 */
export interface TrunkPosition {
  tx: number
  ty: number
  tz: number
}

/**
 * Wind direction for tree/palm generation
 */
export interface WindDirection {
  dx: number
  dz: number
}
