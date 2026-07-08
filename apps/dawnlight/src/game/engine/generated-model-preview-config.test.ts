import { describe, expect, it } from '@jest/globals'
import { resolveGeneratedModelPreviewConfig, shouldEnableGeneratedModelPreview } from './generated-model-preview-config'

describe('generated model preview config', () => {
  it('stays disabled without the meshy preview query parameter', () => {
    expect(shouldEnableGeneratedModelPreview('')).toBe(false)
    expect(resolveGeneratedModelPreviewConfig('')).toBeNull()
  })

  it('enables the apple basket Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=apple-basket')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=apple-basket')).toBe(true)
    expect(config).toEqual({
      key: 'apple-basket',
      url: '/glb/meshy/apple-basket/apple-basket.glb',
      label: 'Meshy apple basket',
      position: { x: 46.5, y: 39.35, z: 53.5 },
      scale: 1.2,
    })
  })

  it('enables the apple Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=apple')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=apple')).toBe(true)
    expect(config).toEqual({
      key: 'apple',
      url: '/glb/meshy/apple/apple.glb',
      label: 'Meshy apple',
      position: { x: 48.2, y: 39.65, z: 51.8 },
      scale: 1.35,
    })
  })

  it('enables the round textured apple Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=apple-round')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=apple-round')).toBe(true)
    expect(config).toEqual({
      key: 'apple-round',
      url: '/glb/meshy/apple-round/apple-round.glb',
      label: 'Meshy round textured apple',
      position: { x: 48.2, y: 39.6, z: 51.8 },
      scale: 0.625,
    })
  })

  it('enables the orange Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=orange')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=orange')).toBe(true)
    expect(config).toEqual({
      key: 'orange',
      url: '/glb/meshy/orange/orange.glb',
      label: 'Meshy orange',
      position: { x: 48.2, y: 39.6, z: 51.8 },
      scale: 0.625,
    })
  })

  it('enables the textured orange Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=orange-textured')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=orange-textured')).toBe(true)
    expect(config).toEqual({
      key: 'orange-textured',
      url: '/glb/meshy/orange-textured/orange-textured.glb',
      label: 'Meshy textured orange',
      position: { x: 48.2, y: 39.6, z: 51.8 },
      scale: 0.625,
    })
  })

  it('enables the peach Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=peach')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=peach')).toBe(true)
    expect(config).toEqual({
      key: 'peach',
      url: '/glb/meshy/peach/peach.glb',
      label: 'Meshy peach',
      position: { x: 48.2, y: 39.6, z: 51.8 },
      scale: 0.625,
    })
  })

  it('enables the banana Meshy preview from the query parameter', () => {
    const config = resolveGeneratedModelPreviewConfig('?meshyPreview=banana')

    expect(shouldEnableGeneratedModelPreview('?meshyPreview=banana')).toBe(true)
    expect(config).toEqual({
      key: 'banana',
      url: '/glb/meshy/banana/banana.glb',
      label: 'Meshy banana',
      position: { x: 48.2, y: 39.6, z: 51.8 },
      scale: 0.8,
    })
  })

  it('enables farming utility Meshy previews from the query parameter', () => {
    expect(resolveGeneratedModelPreviewConfig('?meshyPreview=wooden-bucket')).toMatchObject({
      key: 'wooden-bucket',
      url: '/glb/meshy/wooden-bucket/wooden-bucket.glb',
      label: 'Meshy wooden bucket',
    })
    expect(resolveGeneratedModelPreviewConfig('?meshyPreview=water-bucket')).toMatchObject({
      key: 'water-bucket',
      url: '/glb/meshy/water-bucket/water-bucket.glb',
      label: 'Meshy water bucket',
    })
    expect(resolveGeneratedModelPreviewConfig('?meshyPreview=flour-sack')).toMatchObject({
      key: 'flour-sack',
      url: '/glb/meshy/flour-sack/flour-sack.glb',
      label: 'Meshy flour sack',
    })
    expect(resolveGeneratedModelPreviewConfig('?meshyPreview=dough-ball')).toMatchObject({
      key: 'dough-ball',
      url: '/glb/meshy/dough-ball/dough-ball.glb',
      label: 'Meshy dough ball',
    })
  })

  it('ignores unknown generated model keys', () => {
    expect(resolveGeneratedModelPreviewConfig('?meshyPreview=unknown')).toBeNull()
  })
})
