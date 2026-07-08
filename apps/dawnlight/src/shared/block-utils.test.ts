import { BlockType } from './block-types'
import { isBlockOpaque, isBlockTransparent, isFoliageBlock, isSolid } from './block-utils'

declare const describe: any
declare const test: any
declare const expect: any

describe('block utils', () => {
  test('treats tree fruit as transparent collectible foliage blocks', () => {
    expect(BlockType.APPLE).toBeDefined()
    expect(isBlockTransparent(BlockType.APPLE)).toBe(true)
    expect(isBlockOpaque(BlockType.APPLE)).toBe(false)
    expect(isSolid(BlockType.APPLE)).toBe(false)
    expect(isFoliageBlock(BlockType.APPLE)).toBe(true)

    expect(BlockType.ORANGE).toBeDefined()
    expect(isBlockTransparent(BlockType.ORANGE)).toBe(true)
    expect(isBlockOpaque(BlockType.ORANGE)).toBe(false)
    expect(isSolid(BlockType.ORANGE)).toBe(false)
    expect(isFoliageBlock(BlockType.ORANGE)).toBe(true)

    expect(BlockType.PEACH).toBeDefined()
    expect(isBlockTransparent(BlockType.PEACH)).toBe(true)
    expect(isBlockOpaque(BlockType.PEACH)).toBe(false)
    expect(isSolid(BlockType.PEACH)).toBe(false)
    expect(isFoliageBlock(BlockType.PEACH)).toBe(true)

    expect(BlockType.BANANA).toBeDefined()
    expect(isBlockTransparent(BlockType.BANANA)).toBe(true)
    expect(isBlockOpaque(BlockType.BANANA)).toBe(false)
    expect(isSolid(BlockType.BANANA)).toBe(false)
    expect(isFoliageBlock(BlockType.BANANA)).toBe(true)
  })

  test('treats placed baskets as transparent non-solid decorations', () => {
    expect(isBlockTransparent(BlockType.BASKET_APPLES_4)).toBe(true)
    expect(isBlockOpaque(BlockType.BASKET_APPLES_4)).toBe(false)
    expect(isSolid(BlockType.BASKET_APPLES_4)).toBe(false)
  })

  test('treats wild and planted crops as transparent non-solid foliage', () => {
    for (const block of [BlockType.WILD_WHEAT, BlockType.WILD_RICE, BlockType.WHEAT_CROP_1, BlockType.WHEAT_CROP_2, BlockType.WHEAT_CROP_3, BlockType.WHEAT_CROP_4, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4]) {
      expect(isBlockTransparent(block)).toBe(true)
      expect(isBlockOpaque(block)).toBe(false)
      expect(isSolid(block)).toBe(false)
      expect(isFoliageBlock(block)).toBe(true)
    }

    expect(isBlockTransparent(BlockType.FARMLAND_WET)).toBe(false)
    expect(isBlockOpaque(BlockType.FARMLAND_WET)).toBe(true)
    expect(isSolid(BlockType.FARMLAND_WET)).toBe(true)
  })
})
