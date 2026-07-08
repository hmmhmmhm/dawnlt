import { BlockColors } from '../../constants'
import { BlockType } from '../../types'
import type { usesFlatHudIcon as usesFlatHudIconType } from './atlas'

declare const beforeAll: any
declare const describe: any
declare const test: any
declare const expect: any

let usesFlatHudIcon: typeof usesFlatHudIconType

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

  ;({ usesFlatHudIcon } = await import('./atlas'))
})

describe('texture atlas HUD icons', () => {
  test('uses flat item icons for baskets instead of block cube icons', () => {
    expect(usesFlatHudIcon(BlockType.BASKET)).toBe(true)
    expect(usesFlatHudIcon(BlockType.BASKET_APPLES_4)).toBe(true)
    expect(usesFlatHudIcon(BlockType.WOODEN_BUCKET)).toBe(true)
    expect(usesFlatHudIcon(BlockType.WATER_BUCKET)).toBe(true)
    expect(usesFlatHudIcon(BlockType.FLOUR)).toBe(true)
    expect(usesFlatHudIcon(BlockType.DOUGH)).toBe(true)
    expect(usesFlatHudIcon(BlockType.GRASS)).toBe(false)
  })
})

describe('farming texture palette', () => {
  test('draws farming utility item icons instead of magenta fallback', async () => {
    const { drawToContext } = await import('./dispatcher')
    const fills: string[] = []
    const ctx = {
      clearRect: () => {},
      fillRect: () => {},
      set fillStyle(value: string) {
        fills.push(value)
      },
    } as unknown as CanvasRenderingContext2D

    for (const type of [BlockType.WOODEN_BUCKET, BlockType.WATER_BUCKET, BlockType.FLOUR, BlockType.DOUGH]) {
      fills.length = 0
      drawToContext(ctx, 0, 0, type, 'side')
      expect(fills).not.toContain('#ff00ff')
      expect(fills.length).toBeGreaterThan(1)
    }
  })

  test('uses a readable wet farmland palette instead of near-black soil', async () => {
    const { FARMLAND_PALETTE } = await import('./farming')

    expect(FARMLAND_PALETTE.wetBase).toBe('#8a6242')
    expect(FARMLAND_PALETTE.wetFurrow).toBe('#745139')
    expect(FARMLAND_PALETTE.wetWaterLine).toBe('#4f9daf')
    expect(BlockColors[BlockType.FARMLAND_WET].all).toBe(0x8a6242)
  })

  test('draws wet farmland water lines only on the top face', async () => {
    const { FARMLAND_PALETTE, drawFarmland } = await import('./farming')
    const fills: string[] = []
    const ctx = {
      clearRect: () => {},
      fillRect: () => {},
      set fillStyle(value: string) {
        fills.push(value)
      },
    } as unknown as CanvasRenderingContext2D

    drawFarmland(ctx, 0, 0, true, 'side')
    expect(fills).not.toContain(FARMLAND_PALETTE.wetWaterLine)

    fills.length = 0
    drawFarmland(ctx, 0, 0, true, 'top')
    expect(fills).toContain(FARMLAND_PALETTE.wetWaterLine)
  })

  test('draws wet farmland as broken water details instead of one flag-like stripe', async () => {
    const { FARMLAND_PALETTE, drawFarmland } = await import('./farming')
    const waterRects: Array<{ x: number; y: number; w: number; h: number }> = []
    let fillStyle = ''
    const ctx = {
      clearRect: () => {},
      fillRect: (x: number, y: number, w: number, h: number) => {
        if (fillStyle === FARMLAND_PALETTE.wetWaterLine) waterRects.push({ x, y, w, h })
      },
      set fillStyle(value: string) {
        fillStyle = value
      },
    } as unknown as CanvasRenderingContext2D

    drawFarmland(ctx, 0, 0, true, 'top')

    expect(waterRects.length).toBeGreaterThanOrEqual(5)
    expect(waterRects.some((rect) => rect.w >= 10)).toBe(false)
    expect(new Set(waterRects.map((rect) => rect.y)).size).toBeGreaterThan(2)
  })
})
