/**
 * World Generator - Shared between main thread and workers
 * This file has NO external dependencies (DOM/THREE.js) and can be safely imported by Web Workers
 */

import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE, WATER_LEVEL } from '../constants'
import { SimplexNoise } from '../noise'
import { isCave, isCaveEntrance } from './caves'
import { generatePalmTrees } from './palm-trees'
import { getContinentalValue as getContValue, getTerrainHeight as getTerHeight } from './terrain'
import { generateTrees } from './trees'
import type { NoiseGenerators } from './types'
import { generateBambooForest, generateCacti, generateDeadBushes, generateWildCrops } from './vegetation'

export class WorldGenerator {
  private noise: SimplexNoise
  private caveNoise1: SimplexNoise
  private caveNoise2: SimplexNoise
  private continentalNoise: SimplexNoise

  constructor(seed: number = 12345) {
    this.noise = new SimplexNoise(seed)
    this.caveNoise1 = new SimplexNoise(seed + 1000)
    this.caveNoise2 = new SimplexNoise(seed + 2000)
    this.continentalNoise = new SimplexNoise(seed + 4000)
  }

  private get noiseGenerators(): NoiseGenerators {
    return {
      noise: this.noise,
      caveNoise1: this.caveNoise1,
      caveNoise2: this.caveNoise2,
      continentalNoise: this.continentalNoise,
    }
  }

  /**
   * Get continental value at a position (-1 to 1)
   * Used for beach/lake placement (no deep oceans)
   */
  public getContinentalValue(worldX: number, worldZ: number): number {
    return getContValue(this.noiseGenerators, worldX, worldZ)
  }

  /**
   * Get terrain height at a specific world position
   */
  public getTerrainHeight(worldX: number, worldZ: number): number {
    return getTerHeight(this.noiseGenerators, worldX, worldZ)
  }

