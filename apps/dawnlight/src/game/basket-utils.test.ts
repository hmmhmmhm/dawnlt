import { BlockType, type InventoryItem } from '../types'
import { basketItemFromBlockType, basketWorldBlockFromItem, getBasketWorldAppleCount, isBasketWorldBlock } from './basket-utils'

declare const describe: any
declare const test: any
declare const expect: any

describe('basket utils', () => {
  test('maps basket items to world blocks that preserve apple counts', () => {
    const filled: InventoryItem = {
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 3,
    }

    expect(basketWorldBlockFromItem(filled)).toBe(BlockType.BASKET_APPLES_3)
    expect(getBasketWorldAppleCount(BlockType.BASKET_APPLES_3)).toBe(3)
  })

  test('clamps basket world apple counts to four', () => {
    const overfilled: InventoryItem = {
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 99,
    }

    expect(basketWorldBlockFromItem(overfilled)).toBe(BlockType.BASKET_APPLES_4)
    expect(getBasketWorldAppleCount(BlockType.BASKET_APPLES_4)).toBe(4)
  })

  test('converts placed basket blocks back into inventory basket items', () => {
    expect(basketItemFromBlockType(BlockType.BASKET_APPLES_2)).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 2,
    })
    expect(basketItemFromBlockType(BlockType.BASKET)).toEqual({
      type: BlockType.BASKET,
      count: 1,
    })
  })

  test('identifies all basket world block variants', () => {
    expect(isBasketWorldBlock(BlockType.BASKET)).toBe(true)
    expect(isBasketWorldBlock(BlockType.BASKET_APPLES_1)).toBe(true)
    expect(isBasketWorldBlock(BlockType.BASKET_APPLES_4)).toBe(true)
    expect(isBasketWorldBlock(BlockType.APPLE)).toBe(false)
  })
})
