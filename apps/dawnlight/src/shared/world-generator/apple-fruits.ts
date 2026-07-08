import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'

export interface AppleFruitOptions {
  chance?: number
  maxApples?: number
}

export interface OrangeFruitOptions {
  chance?: number
  maxOranges?: number
}

export interface PeachFruitOptions {
  chance?: number
  maxPeaches?: number
}

export interface BananaFruitOptions {
  chance?: number
  maxBananas?: number
}

export interface TreeFruitOptions {
  appleChance?: number
  orangeChance?: number
  peachChance?: number
  bananaChance?: number
  maxApples?: number
  maxOranges?: number
  maxPeaches?: number
  maxBananas?: number
}

export type TreeFruitPlacementResult = {
  fruitType: BlockType.APPLE | BlockType.ORANGE | BlockType.PEACH | BlockType.BANANA | null
  count: number
}

type Offset = { dx: number; dy: number; dz: number }
type AppleCandidate = {
  apple: Offset
  support: Offset
}

const PRIORITY_APPLE_CANDIDATES: AppleCandidate[] = [
  { apple: { dx: -1, dy: -1, dz: 0 }, support: { dx: -1, dy: 0, dz: 0 } },
  { apple: { dx: 1, dy: -1, dz: 0 }, support: { dx: 1, dy: 0, dz: 0 } },
  { apple: { dx: 0, dy: -1, dz: -1 }, support: { dx: 0, dy: 0, dz: -1 } },
  { apple: { dx: 0, dy: -1, dz: 1 }, support: { dx: 0, dy: 0, dz: 1 } },
]

function getIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

function fruitRandom(worldX: number, worldZ: number, offset: number): number {
  const value = Math.sin(worldX * 37.719 + worldZ * 19.131 + offset * 91.733) * 43758.5453
  return Math.abs(value) % 1
}

function collectFruitCandidates(): AppleCandidate[] {
  const candidates: AppleCandidate[] = []
  const seen = new Set<string>()

  const addCandidate = (candidate: AppleCandidate) => {
    const key = `${candidate.apple.dx},${candidate.apple.dy},${candidate.apple.dz}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(candidate)
  }

  PRIORITY_APPLE_CANDIDATES.forEach(addCandidate)

  for (let dy = 1; dy >= -3; dy--) {
    for (let radius = 1; radius <= 4; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue

          addCandidate({
            apple: { dx, dy: dy - 1, dz },
            support: { dx, dy, dz },
          })
        }
      }
    }
  }

  return candidates
}

function placeFruitBlocks(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, blockType: BlockType.APPLE | BlockType.ORANGE | BlockType.PEACH | BlockType.BANANA, chance: number, maxFruit: number, seedOffset: number): number {
  if (isWinterTree) return 0

  let placed = 0
  const candidates = collectFruitCandidates()

  for (let i = 0; i < candidates.length && placed < maxFruit; i++) {
    if (fruitRandom(worldX, worldZ, i + seedOffset) > chance) continue

    const offset = candidates[i]
    const ax = crownX + offset.apple.dx
    const ay = crownY + offset.apple.dy
    const az = crownZ + offset.apple.dz
    const supportX = crownX + offset.support.dx
    const supportY = crownY + offset.support.dy
    const supportZ = crownZ + offset.support.dz

    if (ax < 0 || ax >= CHUNK_SIZE || az < 0 || az >= CHUNK_SIZE) continue
    if (supportX < 0 || supportX >= CHUNK_SIZE || supportZ < 0 || supportZ >= CHUNK_SIZE) continue
    if (ay < 0 || ay >= CHUNK_HEIGHT || supportY < 0 || supportY >= CHUNK_HEIGHT) continue

    const appleIndex = getIndex(ax, ay, az)
    const supportIndex = getIndex(supportX, supportY, supportZ)
    if (chunkData[appleIndex] !== BlockType.AIR) continue
    if (chunkData[supportIndex] !== BlockType.LEAVES) continue

    chunkData[appleIndex] = blockType
    placed += 1
  }

  return placed
}

export function placeAppleFruits(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, options: AppleFruitOptions = {}): number {
  return placeFruitBlocks(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, BlockType.APPLE, options.chance ?? 0.9, options.maxApples ?? 4, 0)
}

export function placeOrangeFruits(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, options: OrangeFruitOptions = {}): number {
  return placeFruitBlocks(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, BlockType.ORANGE, options.chance ?? 0.78, options.maxOranges ?? 3, 41)
}

export function placePeachFruits(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, options: PeachFruitOptions = {}): number {
  return placeFruitBlocks(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, BlockType.PEACH, options.chance ?? 0.76, options.maxPeaches ?? 3, 83)
}

export function placeBananaFruits(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, options: BananaFruitOptions = {}): number {
  return placeFruitBlocks(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, BlockType.BANANA, options.chance ?? 0.74, options.maxBananas ?? 3, 127)
}

function selectTreeFruitType(worldX: number, worldZ: number, appleChance: number, orangeChance: number, peachChance: number, bananaChance: number): BlockType.APPLE | BlockType.ORANGE | BlockType.PEACH | BlockType.BANANA | null {
  const roll = fruitRandom(worldX, worldZ, 911)
  if (roll < appleChance) return BlockType.APPLE
  if (roll < appleChance + orangeChance) return BlockType.ORANGE
  if (roll < appleChance + orangeChance + peachChance) return BlockType.PEACH
  if (roll < appleChance + orangeChance + peachChance + bananaChance) return BlockType.BANANA
  return null
}

export function placeTreeFruits(chunkData: Uint8Array, crownX: number, crownY: number, crownZ: number, worldX: number, worldZ: number, isWinterTree: boolean, options: TreeFruitOptions = {}): TreeFruitPlacementResult {
  if (isWinterTree) return { fruitType: null, count: 0 }

  const fruitType = selectTreeFruitType(worldX, worldZ, options.appleChance ?? 0.62, options.orangeChance ?? 0.16, options.peachChance ?? 0.12, options.bananaChance ?? 0.1)
  if (!fruitType) return { fruitType: null, count: 0 }

  if (fruitType === BlockType.BANANA) {
    return {
      fruitType,
      count: placeBananaFruits(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, {
        chance: 1,
        maxBananas: options.maxBananas,
      }),
    }
  }

  if (fruitType === BlockType.PEACH) {
    return {
      fruitType,
      count: placePeachFruits(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, {
        chance: 1,
        maxPeaches: options.maxPeaches,
      }),
    }
  }

  if (fruitType === BlockType.ORANGE) {
    return {
      fruitType,
      count: placeOrangeFruits(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, {
        chance: 1,
        maxOranges: options.maxOranges,
      }),
    }
  }

  return {
    fruitType,
    count: placeAppleFruits(chunkData, crownX, crownY, crownZ, worldX, worldZ, isWinterTree, {
      chance: 1,
      maxApples: options.maxApples,
    }),
  }
}
