import { BlockType } from '../../types'
import { FARMING_MODEL_BLOCKS, getFarmingModelConfig, isFarmingModelBlock, isFarmingWorldCropBlock } from './farming-model-config'

declare const describe: any
declare const test: any
declare const expect: any

describe('farming model config', () => {
  test('maps every non-square farming item or crop to a Meshy GLB asset', () => {
    const expectedModelBlocks = [
      BlockType.WILD_WHEAT,
      BlockType.WILD_RICE,
      BlockType.WHEAT_CROP_1,
      BlockType.WHEAT_CROP_2,
      BlockType.WHEAT_CROP_3,
      BlockType.WHEAT_CROP_4,
      BlockType.RICE_CROP_1,
      BlockType.RICE_CROP_2,
      BlockType.RICE_CROP_3,
      BlockType.RICE_CROP_4,
      BlockType.WHEAT_SEEDS,
      BlockType.RICE_SEEDS,
      BlockType.WHEAT,
      BlockType.RICE,
      BlockType.WOODEN_HOE,
      BlockType.BREAD,
      BlockType.RICE_BOWL,
      BlockType.WOODEN_BUCKET,
      BlockType.WATER_BUCKET,
      BlockType.FLOUR,
      BlockType.DOUGH,
    ]

    expect(FARMING_MODEL_BLOCKS).toEqual(expectedModelBlocks)
    for (const block of expectedModelBlocks) {
      const config = getFarmingModelConfig(block)

      expect(isFarmingModelBlock(block)).toBe(true)
      expect(config?.url).toMatch(/^\/glb\/meshy\/.+\/.+\.glb$/)
      expect(config?.scale).toBeGreaterThan(0)
    }
  })

  test('keeps square farmland blocks out of Meshy model ownership', () => {
    expect(isFarmingModelBlock(BlockType.FARMLAND_DRY)).toBe(false)
    expect(isFarmingModelBlock(BlockType.FARMLAND_WET)).toBe(false)
    expect(getFarmingModelConfig(BlockType.FARMLAND_WET)).toBeNull()
  })

  test('distinguishes world crop models from inventory-only farming models', () => {
    expect(isFarmingWorldCropBlock(BlockType.WHEAT_CROP_3)).toBe(true)
    expect(isFarmingWorldCropBlock(BlockType.WHEAT)).toBe(false)
    expect(isFarmingWorldCropBlock(BlockType.BREAD)).toBe(false)
  })

  test('uses yellow harvest-ready tint for mature wheat and rice', () => {
    const matureWheat = getFarmingModelConfig(BlockType.WHEAT_CROP_4)
    const matureRice = getFarmingModelConfig(BlockType.RICE_CROP_4)

    expect(matureWheat?.tint).toBe(0xe8c45a)
    expect(matureRice?.tint).toBe(0xe5d46b)
    expect(matureWheat?.worldScale?.y).toBeGreaterThan(1.45)
    expect(matureRice?.worldScale?.y).toBeGreaterThan(1.55)
  })

  test('uses four visibly distinct Meshy crop stages with denser mature block clusters', () => {
    const wheatStages = [getFarmingModelConfig(BlockType.WHEAT_CROP_1), getFarmingModelConfig(BlockType.WHEAT_CROP_2), getFarmingModelConfig(BlockType.WHEAT_CROP_3), getFarmingModelConfig(BlockType.WHEAT_CROP_4)]
    const riceStages = [getFarmingModelConfig(BlockType.RICE_CROP_1), getFarmingModelConfig(BlockType.RICE_CROP_2), getFarmingModelConfig(BlockType.RICE_CROP_3), getFarmingModelConfig(BlockType.RICE_CROP_4)]

    expect(new Set(wheatStages.map((stage) => stage?.key)).size).toBe(4)
    expect(new Set(riceStages.map((stage) => stage?.key)).size).toBe(4)
    expect(wheatStages.map((stage) => stage?.clusterCount)).toEqual([2, 4, 6, 9])
    expect(riceStages.map((stage) => stage?.clusterCount)).toEqual([2, 4, 6, 9])
    expect(wheatStages.map((stage) => stage?.worldScale?.y)).toEqual([0.52, 0.82, 1.18, 1.55])
    expect(riceStages.map((stage) => stage?.worldScale?.y)).toEqual([0.58, 0.94, 1.28, 1.68])
    expect(wheatStages.map((stage) => stage?.scale)).toEqual([0.3, 0.46, 0.62, 0.82])
    expect(riceStages.map((stage) => stage?.scale)).toEqual([0.32, 0.5, 0.68, 0.9])
  })
})
