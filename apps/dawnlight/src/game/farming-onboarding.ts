import { BlockType, type Inventory, type InventoryItem } from '../types'

export interface FarmingOnboardingHint {
  key: 'gather-wild-grains' | 'craft-hoe' | 'plant-seeds' | 'water-fields' | 'craft-food'
  label: string
  detail: string
}

function inventoryItems(inventory: Inventory): InventoryItem[] {
  return [...inventory.hotbar, ...inventory.slots].filter((item): item is InventoryItem => Boolean(item && item.count > 0))
}

function hasAny(items: InventoryItem[], types: BlockType[]): boolean {
  return items.some((item) => types.includes(item.type))
}

export function getFarmingOnboardingHint(inventory: Inventory): FarmingOnboardingHint | null {
  const items = inventoryItems(inventory)
  const hasSeeds = hasAny(items, [BlockType.WHEAT_SEEDS, BlockType.RICE_SEEDS])
  const hasHarvest = hasAny(items, [BlockType.WHEAT, BlockType.RICE, BlockType.FLOUR, BlockType.DOUGH])

  if (hasHarvest) {
    return {
      key: 'craft-food',
      label: '식량 만들기',
      detail: '밀가루, 반죽, 빵 또는 밥 조합',
    }
  }

  if (!hasSeeds) {
    return {
      key: 'gather-wild-grains',
      label: '야생 곡식 찾기',
      detail: '밀이나 벼를 채집해 씨앗을 확보',
    }
  }

  if (!hasAny(items, [BlockType.WOODEN_HOE])) {
    return {
      key: 'craft-hoe',
      label: '괭이 준비',
      detail: '나무판자 2개로 괭이 제작',
    }
  }

  return {
    key: 'plant-seeds',
    label: '씨앗 심기',
    detail: '갈아둔 땅에 밀이나 벼 심기',
  }
}
