import { BlockType, type InventoryItem } from '../types'

export const BASKET_MAX_APPLES = 4

const basketAppleBlocks: BlockType[] = [BlockType.BASKET, BlockType.BASKET_APPLES_1, BlockType.BASKET_APPLES_2, BlockType.BASKET_APPLES_3, BlockType.BASKET_APPLES_4]

export function clampBasketAppleCount(count: number | undefined): number {
  return Math.max(0, Math.min(BASKET_MAX_APPLES, Math.floor(count ?? 0)))
}

export function isBasketWorldBlock(block: BlockType): boolean {
  return basketAppleBlocks.includes(block)
}

export function getBasketWorldAppleCount(block: BlockType): number {
  const index = basketAppleBlocks.indexOf(block)
  return index >= 0 ? index : 0
}

export function basketWorldBlockFromAppleCount(count: number | undefined): BlockType {
  return basketAppleBlocks[clampBasketAppleCount(count)]
}

export function getBasketItemAppleCount(item: InventoryItem | null): number {
  if (!item || item.type !== BlockType.BASKET || item.storedType !== BlockType.APPLE) return 0
  return clampBasketAppleCount(item.storedCount)
}

export function basketWorldBlockFromItem(item: InventoryItem): BlockType {
  return basketWorldBlockFromAppleCount(getBasketItemAppleCount(item))
}

export function basketItemFromBlockType(block: BlockType): InventoryItem {
  const appleCount = getBasketWorldAppleCount(block)
  if (appleCount <= 0) return { type: BlockType.BASKET, count: 1 }

  return {
    type: BlockType.BASKET,
    count: 1,
    storedType: BlockType.APPLE,
    storedCount: appleCount,
  }
}
