/**
 * Tree Generation - Regular trees with leaning trunks, roots, and decorations
 */

import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE, TREE_DENSITY, WATER_LEVEL } from '../constants'
import { SimplexNoise } from '../noise'
import { placeTreeFruits } from './apple-fruits'
import { getContinentalValue } from './terrain'
import type { NoiseGenerators, TrunkPosition, WindDirection } from './types'

/**
 * Generate trees in grass and snow biomes
 */
export function generateTrees(noiseGenerators: NoiseGenerators, cx: number, cz: number, chunkData: Uint8Array): void {
  const treeRng = new SimplexNoise(cx * 1000 + cz)

  // Need larger margin for curved trunk and branches
  for (let x = 4; x < CHUNK_SIZE - 4; x++) {
    for (let z = 4; z < CHUNK_SIZE - 4; z++) {
      const worldX = cx * CHUNK_SIZE + x
      const worldZ = cz * CHUNK_SIZE + z

      // Skip ocean and beach areas
      const continental = getContinentalValue(noiseGenerators, worldX, worldZ)
      if (continental < 0.15) continue

      const treeNoise = treeRng.noise2D(worldX * 0.5, worldZ * 0.5)

      if (treeNoise > 1 - TREE_DENSITY * 2) {
        for (let y = CHUNK_HEIGHT - 10; y >= WATER_LEVEL; y--) {
          const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
          const block = chunkData[index]

          // Generate trees on GRASS or SNOW (winter trees)
          if (block === BlockType.GRASS || block === BlockType.SNOW) {
            const isWinterTree = block === BlockType.SNOW
            const treeHeight = Math.floor(Math.random() * 3) + 7 // 7-9 blocks

            // Increase tree density in snowy areas
            if (isWinterTree) {
              const extraTreeChance = Math.abs(Math.sin(worldX * 34.567 + worldZ * 12.345) * 43758.5453) % 1
              if (extraTreeChance > 0.6) {
                // Skip this tree 40% of the time
              }
            }

            // ===== 1. WIND DIRECTION =====
            const windChoices: WindDirection[] = [
              { dx: 1, dz: 0 },
              { dx: -1, dz: 0 },
              { dx: 0, dz: 1 },
              { dx: 0, dz: -1 },
            ]
            const windIndex = Math.floor(Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 4)
            const wind = windChoices[windIndex]

            // ===== 2. LEANING TRUNK =====
            const trunkPositions: TrunkPosition[] = []

            const leanRng = Math.abs(Math.sin(worldX * 56.789 + worldZ * 12.345) * 43758.5453) % 1
            const leanStrength = 0.15 + leanRng * 0.1

            for (let h = 1; h <= treeHeight; h++) {
              const progress = h / treeHeight
              const leanAmount = progress * leanStrength * treeHeight

              const offsetX = Math.round(wind.dx * leanAmount)
              const offsetZ = Math.round(wind.dz * leanAmount)

              const tx = x + offsetX
              const tz = z + offsetZ
              trunkPositions.push({ tx, ty: y + h, tz })
            }

            // Check if we can build
            let canPlace = true
            for (const pos of trunkPositions) {
              if (pos.tx < 0 || pos.tx >= CHUNK_SIZE || pos.tz < 0 || pos.tz >= CHUNK_SIZE) {
                canPlace = false
                break
              }
              if (pos.ty >= CHUNK_HEIGHT) {
                canPlace = false
                break
              }
              const checkIndex = pos.tx + pos.ty * CHUNK_SIZE + pos.tz * CHUNK_SIZE * CHUNK_HEIGHT
              if (chunkData[checkIndex] !== BlockType.AIR) {
                canPlace = false
                break
              }
            }

            if (canPlace) {
              // Build curved trunk
              for (const pos of trunkPositions) {
                const trunkIndex = pos.tx + pos.ty * CHUNK_SIZE + pos.tz * CHUNK_SIZE * CHUNK_HEIGHT
                chunkData[trunkIndex] = BlockType.WOOD
              }

              // Crown position (top of trunk)
              const crown = trunkPositions[trunkPositions.length - 1]
              const crownX = crown.tx
              const crownY = crown.ty
              const crownZ = crown.tz

              // Helper to set leaf
              const leafType = isWinterTree ? BlockType.SNOW_LEAVES : BlockType.LEAVES
              const setLeaf = (lx: number, ly: number, lz: number) => {
                if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly >= 0 && ly < CHUNK_HEIGHT) {
                  const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT
                  if (chunkData[idx] === BlockType.AIR) {
                    chunkData[idx] = leafType
                  }
                }
              }

              // Helper to set wood
              const setWood = (lx: number, ly: number, lz: number) => {
                if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly >= 0 && ly < CHUNK_HEIGHT) {
                  const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_HEIGHT
                  if (chunkData[idx] === BlockType.AIR) {
                    chunkData[idx] = BlockType.WOOD
                  }
                }
              }

              // ===== TREE ROOTS / THICK BASE =====
              const baseY = y + 1
              const rootRng = Math.abs(Math.sin(worldX * 23.456 + worldZ * 78.901) * 43758.5453) % 1

              const allDirs: WindDirection[] = [
                { dx: 1, dz: 0 },
                { dx: -1, dz: 0 },
                { dx: 0, dz: 1 },
                { dx: 0, dz: -1 },
                { dx: 1, dz: 1 },
                { dx: -1, dz: 1 },
                { dx: 1, dz: -1 },
                { dx: -1, dz: -1 },
              ]

              // 55% chance for roots
              if (rootRng < 0.55) {
                const rootCount = 2 + (Math.floor(rootRng * 5.45) % 3)

                const shuffledDirs = [...allDirs]
                for (let i = shuffledDirs.length - 1; i > 0; i--) {
                  const seedVal = Math.abs(Math.sin(worldX * (i + 1) * 12.345 + worldZ * (i + 1) * 67.89) * 43758.5453)
                  const j = Math.floor(seedVal * (i + 1)) % (i + 1)
                  ;[shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]]
                }

                for (let r = 0; r < rootCount && r < shuffledDirs.length; r++) {
                  const dir = shuffledDirs[r]
                  const rootX = x + dir.dx
                  const rootZ = z + dir.dz

                  if (rootX >= 0 && rootX < CHUNK_SIZE && rootZ >= 0 && rootZ < CHUNK_SIZE) {
                    const rootIndex = rootX + baseY * CHUNK_SIZE + rootZ * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[rootIndex] === BlockType.AIR) {
                      chunkData[rootIndex] = BlockType.WOOD
                    }
                  }
                }
              }

              // 30% chance for extended roots
              if (rootRng > 0.35 && rootRng < 0.65) {
                const extendedCount = rootRng > 0.5 ? 2 : 1
                for (let e = 0; e < extendedCount; e++) {
                  const dirSeed = Math.abs(Math.sin(worldX * (e + 10) * 34.567 + worldZ * (e + 10) * 89.012) * 43758.5453)
                  const dir = allDirs[Math.floor(dirSeed * 8) % 8]

                  const extRootX = x + dir.dx * 2
                  const extRootZ = z + dir.dz * 2

                  if (extRootX >= 0 && extRootX < CHUNK_SIZE && extRootZ >= 0 && extRootZ < CHUNK_SIZE) {
                    const extRootIndex = extRootX + baseY * CHUNK_SIZE + extRootZ * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[extRootIndex] === BlockType.AIR) {
                      chunkData[extRootIndex] = BlockType.WOOD
                    }
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

              // ===== TOP CROWN =====
              setLeaf(crownX, crownY + 1, crownZ)
              setLeaf(crownX + wind.dx, crownY + 1, crownZ + wind.dz)
              setLeaf(crownX + wind.dx, crownY + 2, crownZ + wind.dz)

              setLeaf(crownX + 1, crownY, crownZ)
              setLeaf(crownX - 1, crownY, crownZ)
              setLeaf(crownX, crownY, crownZ + 1)
              setLeaf(crownX, crownY, crownZ - 1)
              placeTreeFruits(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree)

              // ===== 5. VINES =====
              {
                const vineType = isWinterTree ? BlockType.SNOW_VINE : BlockType.VINE

                const setVine = (vx: number, vy: number, vz: number) => {
                  if (vx >= 0 && vx < CHUNK_SIZE && vz >= 0 && vz < CHUNK_SIZE && vy >= 0 && vy < CHUNK_HEIGHT) {
                    const idx = vx + vy * CHUNK_SIZE + vz * CHUNK_SIZE * CHUNK_HEIGHT
                    if (chunkData[idx] === BlockType.AIR) {
                      chunkData[idx] = vineType
                    }
                  }
                }

                const vineRng = Math.abs(Math.sin(worldX * 56.789 + worldZ * 34.567) * 43758.5453) % 1

                // 98% chance for trunk vines
                if (vineRng < 0.98) {
                  const trunkVineDirs: WindDirection[] = [
                    { dx: 1, dz: 0 },
                    { dx: -1, dz: 0 },
                    { dx: 0, dz: 1 },
                    { dx: 0, dz: -1 },
                  ]

                  const numTrunkVines = vineRng < 0.5 ? 4 : 3
                  const shuffled = [...trunkVineDirs]
                  for (let i = shuffled.length - 1; i > 0; i--) {
                    const seedVal = Math.abs(Math.sin(worldX * (i + 5) * 98.765 + worldZ * (i + 5) * 43.21) * 43758.5453)
                    const j = Math.floor(seedVal * (i + 1)) % (i + 1)
                    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                  }

                  for (let v = 0; v < numTrunkVines; v++) {
                    const dir = shuffled[v]
                    for (let h = 2; h < treeHeight - 1; h++) {
                      const trunkPos = trunkPositions[h]
                      if (trunkPos) {
                        setVine(trunkPos.tx + dir.dx, trunkPos.ty, trunkPos.tz + dir.dz)
                      }
                    }
                  }
                }

                // 100% chance for hanging vines
                const hangingVineRng = Math.abs(Math.sin(worldX * 78.901 + worldZ * 23.456) * 43758.5453) % 1
                if (hangingVineRng < 1.0) {
                  const vineCheckDirs = [
                    { dx: 2, dz: 0 },
                    { dx: -2, dz: 0 },
                    { dx: 0, dz: 2 },
                    { dx: 0, dz: -2 },
                    { dx: 2, dz: 1 },
                    { dx: 2, dz: -1 },
                    { dx: -2, dz: 1 },
                    { dx: -2, dz: -1 },
                    { dx: 1, dz: 2 },
                    { dx: -1, dz: 2 },
                    { dx: 1, dz: -2 },
                    { dx: -1, dz: -2 },
                  ]

                  for (const dir of vineCheckDirs) {
                    const checkX = crownX + dir.dx
                    const checkZ = crownZ + dir.dz
                    const checkY = crownY - 1

                    if (checkX >= 0 && checkX < CHUNK_SIZE && checkZ >= 0 && checkZ < CHUNK_SIZE) {
                      const leafIdx = checkX + checkY * CHUNK_SIZE + checkZ * CHUNK_SIZE * CHUNK_HEIGHT
                      if (chunkData[leafIdx] === BlockType.LEAVES) {
                        const vineChance = Math.abs(Math.sin(checkX * 11.111 + checkZ * 22.222 + worldX * 0.5) * 43758.5453) % 1
                        if (vineChance < 0.85) {
                          const vineLength = 2 + (Math.floor(vineChance * 20) % 5)
                          for (let vl = 1; vl <= vineLength; vl++) {
                            setVine(checkX, checkY - vl, checkZ)
                          }
                        }
                      }
                    }
                  }
                }
              }

              // ===== 6. GROUND DECORATION =====
              if (!isWinterTree) {
                const aboveGroundY = y + 1

                const setGroundDecor = (gx: number, gy: number, gz: number, blockType: BlockType) => {
                  if (gx >= 0 && gx < CHUNK_SIZE && gz >= 0 && gz < CHUNK_SIZE && gy >= 0 && gy < CHUNK_HEIGHT) {
                    const idx = gx + gy * CHUNK_SIZE + gz * CHUNK_SIZE * CHUNK_HEIGHT
                    const currentBlock = chunkData[idx]
                    if (currentBlock === BlockType.AIR) {
                      if (gy > 0) {
                        const belowIdx = gx + (gy - 1) * CHUNK_SIZE + gz * CHUNK_SIZE * CHUNK_HEIGHT
                        const belowBlock = chunkData[belowIdx]
                        if (belowBlock === BlockType.GRASS || belowBlock === BlockType.DIRT) {
                          chunkData[idx] = blockType
                        }
                      }
                    }
                  }
                }

                for (let dx = -2; dx <= 2; dx++) {
                  for (let dz = -2; dz <= 2; dz++) {
                    if (dx === 0 && dz === 0) continue

                    const decorX = x + dx
                    const decorZ = z + dz

                    if (decorX < 0 || decorX >= CHUNK_SIZE || decorZ < 0 || decorZ >= CHUNK_SIZE) continue

                    const distSq = dx * dx + dz * dz
                    const decorRng = Math.abs(Math.sin(decorX * 45.678 + decorZ * 12.345 + worldX * 0.1) * 43758.5453) % 1

                    if (distSq <= 2) {
                      if (decorRng < 0.6) {
                        setGroundDecor(decorX, aboveGroundY, decorZ, BlockType.MOSS)
                      } else if (decorRng < 0.75) {
                        const mushroomType = decorRng < 0.67 ? BlockType.MUSHROOM_BROWN : BlockType.MUSHROOM_RED
                        setGroundDecor(decorX, aboveGroundY, decorZ, mushroomType)
                      }
                    } else if (distSq <= 8) {
                      if (decorRng < 0.35) {
                        setGroundDecor(decorX, aboveGroundY, decorZ, BlockType.FALLEN_LEAVES)
                      } else if (decorRng < 0.4) {
                        setGroundDecor(decorX, aboveGroundY, decorZ, BlockType.MOSS)
                      } else if (decorRng < 0.45) {
                        const mushroomType = decorRng < 0.42 ? BlockType.MUSHROOM_BROWN : BlockType.MUSHROOM_RED
                        setGroundDecor(decorX, aboveGroundY, decorZ, mushroomType)
                      }
                    }
                  }
                }
              }
            }
            break
          } else if (block !== BlockType.AIR && block !== BlockType.WATER) {
            break
          }
        }
      }
    }
  }
}
