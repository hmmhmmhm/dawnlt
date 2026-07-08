/**
 * Shared module - exports all shared code for main thread and workers
 * None of these modules have DOM/THREE.js dependencies
 */

export { BlockType } from './block-types'
export {
  isBlockOpaque,
  isBlockTransparent,
  isCrossMeshBlock,
  isFluidBlock,
  isFoliageBlock,
  isGeneratedModelOnlyBlock,
  isSolid,
} from './block-utils'
export {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  CHUNK_Y_COUNT,
  CHUNK_Y_SIZE,
  TREE_DENSITY,
  WATER_LEVEL,
} from './constants'
export { SimplexNoise } from './noise'
export { WorldGenerator } from './world-generator/index'
