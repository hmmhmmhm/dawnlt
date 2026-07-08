import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'
import { placeAppleFruits, placeBananaFruits, placeOrangeFruits, placePeachFruits, placeTreeFruits } from './apple-fruits'

declare const describe: any
declare const test: any
declare const expect: any

function createChunk(): Uint8Array {
  return new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
}

function index(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

describe('tree apple fruit placement', () => {
  test('places apple blocks below regular tree leaves when positions are open', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ - 1)] = BlockType.LEAVES
    chunk[index(crownX, crownY - 1, crownZ - 1)] = BlockType.WOOD

    const placed = placeAppleFruits(chunk, crownX, crownY, crownZ, 120, 240, false, {
      chance: 1,
      maxApples: 2,
    })

    expect(placed).toBe(2)
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX, crownY - 1, crownZ - 1)]).toBe(BlockType.WOOD)
  })

  test('places visible apples below lower outer leaves when direct crown cells are occupied', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ - 1)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ + 1)] = BlockType.LEAVES

    chunk[index(crownX - 1, crownY - 1, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY - 1, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY - 1, crownZ - 1)] = BlockType.LEAVES
    chunk[index(crownX, crownY - 1, crownZ + 1)] = BlockType.LEAVES
    chunk[index(crownX - 2, crownY - 1, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 2, crownY - 1, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY - 1, crownZ - 2)] = BlockType.LEAVES
    chunk[index(crownX, crownY - 1, crownZ + 2)] = BlockType.LEAVES

    const placed = placeAppleFruits(chunk, crownX, crownY, crownZ, 120, 240, false, {
      chance: 1,
      maxApples: 4,
    })

    expect(placed).toBe(4)
    expect(chunk[index(crownX - 1, crownY - 2, crownZ)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX + 1, crownY - 2, crownZ)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX, crownY - 2, crownZ - 1)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX, crownY - 2, crownZ + 1)]).toBe(BlockType.APPLE)
    expect(chunk[index(crownX - 2, crownY, crownZ)]).toBe(BlockType.AIR)
  })

  test('does not place apples on winter trees', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8
    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.SNOW_LEAVES

    const placed = placeAppleFruits(chunk, crownX, crownY, crownZ, 120, 240, true, {
      chance: 1,
      maxApples: 6,
    })

    expect(placed).toBe(0)
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.AIR)
  })

  test('places orange blocks below regular tree leaves when requested', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES

    const placed = placeOrangeFruits(chunk, crownX, crownY, crownZ, 120, 240, false, {
      chance: 1,
      maxOranges: 2,
    })

    expect(placed).toBe(2)
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.ORANGE)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.ORANGE)
  })

  test('can select orange trees without mixing apples onto the same tree', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ - 1)] = BlockType.LEAVES

    const placed = placeTreeFruits(chunk, crownX, crownY, crownZ, 5, 8, false, {
      appleChance: 0,
      orangeChance: 1,
      maxApples: 4,
      maxOranges: 3,
    })

    expect(placed).toEqual({ fruitType: BlockType.ORANGE, count: 3 })
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.ORANGE)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.ORANGE)
    expect(chunk[index(crownX, crownY - 1, crownZ - 1)]).toBe(BlockType.ORANGE)
  })

  test('places peach blocks below regular tree leaves when requested', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES

    const placed = placePeachFruits(chunk, crownX, crownY, crownZ, 120, 240, false, {
      chance: 1,
      maxPeaches: 2,
    })

    expect(placed).toBe(2)
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.PEACH)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.PEACH)
  })

  test('can select peach trees without mixing other fruit onto the same tree', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ - 1)] = BlockType.LEAVES

    const placed = placeTreeFruits(chunk, crownX, crownY, crownZ, 5, 8, false, {
      appleChance: 0,
      orangeChance: 0,
      peachChance: 1,
      maxApples: 4,
      maxOranges: 3,
      maxPeaches: 3,
    })

    expect(placed).toEqual({ fruitType: BlockType.PEACH, count: 3 })
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.PEACH)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.PEACH)
    expect(chunk[index(crownX, crownY - 1, crownZ - 1)]).toBe(BlockType.PEACH)
  })

  test('places banana blocks below regular tree leaves when requested', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES

    const placed = placeBananaFruits(chunk, crownX, crownY, crownZ, 120, 240, false, {
      chance: 1,
      maxBananas: 2,
    })

    expect(placed).toBe(2)
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.BANANA)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.BANANA)
  })

  test('can select banana trees without mixing other fruit onto the same tree', () => {
    const chunk = createChunk()
    const crownX = 8
    const crownY = 24
    const crownZ = 8

    chunk[index(crownX - 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX + 1, crownY, crownZ)] = BlockType.LEAVES
    chunk[index(crownX, crownY, crownZ - 1)] = BlockType.LEAVES

    const placed = placeTreeFruits(chunk, crownX, crownY, crownZ, 5, 8, false, {
      appleChance: 0,
      orangeChance: 0,
      peachChance: 0,
      bananaChance: 1,
      maxApples: 4,
      maxOranges: 3,
      maxPeaches: 3,
      maxBananas: 3,
    })

    expect(placed).toEqual({ fruitType: BlockType.BANANA, count: 3 })
    expect(chunk[index(crownX - 1, crownY - 1, crownZ)]).toBe(BlockType.BANANA)
    expect(chunk[index(crownX + 1, crownY - 1, crownZ)]).toBe(BlockType.BANANA)
    expect(chunk[index(crownX, crownY - 1, crownZ - 1)]).toBe(BlockType.BANANA)
  })
})
