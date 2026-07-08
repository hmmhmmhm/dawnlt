import { BlockType } from '../../types'
import type { blockUVs as blockUVsType } from '../../utils/textures'
import { createMeshBuffers } from './types'
import type { renderAppleFruit as renderAppleFruitType } from './vegetation'

declare const describe: any
declare const beforeAll: any
declare const test: any
declare const expect: any

let renderAppleFruit: typeof renderAppleFruitType
let blockUVs: typeof blockUVsType

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

  ;({ renderAppleFruit } = await import('./vegetation'))
  ;({ blockUVs } = await import('../../utils/textures'))
  blockUVs[`${BlockType.APPLE}:side`] = [0, 0, 1, 1]
})

describe('vegetation mesh rendering', () => {
  test('renders apple fruit as a compact readable fruit rather than a full block', () => {
    const buffers = createMeshBuffers()

    renderAppleFruit(10, 20, 30, buffers)

    const xs = []
    const ys = []
    const zs = []
    for (let i = 0; i < buffers.foliageVertices.length; i += 3) {
      xs.push(buffers.foliageVertices[i])
      ys.push(buffers.foliageVertices[i + 1])
      zs.push(buffers.foliageVertices[i + 2])
    }

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(0.42)
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(0.62)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(0.48)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(0.72)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThanOrEqual(0.42)
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThanOrEqual(0.62)
    expect(buffers.foliageUvs.length).toBeGreaterThan(0)
    expect(BlockType.APPLE).toBeDefined()
  })

  test('renders apple fruit as layered fruit instead of one full textured cube', () => {
    const buffers = createMeshBuffers()

    renderAppleFruit(10, 20, 30, buffers)

    const vertices = buffers.foliageVertices
    const widthByLayer = new Map<number, { minX: number; maxX: number }>()
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = Number(vertices[i + 1].toFixed(3))
      const layer = widthByLayer.get(y) ?? { minX: x, maxX: x }
      layer.minX = Math.min(layer.minX, x)
      layer.maxX = Math.max(layer.maxX, x)
      widthByLayer.set(y, layer)
    }

    const widths = [...widthByLayer.values()].map((layer) => Number((layer.maxX - layer.minX).toFixed(3)))
    const uniqueWidths = new Set(widths)

    expect(uniqueWidths.size).toBeGreaterThan(1)
    expect(Math.max(...widths)).toBeLessThanOrEqual(0.62)
  })

  test('adds stem and leaf color detail to apple fruit geometry', () => {
    const buffers = createMeshBuffers()

    renderAppleFruit(10, 20, 30, buffers)

    const hasGreenLeaf = buffers.foliageColors.some((value, index) => {
      if (index % 3 !== 0) return false
      const red = value
      const green = buffers.foliageColors[index + 1]
      const blue = buffers.foliageColors[index + 2]
      return green > red && green > blue
    })
    const hasBrownStem = buffers.foliageColors.some((value, index) => {
      if (index % 3 !== 0) return false
      const red = value
      const green = buffers.foliageColors[index + 1]
      const blue = buffers.foliageColors[index + 2]
      return red > green && green > blue
    })

    expect(hasGreenLeaf).toBe(true)
    expect(hasBrownStem).toBe(true)
  })
})
