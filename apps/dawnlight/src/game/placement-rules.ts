import { BlockType, type InventoryItem } from '../types'
import { basketWorldBlockFromItem } from './basket-utils'
import { isFarmingItemOnly } from './farming-utils'

export function resolvePlaceableBlockType(selectedItem: InventoryItem | null | undefined, fallbackType: BlockType): BlockType | null {
  const itemType = selectedItem?.type ?? fallbackType
  if (itemType === BlockType.APPLE || itemType === BlockType.ORANGE || itemType === BlockType.PEACH || itemType === BlockType.BANANA || isFarmingItemOnly(itemType)) return null
  if (selectedItem?.type === BlockType.BASKET) return basketWorldBlockFromItem(selectedItem)
  return itemType
}
