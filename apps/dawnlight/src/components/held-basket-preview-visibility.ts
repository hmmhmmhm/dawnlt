import type { InventoryItem } from '../types'

export function shouldRenderHeldBasketPreview(_item: InventoryItem | null): false {
  return false
}
