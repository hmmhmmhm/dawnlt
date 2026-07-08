import { BlockType } from '../../types'
import { drawBasket, drawBedrock, drawBrick, drawCobblestone, drawCraftingTableSide, drawCraftingTableTop, drawGlass, drawPlanks } from './building'
import { drawFallenLeaves, drawMoss, drawPebble, drawSnowPebble, drawSnowVine, drawStarfish, drawStonePebble, drawVine } from './decorative'
import { drawCactusSide, drawCactusTop, drawDeadBush, drawPalmLeaves, drawPalmWoodSide, drawPalmWoodTop } from './desert'
import { drawBread, drawDough, drawFarmland, drawFlourSack, drawRiceBowl, drawRiceCrop, drawRiceItem, drawRiceSeeds, drawWheatCrop, drawWheatItem, drawWheatSeeds, drawWildRice, drawWildWheat, drawWoodenBucket, drawWoodenHoe } from './farming'
import { drawCoalOre, drawDiamondOre, drawGoldOre, drawIronOre } from './ores'
import { drawApple, drawBamboo, drawBanana, drawBush, drawFlower, drawMushroomBrown, drawMushroomRed, drawOrange, drawPeach, drawSnowBush, drawWinterFlower } from './plants'
import { drawIce, drawSnow, drawSnowLeaves } from './snow-ice'
import { drawDirt, drawGrassSide, drawGrassTop, drawLeaves, drawPackedSand, drawSand, drawStone, drawWater, drawWoodSide, drawWoodTop } from './terrain'

