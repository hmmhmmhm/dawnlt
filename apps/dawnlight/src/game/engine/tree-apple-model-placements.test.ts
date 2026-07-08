import { describe, expect, it } from '@jest/globals'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import { BlockType } from '../../types'
import { collectTreeFruitModelPlacements } from './tree-fruit-model-placements'

function index(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

describe('tree apple model placements', () => {
  it('collects deterministic GLB placements for apple blocks in loaded 3D chunks', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[index(3, 10, 4)] = BlockType.APPLE
    chunk[index(8, 11, 9)] = BlockType.APPLE
    chunk[index(1, 2, 1)] = BlockType.LEAVES

    const chunks3D = new Map<string, Uint8Array>([['2,1,-1', chunk]])

    const placements = collectTreeFruitModelPlacements(chunks3D, 10)

    expect(placements).toHaveLength(2)
    expect(placements[0]).toMatchObject({
      id: 'apple:35,42,-12',
      blockX: 35,
      blockY: 42,
      blockZ: -12,
    })
    expect(placements[1]).toMatchObject({
      id: 'apple:40,43,-7',
      blockX: 40,
      blockY: 43,
      blockZ: -7,
    })
    expect(placements[0].position.x).toBeGreaterThan(35.25)
    expect(placements[0].position.x).toBeLessThan(35.75)
    expect(placements[0].position.y).toBeGreaterThan(42.15)
    expect(placements[0].position.y).toBeLessThan(42.65)
    expect(placements[0].position.z).toBeGreaterThan(-11.75)
    expect(placements[0].position.z).toBeLessThan(-11.25)
    expect(placements[0].scale).toBeGreaterThanOrEqual(0.36)
    expect(placements[0].scale).toBeLessThanOrEqual(0.51)
  })

  it('collects orange GLB placements separately from apple models', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[index(3, 10, 4)] = BlockType.APPLE
    chunk[index(8, 11, 9)] = BlockType.ORANGE
    chunk[index(5, 12, 10)] = BlockType.PEACH
    chunk[index(7, 13, 11)] = BlockType.BANANA

    const placements = collectTreeFruitModelPlacements(new Map([['2,1,-1', chunk]]), 10)

    expect(placements).toHaveLength(4)
    expect(placements[0]).toMatchObject({ fruitType: BlockType.APPLE, modelKey: 'apple' })
    expect(placements[1]).toMatchObject({ fruitType: BlockType.ORANGE, modelKey: 'orange' })
    expect(placements[2]).toMatchObject({ fruitType: BlockType.PEACH, modelKey: 'peach' })
    expect(placements[3]).toMatchObject({ fruitType: BlockType.BANANA, modelKey: 'banana' })
    expect(placements[3].scale).toBeGreaterThanOrEqual(0.36)
    expect(placements[3].scale).toBeLessThanOrEqual(0.51)
  })

  it('caps placements so dense apple chunks do not create unlimited models', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        chunk[index(x, 12, z)] = BlockType.APPLE
      }
    }

    const placements = collectTreeFruitModelPlacements(new Map([['0,1,0', chunk]]), 8)

    expect(placements).toHaveLength(8)
  })

  it('offsets visible apple models toward leaf sides and away from trunks', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[index(3, 10, 4)] = BlockType.APPLE
    chunk[index(2, 10, 4)] = BlockType.LEAVES
    chunk[index(2, 11, 4)] = BlockType.LEAVES
    chunk[index(4, 10, 4)] = BlockType.WOOD
    chunk[index(4, 11, 4)] = BlockType.WOOD

    const [placement] = collectTreeFruitModelPlacements(new Map([['2,1,-1', chunk]]), 10)

    expect(placement).toMatchObject({
      id: 'apple:35,42,-12',
      blockX: 35,
      blockY: 42,
      blockZ: -12,
    })
    expect(placement.position.x).toBeLessThan(35.35)
    expect(Math.abs(placement.position.z - -11.5)).toBeLessThan(0.18)
  })
})
