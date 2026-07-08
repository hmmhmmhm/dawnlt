import { BlockType } from '../../types'

export type FarmingModelKey =
  | 'wheat-stage-1'
  | 'wheat-stage-2'
  | 'wheat-stage-3'
  | 'wheat-stage-4'
  | 'rice-stage-1'
  | 'rice-stage-2'
  | 'rice-stage-3'
  | 'rice-stage-4'
  | 'wheat-seeds'
  | 'rice-seeds'
  | 'wheat-bundle'
  | 'rice-bundle'
  | 'wooden-hoe'
  | 'wooden-bucket'
  | 'water-bucket'
  | 'bread-loaf'
  | 'rice-bowl'
  | 'flour-sack'
  | 'dough-ball'

export interface FarmingModelConfig {
  key: FarmingModelKey
  block: BlockType
  url: string
  label: string
  scale: number
  dropScale: number
  tint?: number
  tintStrength?: number
  emissiveStrength?: number
  worldScale?: { x: number; y: number; z: number }
  clusterCount?: number
}

export const FARMING_MODEL_BLOCKS = [
  BlockType.WILD_WHEAT,
  BlockType.WILD_RICE,
  BlockType.WHEAT_CROP_1,
  BlockType.WHEAT_CROP_2,
  BlockType.WHEAT_CROP_3,
  BlockType.WHEAT_CROP_4,
  BlockType.RICE_CROP_1,
  BlockType.RICE_CROP_2,
  BlockType.RICE_CROP_3,
  BlockType.RICE_CROP_4,
  BlockType.WHEAT_SEEDS,
  BlockType.RICE_SEEDS,
  BlockType.WHEAT,
  BlockType.RICE,
  BlockType.WOODEN_HOE,
  BlockType.BREAD,
  BlockType.RICE_BOWL,
  BlockType.WOODEN_BUCKET,
  BlockType.WATER_BUCKET,
  BlockType.FLOUR,
  BlockType.DOUGH,
] as const

const FARMING_WORLD_CROP_BLOCKS = new Set<BlockType>([BlockType.WILD_WHEAT, BlockType.WILD_RICE, BlockType.WHEAT_CROP_1, BlockType.WHEAT_CROP_2, BlockType.WHEAT_CROP_3, BlockType.WHEAT_CROP_4, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4])

const modelUrls: Record<FarmingModelKey, string> = {
  'wheat-stage-1': '/glb/meshy/wheat-stage-1/wheat-stage-1.glb',
  'wheat-stage-2': '/glb/meshy/wheat-stage-2/wheat-stage-2.glb',
  'wheat-stage-3': '/glb/meshy/wheat-stage-3/wheat-stage-3.glb',
  'wheat-stage-4': '/glb/meshy/wheat-stage-4/wheat-stage-4.glb',
  'rice-stage-1': '/glb/meshy/rice-stage-1/rice-stage-1.glb',
  'rice-stage-2': '/glb/meshy/rice-stage-2/rice-stage-2.glb',
  'rice-stage-3': '/glb/meshy/rice-stage-3/rice-stage-3.glb',
  'rice-stage-4': '/glb/meshy/rice-stage-4/rice-stage-4.glb',
  'wheat-seeds': '/glb/meshy/wheat-seeds/wheat-seeds.glb',
  'rice-seeds': '/glb/meshy/rice-seeds/rice-seeds.glb',
  'wheat-bundle': '/glb/meshy/wheat-bundle/wheat-bundle.glb',
  'rice-bundle': '/glb/meshy/rice-bundle/rice-bundle.glb',
  'wooden-hoe': '/glb/meshy/wooden-hoe/wooden-hoe.glb',
  'wooden-bucket': '/glb/meshy/wooden-bucket/wooden-bucket.glb',
  'water-bucket': '/glb/meshy/water-bucket/water-bucket.glb',
  'bread-loaf': '/glb/meshy/bread-loaf/bread-loaf.glb',
  'rice-bowl': '/glb/meshy/rice-bowl/rice-bowl.glb',
  'flour-sack': '/glb/meshy/flour-sack/flour-sack.glb',
  'dough-ball': '/glb/meshy/dough-ball/dough-ball.glb',
}

