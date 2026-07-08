// Re-export types

// Re-export atlas and texture data
export { blockTextureImages, blockUVs, initializeTextures, textureAtlas } from './atlas'

// Re-export constants
export { ATLAS_SIZE, setCurrentSeason, TEXTURE_SIZE } from './constants'
// Re-export dispatcher functions
export { getTextureUV } from './dispatcher'

// Re-export effects
export {
  createFireflyTexture,
  createLensflareTexture,
  createMoonTexture,
  createRainTexture,
  createSnowTexture,
  createSunTexture,
} from './effects'
export type { Season } from './types'

import { initializeTextures } from './atlas'
// Import for setSeason wrapper
import { setCurrentSeason } from './constants'
import type { Season } from './types'

/**
 * Set the current season and reinitialize textures
 */
export function setSeason(season: Season) {
  setCurrentSeason(season)
  initializeTextures()
}
