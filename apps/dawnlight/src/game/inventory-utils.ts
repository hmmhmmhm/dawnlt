import { BlockType, type Inventory, type InventoryItem } from '../types'
import { BASKET_MAX_APPLES, basketItemFromBlockType, clampBasketAppleCount, getBasketItemAppleCount, isBasketWorldBlock } from './basket-utils'

export interface AddItemResult {
  added: number
  remaining: number
}

export type InventorySlotArea = 'hotbar' | 'slots'

export interface InventorySlotRef {
  area: InventorySlotArea
  index: number
}

export interface CursorClickResult {
  cursorItem: InventoryItem | null
  changed: boolean
}

export interface MoveInventoryResult {
  moved: number
  remaining: number
}

export const BASKET_APPLE_CAPACITY = BASKET_MAX_APPLES

export function cloneInventoryItem(item: InventoryItem | null): InventoryItem | null {
  if (!item) return null

  return {
    type: item.type,
    count: item.count,
    ...(item.storedType !== undefined ? { storedType: item.storedType } : {}),
    ...(item.storedCount !== undefined ? { storedCount: item.storedCount } : {}),
  }
}

function basketAppleCount(item: InventoryItem): number {
  return getBasketItemAppleCount(item)
}

function hasBasketContents(item: InventoryItem): boolean {
  return item.type === BlockType.BASKET && basketAppleCount(item) > 0
}

function canStackItems(a: InventoryItem, b: InventoryItem): boolean {
  if (a.type !== b.type) return false
  if (a.type !== BlockType.BASKET) return true

  return !hasBasketContents(a) && !hasBasketContents(b)
}

function setBasketAppleCount(item: InventoryItem, count: number): void {
  const nextCount = clampBasketAppleCount(count)
  if (nextCount <= 0) {
    delete item.storedType
    delete item.storedCount
    return
  }

  item.storedType = BlockType.APPLE
  item.storedCount = nextCount
}

function tryStoreApplesInBasket(items: (InventoryItem | null)[], index: number, cursorItem: InventoryItem, amountLimit = Infinity): CursorClickResult | null {
  const slotItem = items[index] ?? null
  if (!slotItem) return null

  if (slotItem.type === BlockType.BASKET && slotItem.count === 1 && cursorItem.type === BlockType.APPLE) {
    const currentCount = basketAppleCount(slotItem)
    const capacity = BASKET_APPLE_CAPACITY - currentCount
    if (capacity <= 0) return { cursorItem, changed: false }

    const moved = Math.min(capacity, cursorItem.count, amountLimit)
    if (moved <= 0) return { cursorItem, changed: false }

    setBasketAppleCount(slotItem, currentCount + moved)
    const remaining = cursorItem.count - moved
    return {
      cursorItem: remaining > 0 ? { type: cursorItem.type, count: remaining } : null,
      changed: true,
    }
  }

  if (cursorItem.type === BlockType.BASKET && cursorItem.count === 1 && slotItem.type === BlockType.APPLE) {
    const currentCount = basketAppleCount(cursorItem)
    const capacity = BASKET_APPLE_CAPACITY - currentCount
    if (capacity <= 0) return { cursorItem, changed: false }

    const moved = Math.min(capacity, slotItem.count, amountLimit)
    if (moved <= 0) return { cursorItem, changed: false }

    const nextCursor = cloneInventoryItem(cursorItem)!
    setBasketAppleCount(nextCursor, currentCount + moved)
    slotItem.count -= moved
    if (slotItem.count <= 0) items[index] = null

    return { cursorItem: nextCursor, changed: true }
  }

  return null
}

function getSlotList(inventory: Inventory, ref: InventorySlotRef): (InventoryItem | null)[] {
  return ref.area === 'hotbar' ? inventory.hotbar : inventory.slots
}

export function getInventorySlot(inventory: Inventory, ref: InventorySlotRef): InventoryItem | null {
  return getSlotList(inventory, ref)[ref.index] ?? null
}

export function setInventorySlot(inventory: Inventory, ref: InventorySlotRef, item: InventoryItem | null): void {
  getSlotList(inventory, ref)[ref.index] = cloneInventoryItem(item)
}

function addToStacks(items: (InventoryItem | null)[], sourceItem: InventoryItem, maxStackSize: number): number {
  let remaining = sourceItem.count
  for (const item of items) {
    if (remaining <= 0) break
    if (!item || !canStackItems(item, sourceItem) || item.count >= maxStackSize) continue

    const amount = Math.min(maxStackSize - item.count, remaining)
    item.count += amount
    remaining -= amount
  }
  return remaining
}

function addToEmptySlots(items: (InventoryItem | null)[], sourceItem: InventoryItem, maxStackSize: number): number {
  let remaining = sourceItem.count
  for (let i = 0; i < items.length; i++) {
    if (remaining <= 0) break
    if (items[i]) continue

    const sourceHasContents = sourceItem.type === BlockType.BASKET && hasBasketContents(sourceItem)
    const amount = sourceHasContents ? 1 : Math.min(maxStackSize, remaining)
    items[i] = { ...cloneInventoryItem(sourceItem)!, count: amount }
    remaining -= amount
  }
  return remaining
}

