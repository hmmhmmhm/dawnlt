import { BlockType, type Inventory } from '../types'
import { getFarmingOnboardingHint } from './farming-onboarding'

declare const describe: any
declare const test: any
declare const expect: any

function inventoryWith(items: Array<{ type: BlockType; count?: number }>): Inventory {
  return {
    slots: new Array(36).fill(null),
    hotbar: [...items.map((item) => ({ type: item.type, count: item.count ?? 1 })), ...new Array(Math.max(0, 9 - items.length)).fill(null)],
  }
}

describe('farming onboarding', () => {
  test('starts by pointing the player toward wild grains', () => {
    expect(getFarmingOnboardingHint(inventoryWith([]))).toEqual({
      key: 'gather-wild-grains',
      label: '야생 곡식 찾기',
      detail: '밀이나 벼를 채집해 씨앗을 확보',
    })
  })

  test('moves from seeds to hoe and planting goals', () => {
    expect(getFarmingOnboardingHint(inventoryWith([{ type: BlockType.WHEAT_SEEDS }]))).toEqual({
      key: 'craft-hoe',
      label: '괭이 준비',
      detail: '나무판자 2개로 괭이 제작',
    })

    expect(getFarmingOnboardingHint(inventoryWith([{ type: BlockType.WOODEN_HOE }, { type: BlockType.WHEAT_SEEDS }]))).toEqual({
      key: 'plant-seeds',
      label: '씨앗 심기',
      detail: '갈아둔 땅에 밀이나 벼 심기',
    })
  })

  test('points harvested crops toward food crafting', () => {
    expect(getFarmingOnboardingHint(inventoryWith([{ type: BlockType.WHEAT }]))).toEqual({
      key: 'craft-food',
      label: '식량 만들기',
      detail: '밀가루, 반죽, 빵 또는 밥 조합',
    })
  })
})
