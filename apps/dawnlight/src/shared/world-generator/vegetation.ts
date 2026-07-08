/**
 * Vegetation Generation - Cacti, Dead Bushes, Bamboo Forest
 */

import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE, WATER_LEVEL } from '../constants'
import { SimplexNoise } from '../noise'
import { getContinentalValue } from './terrain'
import type { NoiseGenerators } from './types'

function cropHash(worldX: number, worldZ: number): number {
  return Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1
}

export function chooseWildCropForSurface(worldX: number, worldZ: number, continental: number, biomeNoise: number, aboveBlock: BlockType): BlockType.WILD_WHEAT | BlockType.WILD_RICE | null {
  if (aboveBlock !== BlockType.AIR) return null
  if (biomeNoise > 0.4 || biomeNoise < -0.4) return null

  const hash = cropHash(worldX, worldZ)
  if (continental >= -0.08 && continental <= 0.32 && hash > 0.72 && hash < 0.84) return BlockType.WILD_RICE
  if (continental > 0.15 && hash > 0.58 && hash < 0.68) return BlockType.WILD_WHEAT
  return null
}

export function generateWildCrops(noiseGenerators: NoiseGenerators, cx: number, cz: number, chunkData: Uint8Array): void {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z
      const continental = getContinentalValue(noiseGenerators, worldX, worldZ)
      const biomeNoise = noiseGenerators.noise.noise2D(worldX * 0.005, worldZ * 0.005)

      for (let y = CHUNK_HEIGHT - 5; y > WATER_LEVEL; y--) {
        const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
        if (chunkData[index] !== BlockType.GRASS) {
          if (chunkData[index] !== BlockType.AIR) break
          continue
        }

        const aboveIndex = x + (y + 1) * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
        const crop = chooseWildCropForSurface(worldX, worldZ, continental, biomeNoise, chunkData[aboveIndex] as BlockType)
        if (crop !== null && y + 1 < CHUNK_HEIGHT) chunkData[aboveIndex] = crop
        break
      }
    }
  }
}

/**
 * Generate dead bushes in desert biome
 */
export function generateDeadBushes(noiseGenerators: NoiseGenerators, cx: number, cz: number, chunkData: Uint8Array): void {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z

      const biomeNoise = noiseGenerators.noise.noise2D(worldX * 0.005, worldZ * 0.005)
      const isDesert = biomeNoise > 0.4

      if (isDesert) {
        const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1

        if (pseudoRandom < 0.07) {
          // 7% chance
          for (let y = CHUNK_HEIGHT - 5; y > WATER_LEVEL; y--) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
            if (chunkData[index] === BlockType.SAND) {
              const aboveIndex = x + (y + 1) * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
              if (y + 1 < CHUNK_HEIGHT && chunkData[aboveIndex] === BlockType.AIR) {
                chunkData[aboveIndex] = BlockType.DEAD_BUSH
              }
              break
            } else if (chunkData[index] !== BlockType.AIR) {
              break
            }
          }
        }
      }
    }
  }
}

/**
 * Generate bamboo forest in non-desert, non-snowy biomes
 */
export function generateBambooForest(noiseGenerators: NoiseGenerators, cx: number, cz: number, _chunkData: Uint8Array): void {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z

      // Skip ocean/beach areas
      const continental = getContinentalValue(noiseGenerators, worldX, worldZ)
      if (continental < 0.15) continue

      // Skip desert and snowy biomes (they don't have GRASS)
      const biomeNoise = noiseGenerators.noise.noise2D(worldX * 0.005, worldZ * 0.005)
      if (biomeNoise > 0.4 || biomeNoise < -0.4) continue
    }
  }
}

/**
 * Generate cacti in desert biome
 */
export function generateCacti(noiseGenerators: NoiseGenerators, cx: number, cz: number, chunkData: Uint8Array): void {
  const rng = new SimplexNoise(cx * 2000 + cz)

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z

      // Re-check biome to only spawn in deserts
      const biomeNoise = noiseGenerators.noise.noise2D(worldX * 0.005, worldZ * 0.005)
      const isDesert = biomeNoise > 0.4

      if (isDesert) {
        // Sparse placement
        if (rng.noise2D(worldX * 0.8, worldZ * 0.8) > 0.9) {
          // Increased from 0.95
          // Find surface
          for (let y = CHUNK_HEIGHT - 5; y > WATER_LEVEL; y--) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
            const block = chunkData[index]

            if (block === BlockType.SAND) {
              // Found sand, place cactus
              const height = Math.floor(Math.random() * 3) + 1 // 1 to 3 blocks high

              for (let h = 1; h <= height; h++) {
                if (y + h < CHUNK_HEIGHT) {
                  const cactusIndex = x + (y + h) * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
                  // Only place if air
                  if (chunkData[cactusIndex] === BlockType.AIR) {
                    chunkData[cactusIndex] = BlockType.CACTUS
                  }
                }
              }
              break // Stop after placing one cactus column
            } else if (block !== BlockType.AIR && block !== BlockType.CACTUS) {
              // Hit something else (water, stone, etc), stop searching this column
              break
            }
          }
        }
      }
    }
  }
}
