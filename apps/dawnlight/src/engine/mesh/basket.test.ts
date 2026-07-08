import { BlockType } from '../../types'
import type { blockUVs as blockUVsType } from '../../utils/textures'
import type { renderBasket as renderBasketType } from './basket'
import { createMeshBuffers } from './types'

declare const describe: any
declare const beforeAll: any
declare const test: any
declare const expect: any

let blockUVs: typeof blockUVsType
let renderBasket: typeof renderBasketType

beforeAll(async () => {
  ;(globalThis as any).document ??= {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        setTransform: () => {},
        get imageSmoothingEnabled() {
          return false
        },
        set imageSmoothingEnabled(_value: boolean) {},
        set fillStyle(_value: string) {},
      }),
      toDataURL: () => 'data:image/png;base64,',
    }),
  }

  ;({ blockUVs } = await import('../../utils/textures'))
  ;({ renderBasket } = await import('./basket'))
})

function seedBlockUvs(type: BlockType): void {
  blockUVs[`${type}:top`] = [0.1, 0.2, 0.3, 0.4]
  blockUVs[`${type}:side`] = [0.1, 0.2, 0.3, 0.4]
  blockUVs[`${type}:bottom`] = [0.1, 0.2, 0.3, 0.4]
}

describe('basket mesh', () => {
  test('uses point UVs for custom basket cuboids instead of stretching item icons on every face', () => {
    seedBlockUvs(BlockType.SNOW)
    seedBlockUvs(BlockType.WOOD)
    seedBlockUvs(BlockType.APPLE)
    seedBlockUvs(BlockType.BASKET)
    const buffers = createMeshBuffers()

    renderBasket(0, 0, 0, BlockType.BASKET_APPLES_4, buffers)

    const firstFaceUvs = buffers.solidUvs.slice(0, 8)
    expect(new Set(firstFaceUvs.filter((_, index) => index % 2 === 0)).size).toBe(1)
    expect(new Set(firstFaceUvs.filter((_, index) => index % 2 === 1)).size).toBe(1)
  })

  test('uses enough small cuboids for a detailed woven basket silhouette', () => {
    seedBlockUvs(BlockType.SNOW)
    const buffers = createMeshBuffers()

    renderBasket(0, 0, 0, BlockType.BASKET_APPLES_4, buffers)

    const cuboidCount = buffers.solidVertices.length / 72
    expect(cuboidCount).toBeGreaterThanOrEqual(36)
  })

  test('adds leaf color detail to apples in a filled basket', () => {
    seedBlockUvs(BlockType.SNOW)
    const buffers = createMeshBuffers()

    renderBasket(0, 0, 0, BlockType.BASKET_APPLES_4, buffers)

    const hasLeafGreen = buffers.solidColors.some((value, index) => {
      if (index % 3 !== 0) return false
      const red = value
      const green = buffers.solidColors[index + 1]
      const blue = buffers.solidColors[index + 2]
      return green > red && green > blue
    })
    expect(hasLeafGreen).toBe(true)
  })
})
