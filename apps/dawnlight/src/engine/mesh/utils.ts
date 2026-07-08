/**
 * Utility functions for mesh generation
 */

/**
 * Create a seeded random function based on world position
 * Used for consistent random placement across chunk rebuilds
 */
export function createSeededRandom(worldX: number, worldZ: number): (n: number) => number {
  const seed = (worldX * 73856093) ^ (worldZ * 19349663)
  return (n: number) => {
    const s = Math.sin(seed + n * 12.9898) * 43758.5453
    return s - Math.floor(s)
  }
}