export function drawToContext(ctx: CanvasRenderingContext2D, x: number, y: number, type: BlockType, face: string) {
  switch (type) {
    case BlockType.GRASS:
      if (face === 'top') drawGrassTop(ctx, x, y)
      else if (face === 'bottom') drawDirt(ctx, x, y)
      else drawGrassSide(ctx, x, y)
      break
    case BlockType.DIRT:
      drawDirt(ctx, x, y)
      break
    case BlockType.STONE:
      drawStone(ctx, x, y)
      break
    case BlockType.SAND:
      drawSand(ctx, x, y)
      break
    case BlockType.WATER:
      drawWater(ctx, x, y)
      break
    case BlockType.WOOD:
      if (face === 'top' || face === 'bottom') drawWoodTop(ctx, x, y)
      else drawWoodSide(ctx, x, y)
      break
    case BlockType.LEAVES:
      drawLeaves(ctx, x, y)
      break
    case BlockType.BUSH:
      drawBush(ctx, x, y)
      break
    case BlockType.DEAD_BUSH:
      drawDeadBush(ctx, x, y)
      break
    case BlockType.RED_FLOWER:
      drawFlower(ctx, x, y, '#ff2222')
      break
    case BlockType.YELLOW_FLOWER:
      drawFlower(ctx, x, y, '#ffff00')
      break
    case BlockType.CACTUS:
      if (face === 'top' || face === 'bottom') drawCactusTop(ctx, x, y)
      else drawCactusSide(ctx, x, y)
      break
    case BlockType.PALM_WOOD:
      if (face === 'top' || face === 'bottom') drawPalmWoodTop(ctx, x, y)
      else drawPalmWoodSide(ctx, x, y)
      break
    case BlockType.PALM_LEAVES:
      drawPalmLeaves(ctx, x, y)
      break
    case BlockType.SNOW_LEAVES:
      drawSnowLeaves(ctx, x, y)
      break
    case BlockType.SNOW_BUSH:
      drawSnowBush(ctx, x, y)
      break
    case BlockType.WINTER_FLOWER:
      drawWinterFlower(ctx, x, y)
      break
    case BlockType.BAMBOO:
      drawBamboo(ctx, x, y)
      break
    case BlockType.COBBLESTONE:
      drawCobblestone(ctx, x, y)
      break
    case BlockType.PLANKS:
      drawPlanks(ctx, x, y)
      break
    case BlockType.CRAFTING_TABLE:
      if (face === 'top') drawCraftingTableTop(ctx, x, y)
      else if (face === 'bottom') drawPlanks(ctx, x, y)
      else drawCraftingTableSide(ctx, x, y)
      break
    case BlockType.BEDROCK:
      drawBedrock(ctx, x, y)
      break
    case BlockType.GLASS:
      drawGlass(ctx, x, y)
      break
    case BlockType.BRICK:
      drawBrick(ctx, x, y)
      break
    case BlockType.COAL_ORE:
      drawCoalOre(ctx, x, y)
      break
    case BlockType.IRON_ORE:
      drawIronOre(ctx, x, y)
      break
    case BlockType.GOLD_ORE:
      drawGoldOre(ctx, x, y)
      break
    case BlockType.DIAMOND_ORE:
      drawDiamondOre(ctx, x, y)
      break
    case BlockType.SNOW:
      drawSnow(ctx, x, y)
      break
    case BlockType.ICE:
      drawIce(ctx, x, y)
      break
    case BlockType.FALLEN_LEAVES:
      drawFallenLeaves(ctx, x, y)
      break
    case BlockType.MOSS:
      drawMoss(ctx, x, y)
      break
    case BlockType.PEBBLE:
      drawPebble(ctx, x, y)
      break
    case BlockType.STONE_PEBBLE:
      drawStonePebble(ctx, x, y)
      break
    case BlockType.SNOW_PEBBLE:
      drawSnowPebble(ctx, x, y)
      break
    case BlockType.STARFISH:
      drawStarfish(ctx, x, y)
      break
    case BlockType.MUSHROOM_RED:
      drawMushroomRed(ctx, x, y)
      break
    case BlockType.MUSHROOM_BROWN:
      drawMushroomBrown(ctx, x, y)
      break
    case BlockType.VINE:
      drawVine(ctx, x, y)
      break
    case BlockType.SNOW_VINE:
      drawSnowVine(ctx, x, y)
      break
    case BlockType.APPLE:
      drawApple(ctx, x, y)
      break
    case BlockType.ORANGE:
      drawOrange(ctx, x, y)
      break
    case BlockType.PEACH:
      drawPeach(ctx, x, y)
      break
    case BlockType.BANANA:
      drawBanana(ctx, x, y)
      break
    case BlockType.FARMLAND_DRY:
      drawFarmland(ctx, x, y, false, face)
      break
    case BlockType.FARMLAND_WET:
      drawFarmland(ctx, x, y, true, face)
      break
    case BlockType.WILD_WHEAT:
      drawWildWheat(ctx, x, y)
      break
    case BlockType.WILD_RICE:
      drawWildRice(ctx, x, y)
      break
    case BlockType.WHEAT_CROP_1:
      drawWheatCrop(ctx, x, y, 1)
      break
    case BlockType.WHEAT_CROP_2:
      drawWheatCrop(ctx, x, y, 2)
      break
    case BlockType.WHEAT_CROP_3:
      drawWheatCrop(ctx, x, y, 3)
      break
    case BlockType.WHEAT_CROP_4:
      drawWheatCrop(ctx, x, y, 4)
      break
    case BlockType.RICE_CROP_1:
      drawRiceCrop(ctx, x, y, 1)
      break
    case BlockType.RICE_CROP_2:
      drawRiceCrop(ctx, x, y, 2)
      break
    case BlockType.RICE_CROP_3:
      drawRiceCrop(ctx, x, y, 3)
      break
    case BlockType.RICE_CROP_4:
      drawRiceCrop(ctx, x, y, 4)
      break
    case BlockType.WHEAT_SEEDS:
      drawWheatSeeds(ctx, x, y)
      break
    case BlockType.RICE_SEEDS:
      drawRiceSeeds(ctx, x, y)
      break
    case BlockType.WHEAT:
      drawWheatItem(ctx, x, y)
      break
    case BlockType.RICE:
      drawRiceItem(ctx, x, y)
      break
    case BlockType.WOODEN_HOE:
      drawWoodenHoe(ctx, x, y)
      break
    case BlockType.BREAD:
      drawBread(ctx, x, y)
      break
    case BlockType.RICE_BOWL:
      drawRiceBowl(ctx, x, y)
      break
    case BlockType.WOODEN_BUCKET:
      drawWoodenBucket(ctx, x, y, false)
      break
    case BlockType.WATER_BUCKET:
      drawWoodenBucket(ctx, x, y, true)
      break
    case BlockType.FLOUR:
      drawFlourSack(ctx, x, y)
      break
    case BlockType.DOUGH:
      drawDough(ctx, x, y)
      break
    case BlockType.BASKET:
      drawBasket(ctx, x, y, 0)
      break
    case BlockType.BASKET_APPLES_1:
      drawBasket(ctx, x, y, 1)
      break
    case BlockType.BASKET_APPLES_2:
      drawBasket(ctx, x, y, 2)
      break
    case BlockType.BASKET_APPLES_3:
      drawBasket(ctx, x, y, 3)
      break
    case BlockType.BASKET_APPLES_4:
      drawBasket(ctx, x, y, 4)
      break
    case BlockType.PACKED_SAND:
      drawPackedSand(ctx, x, y)
      break
    default:
      ctx.fillStyle = '#ff00ff'
      ctx.fillRect(x, y, 16, 16)
  }
}

import { blockUVs } from './atlas'

export function getTextureUV(type: BlockType, face: string) {
  const key = `${type}:${face}`
  return blockUVs[key] || blockUVs[`${BlockType.DIRT}:side`]
}
