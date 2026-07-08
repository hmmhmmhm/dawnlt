import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import { BlockType } from '../../types'
import { collectFarmingModelPlacements } from './farming-model-placements'

declare const describe: any
declare const test: any
declare const expect: any

function blockIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

describe('farming model placements', () => {
  test('collects crop blocks as Meshy model placements anchored to their world block', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[blockIndex(2, 5, 3)] = BlockType.WHEAT_CROP_3
    chunk[blockIndex(4, 5, 3)] = BlockType.RICE_CROP_2
    chunk[blockIndex(6, 4, 3)] = BlockType.FARMLAND_WET
    chunk[blockIndex(8, 5, 3)] = BlockType.BREAD

    const placements = collectFarmingModelPlacements(new Map([['1,0,2', chunk]]))

    expect(placements.map((placement) => placement.blockType)).toEqual([BlockType.WHEAT_CROP_3, BlockType.RICE_CROP_2])
    expect(placements[0]).toMatchObject({
      id: 'wheat-stage-3:18,5,35',
      modelKey: 'wheat-stage-3',
      position: { x: 18.5, y: 5, z: 35.5 },
    })
    expect(placements[1].position.y).toBe(5)
    expect(placements[1].scale).toBeGreaterThan(0)
  })

  test('limits placement count deterministically', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[blockIndex(1, 4, 1)] = BlockType.WHEAT_CROP_1
    chunk[blockIndex(2, 4, 1)] = BlockType.WHEAT_CROP_2
    chunk[blockIndex(3, 4, 1)] = BlockType.WHEAT_CROP_3

    const placements = collectFarmingModelPlacements(new Map([['0,0,0', chunk]]), 2)

    expect(placements).toHaveLength(2)
    expect(placements.map((placement) => placement.modelKey)).toEqual(['wheat-stage-1', 'wheat-stage-2'])
  })

  test('records denser crop clusters for later growth stages', () => {
    const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    chunk[blockIndex(1, 4, 1)] = BlockType.WHEAT_CROP_1
    chunk[blockIndex(2, 4, 1)] = BlockType.WHEAT_CROP_4

    const placements = collectFarmingModelPlacements(new Map([['0,0,0', chunk]]))

    expect(placements.map((placement) => placement.clusterCount)).toEqual([2, 9])
  })

  test('prioritizes placements near the focus point when limiting model count', () => {
    const farChunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    const nearChunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    farChunk[blockIndex(1, 4, 1)] = BlockType.WHEAT_CROP_3
    nearChunk[blockIndex(1, 4, 1)] = BlockType.RICE_CROP_3

    const placements = collectFarmingModelPlacements(
      new Map([
        ['0,0,0', farChunk],
        ['4,0,4', nearChunk],
      ]),
      1,
      { x: 65, y: 4, z: 65 },
    )

    expect(placements).toHaveLength(1)
    expect(placements[0].blockType).toBe(BlockType.RICE_CROP_3)
  })
})
