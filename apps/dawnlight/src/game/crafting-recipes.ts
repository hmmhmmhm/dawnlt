import { BlockType, type InventoryItem } from '../types'

export interface CraftingRecipeHint {
  key: string
  label: string
  slots: [BlockType | null, BlockType | null, BlockType | null, BlockType | null]
  result: InventoryItem
}

export const CRAFTING_RECIPE_HINTS: CraftingRecipeHint[] = [
  {
    key: 'planks',
    label: '나무판자',
    slots: [BlockType.WOOD, null, null, null],
    result: { type: BlockType.PLANKS, count: 4 },
  },
  {
    key: 'crafting-table',
    label: '작업대',
    slots: [BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS],
    result: { type: BlockType.CRAFTING_TABLE, count: 1 },
  },
  {
    key: 'basket',
    label: '바구니',
    slots: [BlockType.PLANKS, null, BlockType.PLANKS, BlockType.PLANKS],
    result: { type: BlockType.BASKET, count: 1 },
  },
  {
    key: 'wooden-hoe',
    label: '괭이',
    slots: [BlockType.PLANKS, BlockType.PLANKS, null, null],
    result: { type: BlockType.WOODEN_HOE, count: 1 },
  },
  {
    key: 'wooden-bucket',
    label: '양동이',
    slots: [BlockType.PLANKS, null, null, BlockType.COBBLESTONE],
    result: { type: BlockType.WOODEN_BUCKET, count: 1 },
  },
  {
    key: 'flour',
    label: '밀가루',
    slots: [BlockType.WHEAT, null, null, null],
    result: { type: BlockType.FLOUR, count: 1 },
  },
  {
    key: 'dough',
    label: '반죽',
    slots: [BlockType.FLOUR, null, null, BlockType.FLOUR],
    result: { type: BlockType.DOUGH, count: 1 },
  },
  {
    key: 'bread',
    label: '빵',
    slots: [BlockType.WHEAT, null, BlockType.WHEAT, BlockType.WHEAT],
    result: { type: BlockType.BREAD, count: 1 },
  },
  {
    key: 'rice-bowl',
    label: '밥',
    slots: [BlockType.RICE, null, null, null],
    result: { type: BlockType.RICE_BOWL, count: 1 },
  },
  {
    key: 'cobblestone',
    label: '조약돌',
    slots: [BlockType.STONE, BlockType.STONE, BlockType.STONE, BlockType.STONE],
    result: { type: BlockType.COBBLESTONE, count: 4 },
  },
]
