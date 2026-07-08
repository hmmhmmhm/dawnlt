export type GeneratedModelPreviewKey = 'apple-basket' | 'apple' | 'apple-round' | 'orange' | 'orange-textured' | 'peach' | 'banana' | 'wooden-bucket' | 'water-bucket' | 'flour-sack' | 'dough-ball'

export interface GeneratedModelPreviewConfig {
  key: GeneratedModelPreviewKey
  url: string
  label: string
  position: { x: number; y: number; z: number }
  scale: number
}

const generatedModelPreviewConfigs: Record<GeneratedModelPreviewKey, GeneratedModelPreviewConfig> = {
  'apple-basket': {
    key: 'apple-basket',
    url: '/glb/meshy/apple-basket/apple-basket.glb',
    label: 'Meshy apple basket',
    position: { x: 46.5, y: 39.35, z: 53.5 },
    scale: 1.2,
  },
  apple: {
    key: 'apple',
    url: '/glb/meshy/apple/apple.glb',
    label: 'Meshy apple',
    position: { x: 48.2, y: 39.65, z: 51.8 },
    scale: 1.35,
  },
  'apple-round': {
    key: 'apple-round',
    url: '/glb/meshy/apple-round/apple-round.glb',
    label: 'Meshy round textured apple',
    position: { x: 48.2, y: 39.6, z: 51.8 },
    scale: 0.625,
  },
  orange: {
    key: 'orange',
    url: '/glb/meshy/orange/orange.glb',
    label: 'Meshy orange',
    position: { x: 48.2, y: 39.6, z: 51.8 },
    scale: 0.625,
  },
  'orange-textured': {
    key: 'orange-textured',
    url: '/glb/meshy/orange-textured/orange-textured.glb',
    label: 'Meshy textured orange',
    position: { x: 48.2, y: 39.6, z: 51.8 },
    scale: 0.625,
  },
  peach: {
    key: 'peach',
    url: '/glb/meshy/peach/peach.glb',
    label: 'Meshy peach',
    position: { x: 48.2, y: 39.6, z: 51.8 },
    scale: 0.625,
  },
  banana: {
    key: 'banana',
    url: '/glb/meshy/banana/banana.glb',
    label: 'Meshy banana',
    position: { x: 48.2, y: 39.6, z: 51.8 },
    scale: 0.8,
  },
  'wooden-bucket': {
    key: 'wooden-bucket',
    url: '/glb/meshy/wooden-bucket/wooden-bucket.glb',
    label: 'Meshy wooden bucket',
    position: { x: 48.2, y: 39.55, z: 51.8 },
    scale: 0.9,
  },
  'water-bucket': {
    key: 'water-bucket',
    url: '/glb/meshy/water-bucket/water-bucket.glb',
    label: 'Meshy water bucket',
    position: { x: 48.2, y: 39.55, z: 51.8 },
    scale: 0.9,
  },
  'flour-sack': {
    key: 'flour-sack',
    url: '/glb/meshy/flour-sack/flour-sack.glb',
    label: 'Meshy flour sack',
    position: { x: 48.2, y: 39.55, z: 51.8 },
    scale: 0.8,
  },
  'dough-ball': {
    key: 'dough-ball',
    url: '/glb/meshy/dough-ball/dough-ball.glb',
    label: 'Meshy dough ball',
    position: { x: 48.2, y: 39.55, z: 51.8 },
    scale: 0.75,
  },
}

export function resolveGeneratedModelPreviewConfig(search: string): GeneratedModelPreviewConfig | null {
  const params = new URLSearchParams(search)
  const key = params.get('meshyPreview')
  if (!key || !(key in generatedModelPreviewConfigs)) return null
  return generatedModelPreviewConfigs[key as GeneratedModelPreviewKey]
}

export function shouldEnableGeneratedModelPreview(search: string): boolean {
  return resolveGeneratedModelPreviewConfig(search) !== null
}
