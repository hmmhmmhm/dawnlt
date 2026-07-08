import { BlockType, type InventoryItem } from '../types'

export type CraftingGrid = [InventoryItem | null, InventoryItem | null, InventoryItem | null, InventoryItem | null]

export interface CraftFromGridResult {
  crafted: boolean
  cursorItem: InventoryItem | null
}

function cloneItem(item: InventoryItem): InventoryItem {
  return {
    type: item.type,
    count: item.count,
    ...(item.storedType !== undefined ? { storedType: item.storedType } : {}),
    ...(item.storedCount !== undefined ? { storedCount: item.storedCount } : {}),
  }
}

function occupiedSlots(grid: CraftingGrid): Array<{ index: number; item: InventoryItem }> {
  return grid.map((item, index) => (item && item.count > 0 ? { index, item } : null)).filter((entry): entry is { index: number; item: InventoryItem } => Boolean(entry))
}

function consumeSlots(grid: CraftingGrid, indices: number[]): void {
  for (const index of indices) {
    const item = grid[index]
    if (!item) continue

    item.count -= 1
    if (item.count <= 0) grid[index] = null
  }
}

function canMergeCraftingOutput(cursorItem: InventoryItem, result: InventoryItem): boolean {
  if (cursorItem.type !== result.type) return false

  if (cursorItem.type === BlockType.BASKET) {
    return cursorItem.storedType === undefined && (cursorItem.storedCount ?? 0) <= 0
  }

  return true
}

export function getCraftingResult(grid: CraftingGrid): InventoryItem | null {
  const occupied = occupiedSlots(grid)

  if (occupied.length === 1 && occupied[0].item.type === BlockType.WOOD) {
    return { type: BlockType.PLANKS, count: 4 }
  }

  if (occupied.length === 4 && occupied.every(({ item }) => item.type === BlockType.PLANKS)) {
    return { type: BlockType.CRAFTING_TABLE, count: 1 }
  }

  if (occupied.length === 3 && occupied.every(({ item }) => item.type === BlockType.PLANKS)) {
    return { type: BlockType.BASKET, count: 1 }
  }

  if (occupied.length === 2 && grid[0]?.type === BlockType.PLANKS && grid[1]?.type === BlockType.PLANKS) {
    return { type: BlockType.WOODEN_HOE, count: 1 }
  }

  if (occupied.length === 2 && grid[0]?.type === BlockType.PLANKS && grid[3]?.type === BlockType.COBBLESTONE) {
    return { type: BlockType.WOODEN_BUCKET, count: 1 }
  }

  if (occupied.length === 1 && occupied[0].item.type === BlockType.WHEAT) {
    return { type: BlockType.FLOUR, count: 1 }
  }

  if (occupied.length === 2 && occupied.every(({ item }) => item.type === BlockType.FLOUR)) {
    return { type: BlockType.DOUGH, count: 1 }
  }

  if (occupied.length === 3 && occupied.every(({ item }) => item.type === BlockType.WHEAT)) {
    return { type: BlockType.BREAD, count: 1 }
  }

  if (occupied.length === 1 && occupied[0].item.type === BlockType.RICE) {
    return { type: BlockType.RICE_BOWL, count: 1 }
  }

  if (occupied.length === 4 && occupied.every(({ item }) => item.type === BlockType.STONE)) {
    return { type: BlockType.COBBLESTONE, count: 4 }
  }

  return null
}

export function craftFromGrid(grid: CraftingGrid, cursorItem: InventoryItem | null, maxStackSize = 64): CraftFromGridResult {
  const result = getCraftingResult(grid)
  if (!result) return { crafted: false, cursorItem }
  if (cursorItem && !canMergeCraftingOutput(cursorItem, result)) return { crafted: false, cursorItem }
  if (cursorItem && cursorItem.count + result.count > maxStackSize) {
    return { crafted: false, cursorItem }
  }

  const occupied = occupiedSlots(grid)
  consumeSlots(
    grid,
    occupied.map(({ index }) => index),
  )

  return {
    crafted: true,
    cursorItem: cursorItem ? { type: cursorItem.type, count: cursorItem.count + result.count } : cloneItem(result),
  }
}

export function returnCraftingItems(grid: CraftingGrid, onReturn: (item: InventoryItem) => void): void {
  for (let index = 0; index < grid.length; index++) {
    const item = grid[index]
    if (!item) continue

    onReturn(cloneItem(item))
    grid[index] = null
  }
}
