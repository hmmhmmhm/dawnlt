/**
 * SFX Material Mapping
 *
 * Maps BlockType to a sound-material category and defines
 * all SFX file paths used throughout the game.
 */

import { BlockType } from '../../shared/block-types'

// ── Material Categories ─────────────────────────────────────

export type SfxMaterial = 'grass' | 'stone' | 'sand' | 'wood' | 'glass' | 'water'

const BLOCK_MATERIAL_MAP: Partial<Record<BlockType, SfxMaterial>> = {
  // Grass family
  [BlockType.GRASS]: 'grass',
  [BlockType.DIRT]: 'grass',
  [BlockType.MOSS]: 'grass',
  [BlockType.FALLEN_LEAVES]: 'grass',
  [BlockType.LEAVES]: 'grass',
  [BlockType.PALM_LEAVES]: 'grass',
  [BlockType.SNOW_LEAVES]: 'grass',
  [BlockType.BUSH]: 'grass',
  [BlockType.DEAD_BUSH]: 'grass',
  [BlockType.SNOW_BUSH]: 'grass',
  [BlockType.RED_FLOWER]: 'grass',
  [BlockType.YELLOW_FLOWER]: 'grass',
  [BlockType.WINTER_FLOWER]: 'grass',
  [BlockType.MUSHROOM_RED]: 'grass',
  [BlockType.MUSHROOM_BROWN]: 'grass',
  [BlockType.VINE]: 'grass',
  [BlockType.SNOW_VINE]: 'grass',
  [BlockType.CACTUS]: 'grass',
  [BlockType.STARFISH]: 'grass',
  [BlockType.APPLE]: 'grass',
  [BlockType.ORANGE]: 'grass',
  [BlockType.PEACH]: 'grass',
  [BlockType.BANANA]: 'grass',
  [BlockType.FARMLAND_DRY]: 'grass',
  [BlockType.FARMLAND_WET]: 'grass',
  [BlockType.WILD_WHEAT]: 'grass',
  [BlockType.WILD_RICE]: 'grass',
  [BlockType.WHEAT_CROP_1]: 'grass',
  [BlockType.WHEAT_CROP_2]: 'grass',
  [BlockType.WHEAT_CROP_3]: 'grass',
  [BlockType.WHEAT_CROP_4]: 'grass',
  [BlockType.RICE_CROP_1]: 'grass',
  [BlockType.RICE_CROP_2]: 'grass',
  [BlockType.RICE_CROP_3]: 'grass',
  [BlockType.RICE_CROP_4]: 'grass',
  [BlockType.WHEAT_SEEDS]: 'grass',
  [BlockType.RICE_SEEDS]: 'grass',
  [BlockType.WHEAT]: 'grass',
  [BlockType.RICE]: 'grass',

  // Stone family
  [BlockType.STONE]: 'stone',
  [BlockType.COBBLESTONE]: 'stone',
  [BlockType.BEDROCK]: 'stone',
  [BlockType.BRICK]: 'stone',
  [BlockType.COAL_ORE]: 'stone',
  [BlockType.IRON_ORE]: 'stone',
  [BlockType.GOLD_ORE]: 'stone',
  [BlockType.DIAMOND_ORE]: 'stone',
  [BlockType.STONE_PEBBLE]: 'stone',

  // Sand family
  [BlockType.SAND]: 'sand',
  [BlockType.PACKED_SAND]: 'sand',
  [BlockType.PEBBLE]: 'sand',
  [BlockType.SNOW]: 'sand',
  [BlockType.SNOW_PEBBLE]: 'sand',

  // Wood family
  [BlockType.WOOD]: 'wood',
  [BlockType.PLANKS]: 'wood',
  [BlockType.CRAFTING_TABLE]: 'wood',
  [BlockType.PALM_WOOD]: 'wood',
  [BlockType.BAMBOO]: 'wood',
  [BlockType.BASKET]: 'wood',
  [BlockType.BASKET_APPLES_1]: 'wood',
  [BlockType.BASKET_APPLES_2]: 'wood',
  [BlockType.BASKET_APPLES_3]: 'wood',
  [BlockType.BASKET_APPLES_4]: 'wood',
  [BlockType.WOODEN_HOE]: 'wood',
  [BlockType.BREAD]: 'wood',
  [BlockType.RICE_BOWL]: 'wood',

  // Glass family
  [BlockType.GLASS]: 'glass',
  [BlockType.ICE]: 'glass',

  // Water
  [BlockType.WATER]: 'water',
}

/** Get the sound-material category for a block type. Defaults to 'stone'. */
export function getBlockMaterial(blockType: BlockType): SfxMaterial {
  return BLOCK_MATERIAL_MAP[blockType] ?? 'stone'
}

// ── SFX File Paths ──────────────────────────────────────────

const S = 'https://static.dawn.lt/sfx'

export const SFX_PATHS = {
  place: {
    grass: `${S}/grass-placed.mp3`,
    stone: `${S}/stone-placed.mp3`,
    sand: `${S}/sand-placed.mp3`,
    wood: `${S}/wood-placed.mp3`,
    glass: `${S}/glass-placed.mp3`,
    water: `${S}/water-placed.mp3`,
  },
  break: {
    grass: `${S}/grass-break.mp3`,
    stone: `${S}/stone-break.mp3`,
    sand: `${S}/sand-break.mp3`,
    wood: `${S}/wood-break.mp3`,
    glass: `${S}/glass-break.mp3`,
  },
  walk: {
    grass: [`${S}/grass-walk-1.mp3`, `${S}/grass-walk-2.mp3`, `${S}/grass-walk-3.mp3`, `${S}/grass-walk-4.mp3`],
    stone: [`${S}/stone-walk-1.mp3`, `${S}/stone-walk-2.mp3`],
    sand: [`${S}/sand-walk-1.mp3`, `${S}/sand-walk-2.mp3`],
    wood: [`${S}/wood-walk-1.mp3`, `${S}/wood-walk-2.mp3`],
    glass: [`${S}/glass-walk-1.mp3`, `${S}/glass-walk-2.mp3`],
  },
  ambient: {
    rain: `${S}/rain-loop.mp3`,
    seaside: [`${S}/seaside-1.mp3`, `${S}/seaside-2.mp3`, `${S}/seaside-3.mp3`],
    swimming: [`${S}/swimming-1.mp3`, `${S}/swimming-2.mp3`],
  },
} as const

/** High-priority SFX URLs (walk, place, break) — loaded first for instant feedback */
export function getPrioritySfxUrls(): string[] {
  const urls = new Set<string>()
  for (const arr of Object.values(SFX_PATHS.walk)) {
    for (const url of arr) urls.add(url)
  }
  for (const url of Object.values(SFX_PATHS.place)) urls.add(url)
  for (const url of Object.values(SFX_PATHS.break)) urls.add(url)
  return Array.from(urls)
}

/** Low-priority SFX URLs (ambient loops) — loaded after priority sounds */
export function getAmbientSfxUrls(): string[] {
  const urls = new Set<string>()
  urls.add(SFX_PATHS.ambient.rain)
  for (const url of SFX_PATHS.ambient.seaside) urls.add(url)
  for (const url of SFX_PATHS.ambient.swimming) urls.add(url)
  return Array.from(urls)
}