  generateChunk(cx: number, cz: number): Uint8Array {
    const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
    const noiseGens = this.noiseGenerators
    const terrainFunctions = {
      getTerrainHeight: (wx: number, wz: number) => this.getTerrainHeight(wx, wz),
      getContinentalValue: (wx: number, wz: number) => this.getContinentalValue(wx, wz),
    }

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x
        const worldZ = cz * CHUNK_SIZE + z

        const height = this.getTerrainHeight(worldX, worldZ)
        const continental = this.getContinentalValue(worldX, worldZ)

        const isLake = continental < -0.2
        const isBeach = continental >= -0.2 && continental < 0.15

        const biomeNoise = this.noise.noise2D(worldX * 0.005, worldZ * 0.005)
        const isDesert = !isLake && !isBeach && biomeNoise > 0.4
        const isSnowy = !isLake && !isBeach && biomeNoise < -0.4

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT

          if (y === 0) {
            chunkData[index] = BlockType.BEDROCK
          } else if (y < height - 4) {
            if (!isLake && isCave(noiseGens, worldX, y, worldZ, height)) {
              chunkData[index] = BlockType.AIR
            } else {
              const oreChance = Math.random()
              if (y < 12 && oreChance < 0.005) {
                chunkData[index] = BlockType.DIAMOND_ORE
              } else if (y < 20 && oreChance < 0.01) {
                chunkData[index] = BlockType.GOLD_ORE
              } else if (y < 40 && oreChance < 0.02) {
                chunkData[index] = BlockType.IRON_ORE
              } else if (oreChance < 0.03) {
                chunkData[index] = BlockType.COAL_ORE
              } else {
                chunkData[index] = BlockType.STONE
              }
            }
          } else if (y < height) {
            if (!isLake && isCave(noiseGens, worldX, y, worldZ, height)) {
              chunkData[index] = BlockType.AIR
            } else if (isLake || isBeach) {
              chunkData[index] = BlockType.SAND
            } else {
              chunkData[index] = isDesert ? BlockType.SAND : BlockType.DIRT
            }
          } else if (y === height) {
            if (isLake || isBeach || y <= WATER_LEVEL + 1) {
              chunkData[index] = BlockType.SAND
            } else if (isDesert) {
              chunkData[index] = BlockType.SAND
            } else if (isSnowy) {
              chunkData[index] = BlockType.SNOW
            } else {
              chunkData[index] = BlockType.GRASS
            }
          } else if (y > height && y <= WATER_LEVEL) {
            chunkData[index] = BlockType.WATER
          } else if (y > height) {
            if (y <= WATER_LEVEL) {
              chunkData[index] = BlockType.WATER
            } else if (isCaveEntrance(noiseGens, terrainFunctions, worldX, y, worldZ, height)) {
              chunkData[index] = BlockType.AIR
            } else {
              const belowBlock = chunkData[index - CHUNK_SIZE]
              if (y === height + 1) {
                const foliageRng = Math.random()

                if (belowBlock === BlockType.SNOW) {
                  if (foliageRng < 0.12) {
                    chunkData[index] = BlockType.SNOW_BUSH
                  } else if (foliageRng < 0.18) {
                    chunkData[index] = BlockType.WINTER_FLOWER
                  } else if (foliageRng < 0.22) {
                    chunkData[index] = BlockType.SNOW_PEBBLE
                  } else {
                    chunkData[index] = BlockType.AIR
                  }
                } else if (belowBlock === BlockType.GRASS) {
                  if (foliageRng < 0.1) {
                    chunkData[index] = BlockType.BUSH
                  } else if (foliageRng < 0.12) {
                    chunkData[index] = BlockType.RED_FLOWER
                  } else if (foliageRng < 0.14) {
                    chunkData[index] = BlockType.YELLOW_FLOWER
                  } else if (foliageRng < 0.18) {
                    chunkData[index] = BlockType.STONE_PEBBLE
                  } else {
                    chunkData[index] = BlockType.AIR
                  }
                } else if (belowBlock === BlockType.SAND && y > WATER_LEVEL) {
                  const biomeNoise = this.noise.noise2D(worldX * 0.005, worldZ * 0.005)
                  const isDesert = biomeNoise > 0.4
                  if (foliageRng < 0.06) {
                    chunkData[index] = BlockType.PEBBLE
                  } else if (foliageRng < 0.09 && !isDesert) {
                    chunkData[index] = BlockType.STARFISH
                  } else if (foliageRng < 0.13 && isDesert) {
                    chunkData[index] = BlockType.DEAD_BUSH
                  } else {
                    chunkData[index] = BlockType.AIR
                  }
                } else {
                  chunkData[index] = BlockType.AIR
                }
              } else {
                chunkData[index] = BlockType.AIR
              }
            }
          } else if (y <= WATER_LEVEL) {
            chunkData[index] = BlockType.WATER
          } else {
            const belowBlock = chunkData[index - CHUNK_SIZE]
            if (y === height + 1) {
              const foliageRng = Math.random()

              if (belowBlock === BlockType.SNOW) {
                if (foliageRng < 0.12) {
                  chunkData[index] = BlockType.SNOW_BUSH
                } else if (foliageRng < 0.18) {
                  chunkData[index] = BlockType.WINTER_FLOWER
                } else if (foliageRng < 0.22) {
                  chunkData[index] = BlockType.SNOW_PEBBLE
                } else {
                  chunkData[index] = BlockType.AIR
                }
              } else if (belowBlock === BlockType.GRASS) {
                if (foliageRng < 0.1) {
                  chunkData[index] = BlockType.BUSH
                } else if (foliageRng < 0.12) {
                  chunkData[index] = BlockType.RED_FLOWER
                } else if (foliageRng < 0.14) {
                  chunkData[index] = BlockType.YELLOW_FLOWER
                } else if (foliageRng < 0.18) {
                  chunkData[index] = BlockType.STONE_PEBBLE
                } else {
                  chunkData[index] = BlockType.AIR
                }
              } else if (belowBlock === BlockType.SAND) {
                const biomeNoise = this.noise.noise2D(worldX * 0.005, worldZ * 0.005)
                const isDesert = biomeNoise > 0.4
                if (foliageRng < 0.06) {
                  chunkData[index] = BlockType.PEBBLE
                } else if (foliageRng < 0.09 && !isDesert) {
                  chunkData[index] = BlockType.STARFISH
                } else if (foliageRng < 0.13 && isDesert) {
                  chunkData[index] = BlockType.DEAD_BUSH
                } else {
                  chunkData[index] = BlockType.AIR
                }
              } else {
                chunkData[index] = BlockType.AIR
              }
            } else {
              chunkData[index] = BlockType.AIR
            }
          }
        }
      }
    }

    generateTrees(noiseGens, cx, cz, chunkData)
    generatePalmTrees(noiseGens, cx, cz, chunkData)
    generateCacti(noiseGens, cx, cz, chunkData)
    generateDeadBushes(noiseGens, cx, cz, chunkData)
    generateBambooForest(noiseGens, cx, cz, chunkData)
    generateWildCrops(noiseGens, cx, cz, chunkData)
    return chunkData
  }

  /**
   * Generate a 3D chunk section (16x32x16) from the full column data
   */
  generateChunk3D(cx: number, cy: number, cz: number): Uint8Array {
    const sectionData = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    const startY = cy * CHUNK_Y_SIZE

    const fullChunk = this.generateChunk(cx, cz)

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
          const worldY = startY + localY
          if (worldY >= CHUNK_HEIGHT) {
            sectionData[x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE] = BlockType.AIR
          } else {
            const fullIndex = x + worldY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
            const sectionIndex = x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
            sectionData[sectionIndex] = fullChunk[fullIndex]
          }
        }
      }
    }

    return sectionData
  }

  /**
   * Generate all 3D chunk sections for a column at once (more efficient)
   */
  generateChunkColumn3D(cx: number, cz: number): Map<number, Uint8Array> {
    const sections = new Map<number, Uint8Array>()
    const fullChunk = this.generateChunk(cx, cz)

    for (let cy = 0; cy < CHUNK_Y_COUNT; cy++) {
      const sectionData = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
      const startY = cy * CHUNK_Y_SIZE

      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
            const worldY = startY + localY
            if (worldY >= CHUNK_HEIGHT) {
              sectionData[x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE] = BlockType.AIR
            } else {
              const fullIndex = x + worldY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
              const sectionIndex = x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
              sectionData[sectionIndex] = fullChunk[fullIndex]
            }
          }
        }
      }

      sections.set(cy, sectionData)
    }

    return sections
  }
}
