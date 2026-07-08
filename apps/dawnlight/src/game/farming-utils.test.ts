import { BlockType } from '../types'
import { advanceCropGrowth, getHarvestDrops, resolveFarmingPlacement } from './farming-utils'

declare const describe: any
declare const test: any
declare const expect: any

describe('farming utils', () => {
  test('wooden hoe tills grass or dirt into wet or dry farmland without being consumed', () => {
    expect(
      resolveFarmingPlacement(BlockType.GRASS, { type: BlockType.WOODEN_HOE, count: 1 }, BlockType.AIR, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'till',
      blockType: BlockType.FARMLAND_WET,
      consumeSelected: false,
    })

    expect(
      resolveFarmingPlacement(BlockType.DIRT, { type: BlockType.WOODEN_HOE, count: 1 }, BlockType.AIR, {
        hasNearbyWater: false,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'till',
      blockType: BlockType.FARMLAND_DRY,
      consumeSelected: false,
    })
  })

  test('seeds plant first-stage crops on suitable farmland only when the block above is empty', () => {
    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_WET, { type: BlockType.WHEAT_SEEDS, count: 2 }, BlockType.AIR, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'plant',
      blockType: BlockType.WHEAT_CROP_1,
      consumeSelected: true,
    })

    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_DRY, { type: BlockType.RICE_SEEDS, count: 2 }, BlockType.AIR, {
        hasNearbyWater: false,
        isRaining: true,
      }),
    ).toEqual({ kind: 'none' })

    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_WET, { type: BlockType.RICE_SEEDS, count: 2 }, BlockType.AIR, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'plant',
      blockType: BlockType.RICE_CROP_1,
      consumeSelected: true,
    })

    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_WET, { type: BlockType.WHEAT_SEEDS, count: 1 }, BlockType.BUSH, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({ kind: 'none' })
  })

  test('wooden buckets fill from water and water buckets wet dry farmland', () => {
    expect(
      resolveFarmingPlacement(BlockType.WATER, { type: BlockType.WOODEN_BUCKET, count: 1 }, BlockType.AIR, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'transform-selected',
      selectedType: BlockType.WATER_BUCKET,
      consumeSelected: true,
    })

    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_DRY, { type: BlockType.WATER_BUCKET, count: 1 }, BlockType.AIR, {
        hasNearbyWater: false,
        isRaining: false,
      }),
    ).toEqual({
      kind: 'water',
      blockType: BlockType.FARMLAND_WET,
      selectedType: BlockType.WOODEN_BUCKET,
      consumeSelected: true,
    })

    expect(
      resolveFarmingPlacement(BlockType.FARMLAND_WET, { type: BlockType.WATER_BUCKET, count: 1 }, BlockType.AIR, {
        hasNearbyWater: true,
        isRaining: false,
      }),
    ).toEqual({ kind: 'none' })
  })

  test('wild and grown crops drop usable food ingredients and seeds', () => {
    expect(getHarvestDrops(BlockType.WILD_WHEAT)).toEqual([
      { type: BlockType.WHEAT, count: 1 },
      { type: BlockType.WHEAT_SEEDS, count: 1 },
    ])
    expect(getHarvestDrops(BlockType.RICE_CROP_1)).toEqual([{ type: BlockType.RICE_SEEDS, count: 1 }])
    expect(getHarvestDrops(BlockType.WHEAT_CROP_3)).toEqual([{ type: BlockType.WHEAT_SEEDS, count: 1 }])
    expect(getHarvestDrops(BlockType.RICE_CROP_3)).toEqual([{ type: BlockType.RICE_SEEDS, count: 1 }])
    expect(getHarvestDrops(BlockType.WHEAT_CROP_4)).toEqual([
      { type: BlockType.WHEAT, count: 2 },
      { type: BlockType.WHEAT_SEEDS, count: 2 },
    ])
    expect(getHarvestDrops(BlockType.RICE_CROP_4)).toEqual([
      { type: BlockType.RICE, count: 2 },
      { type: BlockType.RICE_SEEDS, count: 2 },
    ])
  })

  test('crop growth advances one stage and keeps mature crops stable', () => {
    expect(advanceCropGrowth(BlockType.WHEAT_CROP_1)).toBe(BlockType.WHEAT_CROP_2)
    expect(advanceCropGrowth(BlockType.WHEAT_CROP_2)).toBe(BlockType.WHEAT_CROP_3)
    expect(advanceCropGrowth(BlockType.WHEAT_CROP_3)).toBe(BlockType.WHEAT_CROP_4)
    expect(advanceCropGrowth(BlockType.WHEAT_CROP_4)).toBe(BlockType.WHEAT_CROP_4)
    expect(advanceCropGrowth(BlockType.RICE_CROP_1)).toBe(BlockType.RICE_CROP_2)
    expect(advanceCropGrowth(BlockType.RICE_CROP_2)).toBe(BlockType.RICE_CROP_3)
    expect(advanceCropGrowth(BlockType.RICE_CROP_3)).toBe(BlockType.RICE_CROP_4)
    expect(advanceCropGrowth(BlockType.RICE_CROP_4)).toBe(BlockType.RICE_CROP_4)
    expect(advanceCropGrowth(BlockType.GRASS)).toBe(BlockType.GRASS)
  })
})
