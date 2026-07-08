import { BlockType } from '../types'
import { CRAFTING_RECIPE_HINTS } from './crafting-recipes'

declare const describe: any
declare const test: any
declare const expect: any

describe('crafting recipe hints', () => {
  test('lists every current two-by-two crafting recipe in UI order', () => {
    expect(CRAFTING_RECIPE_HINTS.map((recipe) => recipe.result.type)).toEqual([BlockType.PLANKS, BlockType.CRAFTING_TABLE, BlockType.BASKET, BlockType.WOODEN_HOE, BlockType.WOODEN_BUCKET, BlockType.FLOUR, BlockType.DOUGH, BlockType.BREAD, BlockType.RICE_BOWL, BlockType.COBBLESTONE])
  })

  test('uses explicit two-by-two slot patterns for all listed recipes', () => {
    expect(CRAFTING_RECIPE_HINTS[0].slots).toEqual([BlockType.WOOD, null, null, null])
    expect(CRAFTING_RECIPE_HINTS[1].slots).toEqual([BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS])
    expect(CRAFTING_RECIPE_HINTS[2].slots).toEqual([BlockType.PLANKS, null, BlockType.PLANKS, BlockType.PLANKS])
    expect(CRAFTING_RECIPE_HINTS[4].slots).toEqual([BlockType.PLANKS, null, null, BlockType.COBBLESTONE])
    expect(CRAFTING_RECIPE_HINTS[9].slots).toEqual([BlockType.STONE, BlockType.STONE, BlockType.STONE, BlockType.STONE])
  })
})
