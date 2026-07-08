/**
 * Block utility functions
 * This file has NO external dependencies and can be safely imported by Web Workers
 */

import { BlockType } from './block-types'

function isCropVisualBlock(block: BlockType): boolean {
  return (
    block === BlockType.WILD_WHEAT ||
    block === BlockType.WILD_RICE ||
    block === BlockType.WHEAT_CROP_1 ||
    block === BlockType.WHEAT_CROP_2 ||
    block === BlockType.WHEAT_CROP_3 ||
    block === BlockType.WHEAT_CROP_4 ||
    block === BlockType.RICE_CROP_1 ||
    block === BlockType.RICE_CROP_2 ||
    block === BlockType.RICE_CROP_3 ||
    block === BlockType.RICE_CROP_4
  )
}

/**
 * Check if a block is transparent for face culling
 * Transparent blocks allow adjacent faces to be rendered
 */
export function isBlockTransparent(block: BlockType): boolean {
  return (
    block === BlockType.AIR ||
    block === BlockType.WATER ||
    block === BlockType.GLASS ||
    block === BlockType.LEAVES ||
    block === BlockType.BUSH ||
    block === BlockType.RED_FLOWER ||
    block === BlockType.YELLOW_FLOWER ||
    block === BlockType.PALM_LEAVES ||
    block === BlockType.SNOW_LEAVES ||
    block === BlockType.DEAD_BUSH ||
    block === BlockType.BAMBOO ||
    block === BlockType.SNOW_BUSH ||
    block === BlockType.WINTER_FLOWER ||
    block === BlockType.FALLEN_LEAVES ||
    block === BlockType.MOSS ||
    block === BlockType.MUSHROOM_RED ||
    block === BlockType.MUSHROOM_BROWN ||
    block === BlockType.VINE ||
    block === BlockType.SNOW_VINE ||
    block === BlockType.PEBBLE ||
    block === BlockType.STONE_PEBBLE ||
    block === BlockType.SNOW_PEBBLE ||
    block === BlockType.STARFISH ||
    block === BlockType.APPLE ||
    block === BlockType.ORANGE ||
    block === BlockType.PEACH ||
    block === BlockType.BANANA ||
    isCropVisualBlock(block) ||
    block === BlockType.BASKET ||
    block === BlockType.BASKET_APPLES_1 ||
    block === BlockType.BASKET_APPLES_2 ||
    block === BlockType.BASKET_APPLES_3 ||
    block === BlockType.BASKET_APPLES_4
  )
}

/**
 * Check if a block is solid (not transparent)
 */
export function isSolid(block: BlockType): boolean {
  return !isBlockTransparent(block)
}

/**
 * Check if a block is opaque (blocks visibility completely)
 * Used for occlusion culling and visibility checks
 */
export function isBlockOpaque(block: BlockType): boolean {
  return (
    block !== BlockType.AIR &&
    block !== BlockType.WATER &&
    block !== BlockType.GLASS &&
    block !== BlockType.LEAVES &&
    block !== BlockType.PALM_LEAVES &&
    block !== BlockType.SNOW_LEAVES &&
    block !== BlockType.BUSH &&
    block !== BlockType.RED_FLOWER &&
    block !== BlockType.YELLOW_FLOWER &&
    block !== BlockType.DEAD_BUSH &&
    block !== BlockType.BAMBOO &&
    block !== BlockType.SNOW_BUSH &&
    block !== BlockType.WINTER_FLOWER &&
    block !== BlockType.FALLEN_LEAVES &&
    block !== BlockType.MOSS &&
    block !== BlockType.MUSHROOM_RED &&
    block !== BlockType.MUSHROOM_BROWN &&
    block !== BlockType.VINE &&
    block !== BlockType.SNOW_VINE &&
    block !== BlockType.PEBBLE &&
    block !== BlockType.STONE_PEBBLE &&
    block !== BlockType.SNOW_PEBBLE &&
    block !== BlockType.STARFISH &&
    block !== BlockType.APPLE &&
    block !== BlockType.ORANGE &&
    block !== BlockType.PEACH &&
    block !== BlockType.BANANA &&
    !isCropVisualBlock(block) &&
    block !== BlockType.BASKET &&
    block !== BlockType.BASKET_APPLES_1 &&
    block !== BlockType.BASKET_APPLES_2 &&
    block !== BlockType.BASKET_APPLES_3 &&
    block !== BlockType.BASKET_APPLES_4
  )
}

