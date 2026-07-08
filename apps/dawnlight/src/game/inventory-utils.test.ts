import { BlockType, type Inventory } from '../types'
import { addItemToInventory, BASKET_APPLE_CAPACITY, clickInventorySlot, clickItemSlot, moveInventorySlot, removeInventoryItem, secondaryClickItemSlot } from './inventory-utils'

declare const describe: any
declare const test: any
declare const expect: any

function createInventory(): Inventory {
  return {
    hotbar: new Array(9).fill(null),
    slots: new Array(36).fill(null),
  }
}

describe('inventory utils', () => {
  test('stacks picked up blocks into existing hotbar stack first', () => {
    const inventory = createInventory()
    inventory.hotbar[0] = { type: BlockType.DIRT, count: 63 }

    const result = addItemToInventory(inventory, BlockType.DIRT, 3)

    expect(result).toEqual({ added: 3, remaining: 0 })
    expect(inventory.hotbar[0]).toEqual({ type: BlockType.DIRT, count: 64 })
    expect(inventory.hotbar[1]).toEqual({ type: BlockType.DIRT, count: 2 })
  })

  test('uses inventory slots after hotbar fills', () => {
    const inventory = createInventory()
    for (let i = 0; i < inventory.hotbar.length; i++) {
      inventory.hotbar[i] = { type: BlockType.STONE, count: 64 }
    }

    const result = addItemToInventory(inventory, BlockType.WOOD, 5)

    expect(result).toEqual({ added: 5, remaining: 0 })
    expect(inventory.slots[0]).toEqual({ type: BlockType.WOOD, count: 5 })
  })

  test('leaves remaining count when all stacks are full', () => {
    const inventory = createInventory()
    for (let i = 0; i < inventory.hotbar.length; i++) {
      inventory.hotbar[i] = { type: BlockType.DIRT, count: 64 }
    }
    for (let i = 0; i < inventory.slots.length; i++) {
      inventory.slots[i] = { type: BlockType.STONE, count: 64 }
    }

    const result = addItemToInventory(inventory, BlockType.WOOD, 4)

    expect(result).toEqual({ added: 0, remaining: 4 })
  })

  test('picks up and places an item stack through the cursor', () => {
    const inventory = createInventory()
    inventory.hotbar[0] = { type: BlockType.DIRT, count: 12 }

    const picked = clickInventorySlot(inventory, { area: 'hotbar', index: 0 }, null)
    expect(picked.cursorItem).toEqual({ type: BlockType.DIRT, count: 12 })
    expect(inventory.hotbar[0]).toBeNull()

    const placed = clickInventorySlot(inventory, { area: 'slots', index: 3 }, picked.cursorItem)
    expect(placed.cursorItem).toBeNull()
    expect(inventory.slots[3]).toEqual({ type: BlockType.DIRT, count: 12 })
  })

  test('merges cursor item into an existing stack up to the max stack size', () => {
    const inventory = createInventory()
    inventory.slots[0] = { type: BlockType.STONE, count: 60 }

    const result = clickInventorySlot(inventory, { area: 'slots', index: 0 }, { type: BlockType.STONE, count: 8 })

    expect(inventory.slots[0]).toEqual({ type: BlockType.STONE, count: 64 })
    expect(result.cursorItem).toEqual({ type: BlockType.STONE, count: 4 })
  })

  test('swaps cursor item with a different slot item', () => {
    const inventory = createInventory()
    inventory.hotbar[2] = { type: BlockType.WOOD, count: 5 }

    const result = clickInventorySlot(inventory, { area: 'hotbar', index: 2 }, { type: BlockType.SAND, count: 9 })

    expect(inventory.hotbar[2]).toEqual({ type: BlockType.SAND, count: 9 })
    expect(result.cursorItem).toEqual({ type: BlockType.WOOD, count: 5 })
  })

  test('stores cursor apples in a basket slot', () => {
    const inventory = createInventory()
    inventory.slots[0] = { type: BlockType.BASKET, count: 1 }

    const result = clickInventorySlot(inventory, { area: 'slots', index: 0 }, { type: BlockType.APPLE, count: 5 })

    expect(result).toEqual({ cursorItem: { type: BlockType.APPLE, count: 1 }, changed: true })
    expect(inventory.slots[0]).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 4,
    })
  })

  test('leaves excess apples on the cursor when a basket reaches capacity', () => {
    const inventory = createInventory()
    inventory.slots[0] = {
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: BASKET_APPLE_CAPACITY - 2,
    }

    const result = clickInventorySlot(inventory, { area: 'slots', index: 0 }, { type: BlockType.APPLE, count: 5 })

    expect(result.cursorItem).toEqual({ type: BlockType.APPLE, count: 3 })
    expect(inventory.slots[0]).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: BASKET_APPLE_CAPACITY,
    })
  })

  test('limits baskets to four apples', () => {
    expect(BASKET_APPLE_CAPACITY).toBe(4)
  })

  test('does not merge baskets with different apple contents', () => {
    const inventory = createInventory()
    inventory.slots[0] = { type: BlockType.BASKET, count: 1 }

    const result = clickInventorySlot(inventory, { area: 'slots', index: 0 }, { type: BlockType.BASKET, count: 1, storedType: BlockType.APPLE, storedCount: 2 })

    expect(inventory.slots[0]).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 2,
    })
    expect(result.cursorItem).toEqual({ type: BlockType.BASKET, count: 1 })
  })

  test('secondary click pulls one apple out of a filled basket', () => {
    const items = new Array(4).fill(null)
    items[0] = { type: BlockType.BASKET, count: 1, storedType: BlockType.APPLE, storedCount: 2 }

    const result = secondaryClickItemSlot(items, 0, null)

    expect(result).toEqual({ cursorItem: { type: BlockType.APPLE, count: 1 }, changed: true })
    expect(items[0]).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 1,
    })
  })

  test('clicks a generic item slot with the same cursor behavior', () => {
    const items = new Array(4).fill(null)
    items[1] = { type: BlockType.WOOD, count: 3 }

    const picked = clickItemSlot(items, 1, null)
    expect(picked.cursorItem).toEqual({ type: BlockType.WOOD, count: 3 })
    expect(items[1]).toBeNull()

    const placed = clickItemSlot(items, 2, picked.cursorItem)
    expect(placed.cursorItem).toBeNull()
    expect(items[2]).toEqual({ type: BlockType.WOOD, count: 3 })
  })

  test('secondary click places one cursor item into empty or matching slots', () => {
    const items = new Array(4).fill(null)
    let cursor = { type: BlockType.PLANKS, count: 4 }

    let result = secondaryClickItemSlot(items, 0, cursor)
    cursor = result.cursorItem!
    result = secondaryClickItemSlot(items, 1, cursor)

    expect(result.cursorItem).toEqual({ type: BlockType.PLANKS, count: 2 })
    expect(items[0]).toEqual({ type: BlockType.PLANKS, count: 1 })
    expect(items[1]).toEqual({ type: BlockType.PLANKS, count: 1 })
  })

  test('secondary click picks up half of a slot stack when cursor is empty', () => {
    const items = new Array(4).fill(null)
    items[0] = { type: BlockType.STONE, count: 5 }

    const result = secondaryClickItemSlot(items, 0, null)

    expect(result.cursorItem).toEqual({ type: BlockType.STONE, count: 3 })
    expect(items[0]).toEqual({ type: BlockType.STONE, count: 2 })
  })

  test('moves one slot into another with merge behavior', () => {
    const inventory = createInventory()
    inventory.hotbar[0] = { type: BlockType.DIRT, count: 8 }
    inventory.slots[0] = { type: BlockType.DIRT, count: 60 }

    const result = moveInventorySlot(inventory, { area: 'hotbar', index: 0 }, { area: 'slots', index: 0 })

    expect(result).toEqual({ moved: 4, remaining: 4 })
    expect(inventory.slots[0]).toEqual({ type: BlockType.DIRT, count: 64 })
    expect(inventory.hotbar[0]).toEqual({ type: BlockType.DIRT, count: 4 })
  })

  test('removes a single item or a full stack from a slot', () => {
    const inventory = createInventory()
    inventory.hotbar[0] = { type: BlockType.DIAMOND_ORE, count: 3 }

    expect(removeInventoryItem(inventory, { area: 'hotbar', index: 0 }, 1)).toEqual({
      type: BlockType.DIAMOND_ORE,
      count: 1,
    })
    expect(inventory.hotbar[0]).toEqual({ type: BlockType.DIAMOND_ORE, count: 2 })

    expect(removeInventoryItem(inventory, { area: 'hotbar', index: 0 }, Infinity)).toEqual({
      type: BlockType.DIAMOND_ORE,
      count: 2,
    })
    expect(inventory.hotbar[0]).toBeNull()
  })
})