const configsByBlock = new Map<BlockType, FarmingModelConfig>([
  [BlockType.WILD_WHEAT, { key: 'wheat-stage-4', block: BlockType.WILD_WHEAT, url: modelUrls['wheat-stage-4'], label: 'Meshy wild wheat', scale: 0.82, dropScale: 0.38, tint: 0xe8c45a, tintStrength: 0.9, emissiveStrength: 0.24, worldScale: { x: 0.72, y: 1.55, z: 0.72 }, clusterCount: 6 }],
  [BlockType.WILD_RICE, { key: 'rice-stage-4', block: BlockType.WILD_RICE, url: modelUrls['rice-stage-4'], label: 'Meshy wild rice', scale: 0.9, dropScale: 0.38, tint: 0xe5d46b, tintStrength: 0.92, emissiveStrength: 0.28, worldScale: { x: 0.58, y: 1.68, z: 0.58 }, clusterCount: 6 }],
  [BlockType.WHEAT_CROP_1, { key: 'wheat-stage-1', block: BlockType.WHEAT_CROP_1, url: modelUrls['wheat-stage-1'], label: 'Meshy wheat sprout', scale: 0.3, dropScale: 0.28, tint: 0x74b94d, tintStrength: 0.56, emissiveStrength: 0.04, worldScale: { x: 0.46, y: 0.52, z: 0.46 }, clusterCount: 2 }],
  [BlockType.WHEAT_CROP_2, { key: 'wheat-stage-2', block: BlockType.WHEAT_CROP_2, url: modelUrls['wheat-stage-2'], label: 'Meshy young wheat', scale: 0.46, dropScale: 0.34, tint: 0xa6c957, tintStrength: 0.62, emissiveStrength: 0.06, worldScale: { x: 0.58, y: 0.82, z: 0.58 }, clusterCount: 4 }],
  [BlockType.WHEAT_CROP_3, { key: 'wheat-stage-3', block: BlockType.WHEAT_CROP_3, url: modelUrls['wheat-stage-3'], label: 'Meshy heading wheat', scale: 0.62, dropScale: 0.36, tint: 0xd6bc55, tintStrength: 0.78, emissiveStrength: 0.14, worldScale: { x: 0.66, y: 1.18, z: 0.66 }, clusterCount: 6 }],
  [BlockType.WHEAT_CROP_4, { key: 'wheat-stage-4', block: BlockType.WHEAT_CROP_4, url: modelUrls['wheat-stage-4'], label: 'Meshy mature wheat', scale: 0.82, dropScale: 0.38, tint: 0xe8c45a, tintStrength: 0.9, emissiveStrength: 0.24, worldScale: { x: 0.72, y: 1.55, z: 0.72 }, clusterCount: 9 }],
  [BlockType.RICE_CROP_1, { key: 'rice-stage-1', block: BlockType.RICE_CROP_1, url: modelUrls['rice-stage-1'], label: 'Meshy rice sprout', scale: 0.32, dropScale: 0.28, tint: 0x7fcf6c, tintStrength: 0.58, emissiveStrength: 0.04, worldScale: { x: 0.42, y: 0.58, z: 0.42 }, clusterCount: 2 }],
  [BlockType.RICE_CROP_2, { key: 'rice-stage-2', block: BlockType.RICE_CROP_2, url: modelUrls['rice-stage-2'], label: 'Meshy young rice', scale: 0.5, dropScale: 0.34, tint: 0xa8d76a, tintStrength: 0.64, emissiveStrength: 0.06, worldScale: { x: 0.48, y: 0.94, z: 0.48 }, clusterCount: 4 }],
  [BlockType.RICE_CROP_3, { key: 'rice-stage-3', block: BlockType.RICE_CROP_3, url: modelUrls['rice-stage-3'], label: 'Meshy heading rice', scale: 0.68, dropScale: 0.36, tint: 0xd4cd63, tintStrength: 0.8, emissiveStrength: 0.16, worldScale: { x: 0.54, y: 1.28, z: 0.54 }, clusterCount: 6 }],
  [BlockType.RICE_CROP_4, { key: 'rice-stage-4', block: BlockType.RICE_CROP_4, url: modelUrls['rice-stage-4'], label: 'Meshy mature rice', scale: 0.9, dropScale: 0.38, tint: 0xe5d46b, tintStrength: 0.92, emissiveStrength: 0.28, worldScale: { x: 0.58, y: 1.68, z: 0.58 }, clusterCount: 9 }],
  [BlockType.WHEAT_SEEDS, { key: 'wheat-seeds', block: BlockType.WHEAT_SEEDS, url: modelUrls['wheat-seeds'], label: 'Meshy wheat seeds', scale: 0.28, dropScale: 0.28 }],
  [BlockType.RICE_SEEDS, { key: 'rice-seeds', block: BlockType.RICE_SEEDS, url: modelUrls['rice-seeds'], label: 'Meshy rice seeds', scale: 0.28, dropScale: 0.28 }],
  [BlockType.WHEAT, { key: 'wheat-bundle', block: BlockType.WHEAT, url: modelUrls['wheat-bundle'], label: 'Meshy wheat bundle', scale: 0.48, dropScale: 0.36 }],
  [BlockType.RICE, { key: 'rice-bundle', block: BlockType.RICE, url: modelUrls['rice-bundle'], label: 'Meshy rice bundle', scale: 0.44, dropScale: 0.34 }],
  [BlockType.WOODEN_HOE, { key: 'wooden-hoe', block: BlockType.WOODEN_HOE, url: modelUrls['wooden-hoe'], label: 'Meshy wooden hoe', scale: 0.62, dropScale: 0.48 }],
  [BlockType.WOODEN_BUCKET, { key: 'wooden-bucket', block: BlockType.WOODEN_BUCKET, url: modelUrls['wooden-bucket'], label: 'Meshy wooden bucket', scale: 0.48, dropScale: 0.42 }],
  [BlockType.WATER_BUCKET, { key: 'water-bucket', block: BlockType.WATER_BUCKET, url: modelUrls['water-bucket'], label: 'Meshy water bucket', scale: 0.5, dropScale: 0.43 }],
  [BlockType.BREAD, { key: 'bread-loaf', block: BlockType.BREAD, url: modelUrls['bread-loaf'], label: 'Meshy bread loaf', scale: 0.4, dropScale: 0.34 }],
  [BlockType.RICE_BOWL, { key: 'rice-bowl', block: BlockType.RICE_BOWL, url: modelUrls['rice-bowl'], label: 'Meshy rice bowl', scale: 0.42, dropScale: 0.34 }],
  [BlockType.FLOUR, { key: 'flour-sack', block: BlockType.FLOUR, url: modelUrls['flour-sack'], label: 'Meshy flour sack', scale: 0.36, dropScale: 0.32 }],
  [BlockType.DOUGH, { key: 'dough-ball', block: BlockType.DOUGH, url: modelUrls['dough-ball'], label: 'Meshy dough ball', scale: 0.34, dropScale: 0.3 }],
])

export function isFarmingModelBlock(block: BlockType): boolean {
  return configsByBlock.has(block)
}

export function isFarmingWorldCropBlock(block: BlockType): boolean {
  return FARMING_WORLD_CROP_BLOCKS.has(block)
}

export function getFarmingModelConfig(block: BlockType): FarmingModelConfig | null {
  return configsByBlock.get(block) ?? null
}
