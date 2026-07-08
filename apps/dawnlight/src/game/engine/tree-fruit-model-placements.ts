import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import { BlockType } from '../../types'

const TREE_FRUIT_MODEL_SCALE_MULTIPLIER = 1.5

export type TreeFruitModelKey = 'apple' | 'orange' | 'peach' | 'banana'

export interface TreeFruitModelPlacement {
  id: string
  fruitType: BlockType.APPLE | BlockType.ORANGE | BlockType.PEACH | BlockType.BANANA
  modelKey: TreeFruitModelKey
  blockX: number
  blockY: number
  blockZ: number
  position: { x: number; y: number; z: number }
  rotationY: number
  scale: number
}

function blockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function seeded01(x: number, y: number, z: number, salt: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt * 91.733) * 43758.5453
  return Math.abs(value) % 1
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo
}

function getBlockAt(chunks3D: Map<string, Uint8Array>, worldX: number, worldY: number, worldZ: number): BlockType {
  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const chunkData = chunks3D.get(`${cx},${cy},${cz}`)
  if (!chunkData) return BlockType.AIR

  const localX = positiveModulo(worldX, CHUNK_SIZE)
  const localY = positiveModulo(worldY, CHUNK_Y_SIZE)
  const localZ = positiveModulo(worldZ, CHUNK_SIZE)
  return chunkData[blockIndex(localX, localY, localZ)] ?? BlockType.AIR
}

function isLeafBlock(block: BlockType): boolean {
  return block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES
}

function getFruitModelKey(block: BlockType): TreeFruitModelKey | null {
  if (block === BlockType.APPLE) return 'apple'
  if (block === BlockType.ORANGE) return 'orange'
  if (block === BlockType.PEACH) return 'peach'
  if (block === BlockType.BANANA) return 'banana'
  return null
}

function isTreeFruitBlock(block: BlockType): block is BlockType.APPLE | BlockType.ORANGE | BlockType.PEACH | BlockType.BANANA {
  return block === BlockType.APPLE || block === BlockType.ORANGE || block === BlockType.PEACH || block === BlockType.BANANA
}

function computeLeafSideOffset(chunks3D: Map<string, Uint8Array>, blockX: number, blockY: number, blockZ: number): { x: number; z: number } {
  let x = 0
  let z = 0
  let hasTreeContext = false

  for (let dy = 0; dy <= 2; dy++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue
        const block = getBlockAt(chunks3D, blockX + dx, blockY + dy, blockZ + dz)
        if (!isLeafBlock(block)) continue

        hasTreeContext = true
        x -= dx * 0.55
        z -= dz * 0.55
      }
    }
  }

  for (let dy = -1; dy <= 2; dy++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dz === 0) continue
        const block = getBlockAt(chunks3D, blockX + dx, blockY + dy, blockZ + dz)
        if (block !== BlockType.WOOD && block !== BlockType.PALM_WOOD) continue

        hasTreeContext = true
        const distanceSq = dx * dx + dz * dz
        const weight = 2.2 / Math.max(distanceSq, 0.75)
        x -= dx * weight
        z -= dz * weight
      }
    }
  }

  const length = Math.hypot(x, z)
  if (length < 0.001) {
    if (!hasTreeContext) return { x: 0, z: 0 }

    const angle = seeded01(blockX, blockY, blockZ, 7) * Math.PI * 2
    return { x: Math.cos(angle) * 0.3, z: Math.sin(angle) * 0.3 }
  }

  return { x: (x / length) * 0.32, z: (z / length) * 0.32 }
}

export function collectTreeFruitModelPlacements(chunks3D: Map<string, Uint8Array>, maxPlacements = 80): TreeFruitModelPlacement[] {
  const placements: TreeFruitModelPlacement[] = []
  const keys = [...chunks3D.keys()].sort()

  for (const key of keys) {
    const [cx, cy, cz] = key.split(',').map(Number)
    if (![cx, cy, cz].every(Number.isFinite)) continue

    const chunkData = chunks3D.get(key)
    if (!chunkData) continue

    for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
        for (let localX = 0; localX < CHUNK_SIZE; localX++) {
          const fruitType = chunkData[blockIndex(localX, localY, localZ)] as BlockType
          if (!isTreeFruitBlock(fruitType)) continue
          const modelKey = getFruitModelKey(fruitType)
          if (!modelKey) continue

          const blockX = cx * CHUNK_SIZE + localX
          const blockY = cy * CHUNK_Y_SIZE + localY
          const blockZ = cz * CHUNK_SIZE + localZ
          const jitterX = (seeded01(blockX, blockY, blockZ, 1) - 0.5) * 0.22
          const jitterZ = (seeded01(blockX, blockY, blockZ, 2) - 0.5) * 0.22
          const hangOffset = seeded01(blockX, blockY, blockZ, 3) * 0.12
          const sideOffset = computeLeafSideOffset(chunks3D, blockX, blockY, blockZ)
          const scale = (0.24 + seeded01(blockX, blockY, blockZ, 4) * 0.1) * TREE_FRUIT_MODEL_SCALE_MULTIPLIER

          placements.push({
            id: `${modelKey}:${blockX},${blockY},${blockZ}`,
            fruitType,
            modelKey,
            blockX,
            blockY,
            blockZ,
            position: {
              x: blockX + 0.5 + sideOffset.x + jitterX * 0.35,
              y: blockY + 0.35 - hangOffset,
              z: blockZ + 0.5 + sideOffset.z + jitterZ * 0.35,
            },
            rotationY: seeded01(blockX, blockY, blockZ, 5) * Math.PI * 2,
            scale,
          })

          if (placements.length >= maxPlacements) return placements
        }
      }
    }
  }

  return placements
}
