/**
 * Shared constants for both main thread and web workers
 * This file has NO external dependencies
 */

// Chunk dimensions
export const CHUNK_SIZE = 16
export const CHUNK_HEIGHT = 256
export const CHUNK_Y_SIZE = 32 // Vertical chunk section size (256 / 32 = 8 sections)
export const CHUNK_Y_COUNT = Math.floor(CHUNK_HEIGHT / CHUNK_Y_SIZE) // Number of vertical sections

// World generation
export const WATER_LEVEL = 15
export const TREE_DENSITY = 0.08
