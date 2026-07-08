import { CanvasTexture, NearestFilter, SRGBColorSpace, type Texture } from 'three'
import { isFarmingItemOnly } from '../../game/farming-utils'
import { BlockType } from '../../types'
import { ATLAS_SIZE, atlasCanvas, atlasCtx, TEXTURE_SIZE } from './constants'
import { drawToContext } from './dispatcher'

export const blockTextureImages: Record<number, string> = {}
export let textureAtlas: Texture | null = null
export const blockUVs: Record<string, number[]> = {}

export function usesFlatHudIcon(type: BlockType): boolean {
  return type === BlockType.BASKET || type === BlockType.BASKET_APPLES_1 || type === BlockType.BASKET_APPLES_2 || type === BlockType.BASKET_APPLES_3 || type === BlockType.BASKET_APPLES_4 || isFarmingItemOnly(type)
}

export function initializeTextures() {
  const faces = ['top', 'bottom', 'side']
  let currentX = 0
  let currentY = 0

  atlasCtx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE)

  const hudCanvas = document.createElement('canvas')
  hudCanvas.width = 32
  hudCanvas.height = 32
  const hudCtx = hudCanvas.getContext('2d')!
  hudCtx.imageSmoothingEnabled = false

  const drawFace = (type: BlockType, face: string, darken: number = 0) => {
    const faceC = document.createElement('canvas')
    faceC.width = 16
    faceC.height = 16
    const faceCtx = faceC.getContext('2d')!
    drawToContext(faceCtx, 0, 0, type, face)

    if (darken > 0) {
      faceCtx.fillStyle = `rgba(0, 0, 0, ${darken})`
      faceCtx.fillRect(0, 0, 16, 16)
    }
    return faceC
  }

  for (let type = 1; type <= BlockType.DOUGH; type++) {
    hudCtx.clearRect(0, 0, 32, 32)

    if (usesFlatHudIcon(type as BlockType)) {
      const itemFace = drawFace(type as BlockType, 'side')
      hudCtx.setTransform(2, 0, 0, 2, 0, 0)
      hudCtx.drawImage(itemFace, 0, 0)
      hudCtx.setTransform(1, 0, 0, 1, 0, 0)
    } else {
      const topFace = drawFace(type as BlockType, 'top')
      hudCtx.setTransform(1, 0.5, -1, 0.5, 16, 0)
      hudCtx.drawImage(topFace, 0, 0)

      const leftFace = drawFace(type as BlockType, 'side', 0.2)
      hudCtx.setTransform(1, 0.5, 0, 1, 0, 8)
      hudCtx.drawImage(leftFace, 0, 0)

      const rightFace = drawFace(type as BlockType, 'side', 0.4)
      hudCtx.setTransform(1, -0.5, 0, 1, 16, 16)
      hudCtx.drawImage(rightFace, 0, 0)

      hudCtx.setTransform(1, 0, 0, 1, 0, 0)
    }

    blockTextureImages[type] = hudCanvas.toDataURL()

    faces.forEach((face) => {
      const u = currentX / ATLAS_SIZE
      const v = 1 - (currentY + TEXTURE_SIZE) / ATLAS_SIZE
      const w = TEXTURE_SIZE / ATLAS_SIZE
      const h = TEXTURE_SIZE / ATLAS_SIZE

      drawToContext(atlasCtx, currentX, currentY, type as BlockType, face)

      if (face === 'side') {
        blockUVs[`${type}:front`] = [u, v, u + w, v + h]
        blockUVs[`${type}:back`] = [u, v, u + w, v + h]
        blockUVs[`${type}:left`] = [u, v, u + w, v + h]
        blockUVs[`${type}:right`] = [u, v, u + w, v + h]
        blockUVs[`${type}:side`] = [u, v, u + w, v + h]
      } else {
        blockUVs[`${type}:${face}`] = [u, v, u + w, v + h]
      }

      currentX += TEXTURE_SIZE
      if (currentX >= ATLAS_SIZE) {
        currentX = 0
        currentY += TEXTURE_SIZE
      }
    })
  }

  if (!textureAtlas) {
    textureAtlas = new CanvasTexture(atlasCanvas)
    textureAtlas.magFilter = NearestFilter
    textureAtlas.minFilter = NearestFilter
    textureAtlas.colorSpace = SRGBColorSpace
  } else {
    textureAtlas.needsUpdate = true
  }
}
