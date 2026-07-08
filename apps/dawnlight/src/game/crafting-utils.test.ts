import { BlockType, type InventoryItem } from '../types'
import { type CraftingGrid, craftFromGrid, getCraftingResult, returnCraftingItems } from './crafting-utils'

declare const describe: any
declare const test: any
declare const expect: any

function emptyGrid(): CraftingGrid {
  return [null, null, null, null]
}

describe('crafting utils', () => {
  test('crafts planks from a single wood block in any 2x2 slot', () => {
    const grid = emptyGrid()
    grid[2] = { type: BlockType.WOOD, count: 3 }

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.PLANKS,
      count: 4,
    })
  })

  test('crafts a crafting table from four plank items', () => {
    const grid: CraftingGrid = [
      { type: BlockType.PLANKS, count: 1 },
      { type: BlockType.PLANKS, count: 1 },
      { type: BlockType.PLANKS, count: 1 },
      { type: BlockType.PLANKS, count: 1 },
    ]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.CRAFTING_TABLE,
      count: 1,
    })
  })

  test('crafts a basket from three plank items', () => {
    const grid: CraftingGrid = [{ type: BlockType.PLANKS, count: 1 }, null, { type: BlockType.PLANKS, count: 1 }, { type: BlockType.PLANKS, count: 1 }]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.BASKET,
      count: 1,
    })
  })

  test('crafts a wooden hoe from two plank items across the top row', () => {
    const grid: CraftingGrid = [{ type: BlockType.PLANKS, count: 1 }, { type: BlockType.PLANKS, count: 1 }, null, null]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.WOODEN_HOE,
      count: 1,
    })
  })

  test('crafts a wooden bucket from planks and cobblestone bands', () => {
    const grid: CraftingGrid = [{ type: BlockType.PLANKS, count: 1 }, null, null, { type: BlockType.COBBLESTONE, count: 1 }]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.WOODEN_BUCKET,
      count: 1,
    })
  })

  test('crafts bread from three wheat items', () => {
    const grid: CraftingGrid = [{ type: BlockType.WHEAT, count: 1 }, null, { type: BlockType.WHEAT, count: 1 }, { type: BlockType.WHEAT, count: 1 }]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.BREAD,
      count: 1,
    })
  })

  test('crafts flour and dough as intermediate wheat foods', () => {
    const flourGrid = emptyGrid()
    flourGrid[1] = { type: BlockType.WHEAT, count: 1 }

    expect(getCraftingResult(flourGrid)).toEqual({
      type: BlockType.FLOUR,
      count: 1,
    })

    const doughGrid: CraftingGrid = [{ type: BlockType.FLOUR, count: 1 }, null, null, { type: BlockType.FLOUR, count: 1 }]

    expect(getCraftingResult(doughGrid)).toEqual({
      type: BlockType.DOUGH,
      count: 1,
    })
  })

  test('crafts a rice bowl from a single rice item', () => {
    const grid = emptyGrid()
    grid[3] = { type: BlockType.RICE, count: 2 }

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.RICE_BOWL,
      count: 1,
    })
  })

  test('crafts cobblestone from four stone items', () => {
    const grid: CraftingGrid = [
      { type: BlockType.STONE, count: 4 },
      { type: BlockType.STONE, count: 2 },
      { type: BlockType.STONE, count: 1 },
      { type: BlockType.STONE, count: 9 },
    ]

    expect(getCraftingResult(grid)).toEqual({
      type: BlockType.COBBLESTONE,
      count: 4,
    })
  })

  test('consumes one required item from each occupied recipe slot when crafting', () => {
    const grid = emptyGrid()
    grid[0] = { type: BlockType.WOOD, count: 2 }

    const result = craftFromGrid(grid, null)

    expect(result).toEqual({
      crafted: true,
      cursorItem: { type: BlockType.PLANKS, count: 4 },
    })
    expect(grid).toEqual([{ type: BlockType.WOOD, count: 1 }, null, null, null])
  })

  test('adds crafted output into matching cursor stack when there is room', () => {
    const grid = emptyGrid()
    grid[0] = { type: BlockType.WOOD, count: 1 }

    const result = craftFromGrid(grid, { type: BlockType.PLANKS, count: 60 })

    expect(result).toEqual({
      crafted: true,
      cursorItem: { type: BlockType.PLANKS, count: 64 },
    })
    expect(grid).toEqual([null, null, null, null])
  })

  test('does not add an empty crafted basket into a filled basket cursor', () => {
    const grid: CraftingGrid = [{ type: BlockType.PLANKS, count: 1 }, null, { type: BlockType.PLANKS, count: 1 }, { type: BlockType.PLANKS, count: 1 }]
    const cursorItem: InventoryItem = {
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 2,
    }

    const result = craftFromGrid(grid, cursorItem)

    expect(result).toEqual({ crafted: false, cursorItem })
    expect(grid).toEqual([{ type: BlockType.PLANKS, count: 1 }, null, { type: BlockType.PLANKS, count: 1 }, { type: BlockType.PLANKS, count: 1 }])
  })

  test('does not craft when output cannot fit the cursor stack', () => {
    const grid = emptyGrid()
    grid[0] = { type: BlockType.WOOD, count: 1 }
    const cursorItem: InventoryItem = { type: BlockType.DIRT, count: 1 }

    const result = craftFromGrid(grid, cursorItem)

    expect(result).toEqual({ crafted: false, cursorItem })
    expect(grid[0]).toEqual({ type: BlockType.WOOD, count: 1 })
  })

  test('returns remaining crafting items through a callback and clears the grid', () => {
    const grid = emptyGrid()
    grid[0] = { type: BlockType.WOOD, count: 2 }
    grid[3] = { type: BlockType.STONE, count: 5 }
    const returned: InventoryItem[] = []

    returnCraftingItems(grid, (item) => returned.push(item))

    expect(returned).toEqual([
      { type: BlockType.WOOD, count: 2 },
      { type: BlockType.STONE, count: 5 },
    ])
    expect(grid).toEqual([null, null, null, null])
  })
})
