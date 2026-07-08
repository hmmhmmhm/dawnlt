import { formatLodBaselineSnapshot, LOD_BASELINE_TARGETS, resolveLodBaselineTarget } from './lod-baseline'

declare const describe: any
declare const test: any
declare const expect: any

describe('lod baseline helpers', () => {
  test('resolves baseline targets by name and alias', () => {
    expect(resolveLodBaselineTarget('forest')).toBe(LOD_BASELINE_TARGETS.forest)
    expect(resolveLodBaselineTarget('beach')).toBe(LOD_BASELINE_TARGETS.beachPalm)
    expect(resolveLodBaselineTarget('palm')).toBe(LOD_BASELINE_TARGETS.beachPalm)
    expect(resolveLodBaselineTarget('snow')).toBe(LOD_BASELINE_TARGETS.snowTree)
    expect(resolveLodBaselineTarget('missing')).toBeNull()
  })

  test('formats a comparable LOD performance baseline snapshot', () => {
    const snapshot = formatLodBaselineSnapshot({
      targetLabel: 'Forest tree',
      position: { x: 3, y: 42, z: 8 },
      chunk: { x: 0, y: 1, z: 0 },
      renderDistance: 8,
      cameraMode: 'first-person',
      fps: 60,
      drawCalls: 120,
      triangles: 24000,
      lodSettings: {
        enabled: true,
        farDistance: 12,
        quality: 'medium',
        lodBudgetMs: 2,
      },
      lodSnapshot: 'LOD debug line',
    })

    expect(snapshot).toContain('LOD baseline: Forest tree')
    expect(snapshot).toContain('position=(3.0, 42.0, 8.0)')
    expect(snapshot).toContain('chunk=(0, 1, 0)')
    expect(snapshot).toContain('fps=60')
    expect(snapshot).toContain('drawCalls=120')
    expect(snapshot).toContain('LOD debug line')
  })
})
