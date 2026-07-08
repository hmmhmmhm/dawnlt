import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import type { BlockType } from '../../types'
import { type FarmingModelKey, getFarmingModelConfig, isFarmingWorldCropBlock } from './farming-model-config'

export interface FarmingModelPlacement {
  id: string
  blockType: BlockType
  modelKey: FarmingModelKey
  blockX: number
  blockY: number
  blockZ: number
  position: { x: number; y: number; z: number }
  rotationY: number
  scale: number
  phase: number
  clusterCount: number
}

export interface FarmingModelFocus {
  x: number
  y: number
  z: number
}

function blockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function seeded01(x: number, y: number, z: number, salt: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt * 31.171) * 43758.5453
  return Math.abs(value) % 1
}

export function collectFarmingModelPlacements(chunks3D: Map<string, Uint8Array>, maxPlacements = 160, focus?: FarmingModelFocus): FarmingModelPlacement[] {
  const placements: FarmingModelPlacement[] = []
  const keys = [...chunks3D.keys()].sort()

  for (const key of keys) {
    const [cx, cy, cz] = key.split(',').map(Number)
    if (![cx, cy, cz].every(Number.isFinite)) continue

    const chunkData = chunks3D.get(key)
    if (!chunkData) continue

    for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
        for (let localX = 0; localX < CHUNK_SIZE; localX++) {
          const blockType = chunkData[blockIndex(localX, localY, localZ)] as BlockType
          if (!isFarmingWorldCropBlock(blockType)) continue

          const config = getFarmingModelConfig(blockType)
          if (!config) continue

          const blockX = cx * CHUNK_SIZE + localX
          const blockY = cy * CHUNK_Y_SIZE + localY
          const blockZ = cz * CHUNK_SIZE + localZ
          const scaleJitter = 0.94 + seeded01(blockX, blockY, blockZ, 1) * 0.12

          placements.push({
            id: `${config.key}:${blockX},${blockY},${blockZ}`,
            blockType,
            modelKey: config.key,
            blockX,
            blockY,
            blockZ,
            position: {
              x: blockX + 0.5,
              y: blockY,
              z: blockZ + 0.5,
            },
            rotationY: seeded01(blockX, blockY, blockZ, 2) * Math.PI * 2,
            scale: config.scale * scaleJitter,
            phase: seeded01(blockX, blockY, blockZ, 3) * Math.PI * 2,
            clusterCount: config.clusterCount ?? 1,
          })

          if (!focus && placements.length >= maxPlacements) return placements
        }
      }
    }
  }

  if (!focus) return placements

  return placements.sort((a, b) => distanceSquared(a.position, focus) - distanceSquared(b.position, focus)).slice(0, maxPlacements)
}

function distanceSquared(a: FarmingModelFocus, b: FarmingModelFocus): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}
