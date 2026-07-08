import { BlockType } from '../types'
import { resolvePlaceableBlockType } from './placement-rules'

declare const describe: any
declare const test: any
declare const expect: any

describe('block placement rules', () => {
  test('does not treat loose fruit as placeable blocks', () => {
    expect(resolvePlaceableBlockType({ type: BlockType.APPLE, count: 3 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType(null, BlockType.APPLE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.ORANGE, count: 2 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType(null, BlockType.ORANGE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.PEACH, count: 2 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType(null, BlockType.PEACH)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.BANANA, count: 2 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType(null, BlockType.BANANA)).toBeNull()
  })

  test('does not treat farming ingredients, food, seeds, or hoe as normal placeable blocks', () => {
    expect(resolvePlaceableBlockType({ type: BlockType.WHEAT_SEEDS, count: 3 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.RICE_SEEDS, count: 3 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.WHEAT, count: 3 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.RICE, count: 3 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.BREAD, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.RICE_BOWL, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.WOODEN_HOE, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.WOODEN_BUCKET, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.WATER_BUCKET, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.FLOUR, count: 1 }, BlockType.STONE)).toBeNull()
    expect(resolvePlaceableBlockType({ type: BlockType.DOUGH, count: 1 }, BlockType.STONE)).toBeNull()
  })

  test('keeps baskets and normal blocks placeable', () => {
    expect(
      resolvePlaceableBlockType(
        {
          type: BlockType.BASKET,
          count: 1,
          storedType: BlockType.APPLE,
          storedCount: 2,
        },
        BlockType.STONE,
      ),
    ).toBe(BlockType.BASKET_APPLES_2)
    expect(resolvePlaceableBlockType({ type: BlockType.STONE, count: 4 }, BlockType.DIRT)).toBe(BlockType.STONE)
    expect(resolvePlaceableBlockType(null, BlockType.DIRT)).toBe(BlockType.DIRT)
  })
})
