import type { Season } from './types'

export const TEXTURE_SIZE = 16
export const ATLAS_SIZE = 256

// Canvas for texture atlas
export const atlasCanvas = document.createElement('canvas')
export const atlasCtx = atlasCanvas.getContext('2d')!
atlasCanvas.width = ATLAS_SIZE
atlasCanvas.height = ATLAS_SIZE
atlasCtx.imageSmoothingEnabled = false

// Canvas for individual textures
export const textureCanvas = document.createElement('canvas')
export const textureCtx = textureCanvas.getContext('2d')!
textureCanvas.width = TEXTURE_SIZE
textureCanvas.height = TEXTURE_SIZE
textureCtx.imageSmoothingEnabled = false

// Season state
let currentSeason: Season = 'summer'

export function getCurrentSeason(): Season {
  return currentSeason
}

export function setCurrentSeason(season: Season): void {
  currentSeason = season
}
