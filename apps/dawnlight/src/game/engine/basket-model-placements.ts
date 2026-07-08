import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import type { BlockType } from '../../types'
import { getBasketWorldAppleCount, isBasketWorldBlock } from '../basket-utils'

export interface BasketAppleModelSlot {
  position: { x: number; y: number; z: number }
  rotationY: number
  scale: number
}

export interface BasketModelPlacement {
  id: string
  blockX: number
  blockY: number
  blockZ: number
  position: { x: number; y: number; z: number }
  rotationY: number
  scale: number
  appleCount: number
  appleSlots: BasketAppleModelSlot[]
}

const BASKET_APPLE_SLOTS: Array<{ x: number; y: number; z: number; rotationSalt: number; scale: number }> = [
  { x: -0.14, y: 0.34, z: -0.13, rotationSalt: 1, scale: 0.33 },
  { x: 0.13, y: 0.35, z: -0.12, rotationSalt: 2, scale: 0.315 },
  { x: -0.08, y: 0.37, z: 0.15, rotationSalt: 3, scale: 0.3 },
  { x: 0.18, y: 0.33, z: 0.13, rotationSalt: 4, scale: 0.3 },
]

function blockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function seeded01(x: number, y: number, z: number, salt: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt * 91.733) * 43758.5453
  return Math.abs(value) % 1
}

export function collectBasketModelPlacements(chunks3D: Map<string, Uint8Array>, maxPlacements = 96): BasketModelPlacement[] {
  const placements: BasketModelPlacement[] = []
  const keys = [...chunks3D.keys()].sort()

  for (const key of keys) {
    const [cx, cy, cz] = key.split(',').map(Number)
    if (![cx, cy, cz].every(Number.isFinite)) continue

    const chunkData = chunks3D.get(key)
    if (!chunkData) continue

    for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
        for (let localX = 0; localX < CHUNK_SIZE; localX++) {
          const block = chunkData[blockIndex(localX, localY, localZ)] as BlockType
          if (!isBasketWorldBlock(block)) continue

          const blockX = cx * CHUNK_SIZE + localX
          const blockY = cy * CHUNK_Y_SIZE + localY
          const blockZ = cz * CHUNK_SIZE + localZ
          const appleCount = getBasketWorldAppleCount(block)
          const rotationY = seeded01(blockX, blockY, blockZ, 9) * Math.PI * 2

          placements.push({
            id: `${blockX},${blockY},${blockZ}`,
            blockX,
            blockY,
            blockZ,
            position: {
              x: blockX + 0.5,
              y: blockY,
              z: blockZ + 0.5,
            },
            rotationY,
            scale: 0.72,
            appleCount,
            appleSlots: BASKET_APPLE_SLOTS.slice(0, appleCount).map((slot) => ({
              position: { x: slot.x, y: slot.y, z: slot.z },
              rotationY: seeded01(blockX, blockY, blockZ, slot.rotationSalt) * Math.PI * 2,
              scale: slot.scale,
            })),
          })

          if (placements.length >= maxPlacements) return placements
        }
      }
    }
  }

  return placements
}
