/**
 * Palm Tree Generation - Beach and desert palm trees with curved trunks and fronds
 */

import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE, WATER_LEVEL } from '../constants'
import { SimplexNoise } from '../noise'
import { getContinentalValue } from './terrain'
import type { NoiseGenerators, TrunkPosition, WindDirection } from './types'

/**
 * Generate palm trees in beach and desert biomes
 */
export function generatePalmTrees(noiseGenerators: NoiseGenerators, cx: number, cz: number, chunkData: Uint8Array): void {
  const rng = new SimplexNoise(cx * 3000 + cz)

  // Need larger margin for curved trunk and long fronds
  for (let x = 6; x < CHUNK_SIZE - 6; x++) {
    for (let z = 6; z < CHUNK_SIZE - 6; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z

      const biomeNoise = noiseGenerators.noise.noise2D(worldX * 0.005, worldZ * 0.005)
      const isDesert = biomeNoise > 0.4

      // Check if beach area (palm trees can grow on beaches too!)
      const continental = getContinentalValue(noiseGenerators, worldX, worldZ)
      const isBeach = continental >= -0.1 && continental < 0.15

      if (isDesert || isBeach) {
        // Palm trees on beach and desert (same density as regular trees)
        const threshold = 0.84 // Same as regular tree density (1 - TREE_DENSITY * 2)
        if (rng.noise2D(worldX * 0.5, worldZ * 0.5) > threshold) {
          for (let y = CHUNK_HEIGHT - 15; y > WATER_LEVEL; y--) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
            if (chunkData[index] === BlockType.SAND) {
              // Found surface sand
              const height = Math.floor(Math.random() * 3) + 6 // 6-8 blocks high

              // ===== 1. WIND DIRECTION =====
              const windChoices: WindDirection[] = [
                { dx: 1, dz: 0 }, // East
                { dx: -1, dz: 0 }, // West
                { dx: 0, dz: 1 }, // South
                { dx: 0, dz: -1 }, // North
              ]
              const windIndex = Math.floor(Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 4)
              const wind = windChoices[windIndex]

              // ===== 2. CURVED TRUNK =====
              const trunkPositions: TrunkPosition[] = []
              let currentX = x
              let currentZ = z

              for (let h = 1; h <= height; h++) {
                const curveProgress = h / height
                const curveAmount = curveProgress * curveProgress * 3

                const offsetX = Math.round(wind.dx * curveAmount)
                const offsetZ = Math.round(wind.dz * curveAmount)
                currentX = x + offsetX
                currentZ = z + offsetZ

                trunkPositions.push({ tx: currentX, ty: y + h, tz: currentZ })
              }

              // Check if we can build
              let canBuild = true
              for (const pos of trunkPositions) {
                if (pos.tx < 0 || pos.tx >= CHUNK_SIZE || pos.tz < 0 || pos.tz >= CHUNK_SIZE) {
                  canBuild = false
                  break
                }
                if (pos.ty >= CHUNK_HEIGHT) {
                  canBuild = false
                  break
                }
                const checkIndex = pos.tx + pos.ty * CHUNK_SIZE + pos.tz * CHUNK_SIZE * CHUNK_HEIGHT
                if (chunkData[checkIndex] !== BlockType.AIR) {
                  canBuild = false
                  break
                }
              }

              if (canBuild) {
                // Build curved trunk
                for (const pos of trunkPositions) {
                  const trunkIndex = pos.tx + pos.ty * CHUNK_SIZE + pos.tz * CHUNK_SIZE * CHUNK_HEIGHT
                  chunkData[trunkIndex] = BlockType.PALM_WOOD
                }

                // Crown position (top of trunk)
                const crown = trunkPositions[trunkPositions.length - 1]
                const crownX = crown.tx
                const crownY = crown.ty
                const crownZ = crown.tz

                // Helper to set leaf if air
                const setLeaf = (lx: number, ly: number, lz: number) => {
                  if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly >= 0 && ly < CHUNK_HEIGHT) {
                    const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[idx] === BlockType.AIR) {
                      chunkData[idx] = BlockType.PALM_LEAVES
                    }
                  }
                }

                // Helper to set wood (for frond spines)
                const setWood = (lx: number, ly: number, lz: number) => {
                  if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly >= 0 && ly < CHUNK_HEIGHT) {
                    const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[idx] === BlockType.AIR) {
                      chunkData[idx] = BlockType.PALM_WOOD
                    }
                  }
                }

                // ===== 3. SPINE FRONDS WITH WIND BIAS =====
                const frondDirs: WindDirection[] = [
                  { dx: 1, dz: 0 },
                  { dx: -1, dz: 0 },
                  { dx: 0, dz: 1 },
                  { dx: 0, dz: -1 },
                  { dx: 1, dz: 1 },
                  { dx: -1, dz: -1 },
                ]

                frondDirs.forEach(({ dx, dz }) => {
                  const dotProduct = dx * wind.dx + dz * wind.dz

                  let frondLength: number
                  if (dotProduct > 0) {
                    frondLength = 5
                  } else if (dotProduct < 0) {
                    frondLength = 2
                  } else {
                    frondLength = 3
                  }

                  for (let f = 1; f <= frondLength; f++) {
                    const droopProgress = f / frondLength
                    const droop = Math.floor(droopProgress * droopProgress * 3)

                    const spineX = crownX + dx * f
                    const spineY = crownY - droop
                    const spineZ = crownZ + dz * f

                    if (f <= frondLength - 1) {
                      setWood(spineX, spineY, spineZ)
                    } else {
                      setLeaf(spineX, spineY, spineZ)
                    }

                    let perpX = 0,
                      perpZ = 0
                    if (dx !== 0 && dz === 0) {
                      perpZ = 1
                    } else if (dz !== 0 && dx === 0) {
                      perpX = 1
                    } else {
                      perpX = dx
                      perpZ = -dz
                    }

                    if (f >= 1) {
                      setLeaf(spineX + perpX, spineY, spineZ + perpZ)
                      setLeaf(spineX - perpX, spineY, spineZ - perpZ)

                      if (f >= 2 && frondLength >= 4) {
                        setLeaf(spineX + perpX, spineY - 1, spineZ + perpZ)
                        setLeaf(spineX - perpX, spineY - 1, spineZ - perpZ)
                      }
                    }
                  }
                })

                // ===== 4. TOP CROWN =====
                setLeaf(crownX, crownY + 1, crownZ)
                setLeaf(crownX + wind.dx, crownY + 1, crownZ + wind.dz)
                setLeaf(crownX + wind.dx, crownY + 2, crownZ + wind.dz)

                setLeaf(crownX + 1, crownY, crownZ)
                setLeaf(crownX - 1, crownY, crownZ)
                setLeaf(crownX, crownY, crownZ + 1)
                setLeaf(crownX, crownY, crownZ - 1)

                // ===== 5. PACKED SAND around palm tree base (5x5) =====
                const baseY = y

                for (let ox = -2; ox <= 2; ox++) {
                  for (let oz = -2; oz <= 2; oz++) {
                    const packedX = x + ox
                    const packedZ = z + oz

                    if (packedX < 0 || packedX >= CHUNK_SIZE || packedZ < 0 || packedZ >= CHUNK_SIZE) continue
                    if (ox === 0 && oz === 0) continue

                    const distSq = ox * ox + oz * oz

                    if (distSq <= 5) {
                      const surfaceIndex = packedX + baseY * CHUNK_SIZE + packedZ * CHUNK_SIZE * CHUNK_HEIGHT
                      const currentBlock = chunkData[surfaceIndex]

                      if (currentBlock === BlockType.SAND) {
                        chunkData[surfaceIndex] = BlockType.PACKED_SAND
                      }
                    }
                  }
                }

                // ===== 6. VINES ON PALM TREE =====
                const setVine = (vx: number, vy: number, vz: number) => {
                  if (vx >= 0 && vx < CHUNK_SIZE && vz >= 0 && vz < CHUNK_SIZE && vy >= 0 && vy < CHUNK_HEIGHT) {
                    const idx = vx + vy * CHUNK_SIZE + vz * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[idx] === BlockType.AIR) {
                      chunkData[idx] = BlockType.VINE
                    }
                  }
                }

                const palmVineRng = Math.abs(Math.sin(worldX * 56.789 + worldZ * 34.567) * 43758.5453) % 1

                // 98% chance for trunk vines
                if (palmVineRng < 0.98) {
                  const trunkVineDirs: WindDirection[] = [
                    { dx: 1, dz: 0 },
                    { dx: -1, dz: 0 },
                    { dx: 0, dz: 1 },
                    { dx: 0, dz: -1 },
                  ]

                  const numTrunkVines = palmVineRng < 0.5 ? 4 : 3
                  const shuffled = [...trunkVineDirs]
                  for (let i = shuffled.length - 1; i > 0; i--) {
                    const seedVal = Math.abs(Math.sin(worldX * (i + 5) * 98.765 + worldZ * (i + 5) * 43.21) * 43758.5453)
                    const j = Math.floor(seedVal * (i + 1)) % (i + 1)
                    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                  }

                  for (let v = 0; v < numTrunkVines; v++) {
                    const dir = shuffled[v]
                    for (let h = 2; h < height - 1; h++) {
                      const trunkPos = trunkPositions[h]
                      if (trunkPos) {
                        setVine(trunkPos.tx + dir.dx, trunkPos.ty, trunkPos.tz + dir.dz)
                      }
                    }
                  }
                }

                // 100% chance for hanging vines from frond tips
                if (palmVineRng < 1.0) {
                  const frondTipDirs = [
                    { dx: 3, dz: 0 },
                    { dx: -3, dz: 0 },
                    { dx: 0, dz: 3 },
                    { dx: 0, dz: -3 },
                    { dx: 2, dz: 2 },
                    { dx: -2, dz: -2 },
                  ]

                  for (const dir of frondTipDirs) {
                    const tipX = crownX + dir.dx
                    const tipZ = crownZ + dir.dz
                    const tipY = crownY - 2

                    if (tipX >= 0 && tipX < CHUNK_SIZE && tipZ >= 0 && tipZ < CHUNK_SIZE) {
                      const tipIdx = tipX + tipY * CHUNK_SIZE + tipZ * CHUNK_SIZE * CHUNK_HEIGHT
                      if (chunkData[tipIdx] === BlockType.PALM_LEAVES || chunkData[tipIdx] === BlockType.PALM_WOOD) {
                        const vineChance = Math.abs(Math.sin(tipX * 11.111 + tipZ * 22.222 + worldX * 0.5) * 43758.5453) % 1
                        if (vineChance < 0.8) {
                          const vineLength = 2 + (Math.floor(vineChance * 15) % 4)
                          for (let vl = 1; vl <= vineLength; vl++) {
                            setVine(tipX, tipY - vl, tipZ)
                          }
                        }
                      }
                    }
                  }
                }
              }
              break // Done with this column
            } else if (chunkData[index] !== BlockType.AIR && chunkData[index] !== BlockType.CACTUS) {
              break
            }
          }
        }
      }
    }
  }
}
