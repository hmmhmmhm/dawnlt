/**
 * Block type definitions
 * This file has NO external dependencies and can be safely imported by Web Workers
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  SAND = 4,
  WATER = 5,
  WOOD = 6,
  LEAVES = 7,
  COBBLESTONE = 8,
  PLANKS = 9,
  CRAFTING_TABLE = 10,
  BEDROCK = 11,
  GLASS = 12,
  BRICK = 13,
  COAL_ORE = 14,
  IRON_ORE = 15,
  GOLD_ORE = 16,
  DIAMOND_ORE = 17,
  SNOW = 18,
  ICE = 19,
  BUSH = 20,
  RED_FLOWER = 21,
  YELLOW_FLOWER = 22,
  CACTUS = 23,
  PALM_WOOD = 24,
  PALM_LEAVES = 25,
  DEAD_BUSH = 26,
  BAMBOO = 27,
  SNOW_LEAVES = 28,
  SNOW_BUSH = 29,
  WINTER_FLOWER = 30,
  // Tree decoration blocks
  FALLEN_LEAVES = 31, // Fallen leaves on ground around trees
  MOSS = 32, // Moss growing around tree base
  MUSHROOM_RED = 33, // Red mushroom in tree shade
  MUSHROOM_BROWN = 34, // Brown mushroom in tree shade
  VINE = 35, // Hanging vines from trees
  SNOW_VINE = 36, // White/frozen vines for winter trees
  PACKED_SAND = 37, // Compacted sand around palm trees
  // Beach decoration blocks
  PEBBLE = 38, // Small pebbles/rocks on beach
  // Ground decoration blocks
  STONE_PEBBLE = 39, // Small stone pebbles on grass/dirt
  SNOW_PEBBLE = 40, // Small white pebbles on snow
  // Beach decoration blocks
  STARFISH = 41, // Small 3D starfish on beach sand
  APPLE = 42, // Small collectible apple fruit on tree leaves
  BASKET = 43, // Craftable item container for apples
  BASKET_APPLES_1 = 44, // Placed basket containing one apple
  BASKET_APPLES_2 = 45, // Placed basket containing two apples
  BASKET_APPLES_3 = 46, // Placed basket containing three apples
  BASKET_APPLES_4 = 47, // Placed basket containing four apples
  ORANGE = 48, // Small collectible orange fruit on tree leaves
  PEACH = 49, // Small collectible peach fruit on tree leaves
  BANANA = 50, // Small collectible banana fruit on tree leaves
  FARMLAND_DRY = 51, // Tilled soil that grows crops slowly
  FARMLAND_WET = 52, // Moist tilled soil that grows crops faster
  WILD_WHEAT = 53, // Gatherable wild wheat patch
  WILD_RICE = 54, // Gatherable wild rice patch
  WHEAT_CROP_1 = 55, // Planted wheat seedling
  WHEAT_CROP_2 = 56, // Growing wheat crop
  WHEAT_CROP_3 = 57, // Heading wheat crop
  RICE_CROP_1 = 58, // Planted rice seedling
  RICE_CROP_2 = 59, // Growing rice crop
  RICE_CROP_3 = 60, // Heading rice crop
  WHEAT_SEEDS = 61, // Plantable wheat seeds
  RICE_SEEDS = 62, // Plantable rice seeds
  WHEAT = 63, // Harvested wheat ingredient
  RICE = 64, // Harvested rice ingredient
  WOODEN_HOE = 65, // Tool for tilling dirt and grass
  BREAD = 66, // Crafted wheat food
  RICE_BOWL = 67, // Crafted rice food
  WHEAT_CROP_4 = 68, // Fully mature wheat crop
  RICE_CROP_4 = 69, // Fully mature rice crop
  WOODEN_BUCKET = 70, // Empty bucket for collecting water
  WATER_BUCKET = 71, // Bucket filled from a water block
  FLOUR = 72, // Milled wheat ingredient
  DOUGH = 73, // Bread intermediate made from flour
}
