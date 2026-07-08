import { describe, expect, it } from '@jest/globals'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import { BlockType } from '../../types'
import { collectBasketModelPlacements } from './basket-model-placements'

function index(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

describe('basket model placements', () => {
  it('maps placed basket block variants to GLB basket placements with 0 to 4 apple models', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    const basketBlocks = [BlockType.BASKET, BlockType.BASKET_APPLES_1, BlockType.BASKET_APPLES_2, BlockType.BASKET_APPLES_3, BlockType.BASKET_APPLES_4]

    basketBlocks.forEach((block, offset) => {
      chunk[index(2 + offset, 8, 3)] = block
    })

    const placements = collectBasketModelPlacements(new Map([['1,1,-1', chunk]]), 10)

    expect(placements).toHaveLength(5)
    expect(placements.map((placement) => placement.appleCount)).toEqual([0, 1, 2, 3, 4])
    expect(placements[0]).toMatchObject({
      id: '18,40,-13',
      blockX: 18,
      blockY: 40,
      blockZ: -13,
      appleCount: 0,
    })
    expect(placements[4].appleSlots).toHaveLength(4)
    expect(placements[4].position).toEqual({ x: 22.5, y: 40, z: -12.5 })
    expect(placements[4].appleSlots.map((slot) => slot.scale)).toEqual([0.33, 0.315, 0.3, 0.3])
    expect(placements[4].appleSlots.every((slot) => slot.position.y >= 0.31 && slot.position.y <= 0.39)).toBe(true)
    expect(placements[4].appleSlots[3].rotationY).toBeGreaterThanOrEqual(0)
  })

  it('caps basket placements so dense chunks do not create unlimited models', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        chunk[index(x, 7, z)] = BlockType.BASKET_APPLES_4
      }
    }

    const placements = collectBasketModelPlacements(new Map([['0,1,0', chunk]]), 9)

    expect(placements).toHaveLength(9)
  })
})