export function addItemToInventory(inventory: Inventory, type: BlockType, count: number, maxStackSize = 64): AddItemResult {
  let remaining = Math.max(0, Math.floor(count))
  const startingCount = remaining
  const sourceItem = isBasketWorldBlock(type) ? { ...basketItemFromBlockType(type), count: remaining } : { type, count: remaining }

  remaining = addToStacks(inventory.hotbar, { ...sourceItem, count: remaining }, maxStackSize)
  remaining = addToStacks(inventory.slots, { ...sourceItem, count: remaining }, maxStackSize)
  remaining = addToEmptySlots(inventory.hotbar, { ...sourceItem, count: remaining }, maxStackSize)
  remaining = addToEmptySlots(inventory.slots, { ...sourceItem, count: remaining }, maxStackSize)

  return {
    added: startingCount - remaining,
    remaining,
  }
}

export function clickItemSlot(items: (InventoryItem | null)[], index: number, cursorItem: InventoryItem | null, maxStackSize = 64): CursorClickResult {
  const slotItem = items[index] ?? null

  if (!cursorItem) {
    if (!slotItem) return { cursorItem: null, changed: false }
    items[index] = null
    return { cursorItem: cloneInventoryItem(slotItem), changed: true }
  }

  if (!slotItem) {
    items[index] = cloneInventoryItem(cursorItem)
    return { cursorItem: null, changed: true }
  }

  const basketResult = tryStoreApplesInBasket(items, index, cursorItem)
  if (basketResult) return basketResult

  if (canStackItems(slotItem, cursorItem) && slotItem.count < maxStackSize) {
    const moved = Math.min(maxStackSize - slotItem.count, cursorItem.count)
    slotItem.count += moved
    const remaining = cursorItem.count - moved
    return {
      cursorItem: remaining > 0 ? { ...cloneInventoryItem(cursorItem)!, count: remaining } : null,
      changed: moved > 0,
    }
  }

  items[index] = cloneInventoryItem(cursorItem)
  return { cursorItem: cloneInventoryItem(slotItem), changed: true }
}

export function clickInventorySlot(inventory: Inventory, ref: InventorySlotRef, cursorItem: InventoryItem | null, maxStackSize = 64): CursorClickResult {
  return clickItemSlot(getSlotList(inventory, ref), ref.index, cursorItem, maxStackSize)
}

export function secondaryClickItemSlot(items: (InventoryItem | null)[], index: number, cursorItem: InventoryItem | null, maxStackSize = 64): CursorClickResult {
  const slotItem = items[index] ?? null

  if (!cursorItem) {
    if (!slotItem) return { cursorItem: null, changed: false }

    if (slotItem.type === BlockType.BASKET && basketAppleCount(slotItem) > 0) {
      setBasketAppleCount(slotItem, basketAppleCount(slotItem) - 1)
      return { cursorItem: { type: BlockType.APPLE, count: 1 }, changed: true }
    }

    const taken = Math.ceil(slotItem.count / 2)
    slotItem.count -= taken
    if (slotItem.count <= 0) items[index] = null
    return { cursorItem: { ...cloneInventoryItem(slotItem)!, count: taken }, changed: true }
  }

  const basketResult = tryStoreApplesInBasket(items, index, cursorItem, 1)
  if (basketResult) return basketResult

  if (!slotItem) {
    items[index] = { ...cloneInventoryItem(cursorItem)!, count: 1 }
  } else if (canStackItems(slotItem, cursorItem) && slotItem.count < maxStackSize) {
    slotItem.count += 1
  } else {
    return { cursorItem, changed: false }
  }

  const remaining = cursorItem.count - 1
  return {
    cursorItem: remaining > 0 ? { type: cursorItem.type, count: remaining } : null,
    changed: true,
  }
}

export function secondaryClickInventorySlot(inventory: Inventory, ref: InventorySlotRef, cursorItem: InventoryItem | null, maxStackSize = 64): CursorClickResult {
  return secondaryClickItemSlot(getSlotList(inventory, ref), ref.index, cursorItem, maxStackSize)
}

export function moveInventorySlot(inventory: Inventory, from: InventorySlotRef, to: InventorySlotRef, maxStackSize = 64): MoveInventoryResult {
  if (from.area === to.area && from.index === to.index) return { moved: 0, remaining: 0 }

  const fromItem = getInventorySlot(inventory, from)
  const toItem = getInventorySlot(inventory, to)
  if (!fromItem) return { moved: 0, remaining: 0 }

  if (!toItem) {
    setInventorySlot(inventory, to, fromItem)
    setInventorySlot(inventory, from, null)
    return { moved: fromItem.count, remaining: 0 }
  }

  if (canStackItems(fromItem, toItem) && toItem.count < maxStackSize) {
    const moved = Math.min(maxStackSize - toItem.count, fromItem.count)
    toItem.count += moved
    fromItem.count -= moved
    if (fromItem.count <= 0) setInventorySlot(inventory, from, null)
    return { moved, remaining: Math.max(0, fromItem.count) }
  }

  setInventorySlot(inventory, from, toItem)
  setInventorySlot(inventory, to, fromItem)
  return { moved: fromItem.count, remaining: 0 }
}

export function removeInventoryItem(inventory: Inventory, ref: InventorySlotRef, count: number): InventoryItem | null {
  const slotItem = getInventorySlot(inventory, ref)
  if (!slotItem) return null

  const removeCount = Math.min(slotItem.count, Math.max(0, Math.floor(count)))
  if (removeCount <= 0) return null

  slotItem.count -= removeCount
  if (slotItem.count <= 0) setInventorySlot(inventory, ref, null)

  return { ...cloneInventoryItem(slotItem)!, count: removeCount }
}