/**
 * Check if a block is a cross-mesh (X-shaped) foliage block
 */
export function isCrossMeshBlock(block: BlockType): boolean {
  return (
    block === BlockType.BUSH ||
    block === BlockType.RED_FLOWER ||
    block === BlockType.YELLOW_FLOWER ||
    block === BlockType.DEAD_BUSH ||
    block === BlockType.BAMBOO ||
    block === BlockType.SNOW_BUSH ||
    block === BlockType.WINTER_FLOWER ||
    block === BlockType.MUSHROOM_RED ||
    block === BlockType.MUSHROOM_BROWN ||
    block === BlockType.VINE ||
    block === BlockType.SNOW_VINE ||
    block === BlockType.APPLE ||
    block === BlockType.ORANGE ||
    block === BlockType.PEACH ||
    block === BlockType.BANANA ||
    isCropVisualBlock(block)
  )
}

/**
 * Blocks whose gameplay state lives in chunk data, but whose visible shape is
 * owned by a dedicated GLB model system instead of generated block geometry.
 */
export function isGeneratedModelOnlyBlock(block: BlockType): boolean {
  return (
    block === BlockType.APPLE ||
    block === BlockType.ORANGE ||
    block === BlockType.PEACH ||
    block === BlockType.BANANA ||
    block === BlockType.BASKET ||
    block === BlockType.BASKET_APPLES_1 ||
    block === BlockType.BASKET_APPLES_2 ||
    block === BlockType.BASKET_APPLES_3 ||
    block === BlockType.BASKET_APPLES_4 ||
    isCropVisualBlock(block)
  )
}

/**
 * Check if a block is a flat ground decoration (fallen leaves, moss)
 */
export function isFlatGroundBlock(block: BlockType): boolean {
  return block === BlockType.FALLEN_LEAVES || block === BlockType.MOSS
}

/**
 * Check if a block is a 3D ground decoration (pebbles)
 */
export function isGroundDecoration(block: BlockType): boolean {
  return block === BlockType.PEBBLE || block === BlockType.STONE_PEBBLE || block === BlockType.SNOW_PEBBLE || block === BlockType.STARFISH
}

/**
 * Check if a block is a fluid (water, lava, etc)
 */
export function isFluidBlock(block: BlockType): boolean {
  return block === BlockType.WATER
}

/**
 * Check if a block is foliage (leaves, bushes, flowers)
 */
export function isFoliageBlock(block: BlockType): boolean {
  return (
    block === BlockType.LEAVES ||
    block === BlockType.PALM_LEAVES ||
    block === BlockType.SNOW_LEAVES ||
    block === BlockType.BUSH ||
    block === BlockType.RED_FLOWER ||
    block === BlockType.YELLOW_FLOWER ||
    block === BlockType.DEAD_BUSH ||
    block === BlockType.BAMBOO ||
    block === BlockType.SNOW_BUSH ||
    block === BlockType.WINTER_FLOWER ||
    block === BlockType.FALLEN_LEAVES ||
    block === BlockType.MOSS ||
    block === BlockType.MUSHROOM_RED ||
    block === BlockType.MUSHROOM_BROWN ||
    block === BlockType.VINE ||
    block === BlockType.SNOW_VINE ||
    block === BlockType.APPLE ||
    block === BlockType.ORANGE ||
    block === BlockType.PEACH ||
    block === BlockType.BANANA ||
    isCropVisualBlock(block)
  )
}
