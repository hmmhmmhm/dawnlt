import { getBasketWorldAppleCount } from '../../game/basket-utils'
import { BlockType } from '../../types'
import { getTextureUV } from '../../utils/textures'
import { faceData } from './face-definitions'
import type { MeshBuffers } from './types'

type Rgb = [number, number, number]
type Bounds = {
  min: [number, number, number]
  max: [number, number, number]
}

function pushCuboid(bounds: Bounds, worldX: number, worldY: number, worldZ: number, buffers: MeshBuffers, color: Rgb): void {
  const { solidVertices, solidNormals, solidUvs, solidIndices, solidColors } = buffers

  for (const [faceName, face] of Object.entries(faceData)) {
    const baseIndex = solidVertices.length / 3
    const [uMin, vMin, uMax, vMax] = getTextureUV(BlockType.SNOW, faceName === 'top' || faceName === 'bottom' ? faceName : 'side')
    const u = (uMin + uMax) / 2
    const v = (vMin + vMax) / 2

    for (const corner of face.corners) {
      solidVertices.push(worldX + bounds.min[0] + corner[0] * (bounds.max[0] - bounds.min[0]), worldY + bounds.min[1] + corner[1] * (bounds.max[1] - bounds.min[1]), worldZ + bounds.min[2] + corner[2] * (bounds.max[2] - bounds.min[2]))
      solidNormals.push(...face.dir)
      solidColors.push(color[0] * face.shade, color[1] * face.shade, color[2] * face.shade)
    }

    solidUvs.push(u, v, u, v, u, v, u, v)
    solidIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
  }
}

function pushBasketApple(centerX: number, centerY: number, centerZ: number, worldX: number, worldY: number, worldZ: number, buffers: MeshBuffers): void {
  const red: Rgb = [0.88, 0.05, 0.1]
  const darkRed: Rgb = [0.62, 0.02, 0.06]
  const lightRed: Rgb = [1, 0.16, 0.18]

  pushCuboid(
    {
      min: [centerX - 0.065, centerY - 0.07, centerZ - 0.065],
      max: [centerX + 0.065, centerY + 0.07, centerZ + 0.065],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    red,
  )
  pushCuboid(
    {
      min: [centerX - 0.09, centerY - 0.045, centerZ - 0.045],
      max: [centerX + 0.09, centerY + 0.045, centerZ + 0.045],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    darkRed,
  )
  pushCuboid(
    {
      min: [centerX - 0.045, centerY - 0.045, centerZ - 0.09],
      max: [centerX + 0.045, centerY + 0.045, centerZ + 0.09],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    red,
  )
  pushCuboid(
    {
      min: [centerX - 0.045, centerY + 0.035, centerZ - 0.045],
      max: [centerX + 0.045, centerY + 0.085, centerZ + 0.045],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    lightRed,
  )
  pushCuboid(
    {
      min: [centerX - 0.015, centerY + 0.07, centerZ - 0.015],
      max: [centerX + 0.015, centerY + 0.13, centerZ + 0.015],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    [0.32, 0.18, 0.08],
  )
  pushCuboid(
    {
      min: [centerX + 0.01, centerY + 0.1, centerZ - 0.035],
      max: [centerX + 0.075, centerY + 0.13, centerZ + 0.025],
    },
    worldX,
    worldY,
    worldZ,
    buffers,
    [0.18, 0.46, 0.12],
  )
}

export function renderBasket(worldX: number, worldY: number, worldZ: number, block: BlockType, buffers: MeshBuffers): void {
  const basketColor: Rgb = [0.62, 0.36, 0.16]
  const darkBasketColor: Rgb = [0.36, 0.2, 0.09]
  const lightBasketColor: Rgb = [0.78, 0.48, 0.22]
  const rimColor: Rgb = [0.9, 0.58, 0.28]

  pushCuboid({ min: [0.26, 0.02, 0.26], max: [0.74, 0.08, 0.74] }, worldX, worldY, worldZ, buffers, darkBasketColor)
  pushCuboid({ min: [0.21, 0.08, 0.21], max: [0.79, 0.14, 0.27] }, worldX, worldY, worldZ, buffers, basketColor)
  pushCuboid({ min: [0.21, 0.08, 0.73], max: [0.79, 0.14, 0.79] }, worldX, worldY, worldZ, buffers, darkBasketColor)
  pushCuboid({ min: [0.21, 0.08, 0.27], max: [0.27, 0.14, 0.73] }, worldX, worldY, worldZ, buffers, darkBasketColor)
  pushCuboid({ min: [0.73, 0.08, 0.27], max: [0.79, 0.14, 0.73] }, worldX, worldY, worldZ, buffers, basketColor)

  const sideRails: Array<[Bounds, Rgb]> = [
    [{ min: [0.17, 0.18, 0.16], max: [0.83, 0.23, 0.22] }, basketColor],
    [{ min: [0.17, 0.34, 0.16], max: [0.83, 0.39, 0.22] }, rimColor],
    [{ min: [0.17, 0.18, 0.78], max: [0.83, 0.23, 0.84] }, darkBasketColor],
    [{ min: [0.17, 0.34, 0.78], max: [0.83, 0.39, 0.84] }, basketColor],
    [{ min: [0.16, 0.18, 0.22], max: [0.22, 0.23, 0.78] }, darkBasketColor],
    [{ min: [0.16, 0.34, 0.22], max: [0.22, 0.39, 0.78] }, basketColor],
    [{ min: [0.78, 0.18, 0.22], max: [0.84, 0.23, 0.78] }, basketColor],
    [{ min: [0.78, 0.34, 0.22], max: [0.84, 0.39, 0.78] }, rimColor],
    [{ min: [0.15, 0.42, 0.15], max: [0.85, 0.5, 0.22] }, rimColor],
    [{ min: [0.15, 0.42, 0.78], max: [0.85, 0.5, 0.85] }, darkBasketColor],
    [{ min: [0.15, 0.42, 0.22], max: [0.22, 0.5, 0.78] }, darkBasketColor],
    [{ min: [0.78, 0.42, 0.22], max: [0.85, 0.5, 0.78] }, rimColor],
  ]
  for (const [bounds, color] of sideRails) {
    pushCuboid(bounds, worldX, worldY, worldZ, buffers, color)
  }

  for (const x of [0.25, 0.39, 0.53, 0.67]) {
    pushCuboid({ min: [x, 0.12, 0.15], max: [x + 0.045, 0.43, 0.22] }, worldX, worldY, worldZ, buffers, lightBasketColor)
    pushCuboid({ min: [x, 0.12, 0.78], max: [x + 0.045, 0.43, 0.85] }, worldX, worldY, worldZ, buffers, basketColor)
  }

  for (const z of [0.27, 0.42, 0.57, 0.69]) {
    pushCuboid({ min: [0.15, 0.12, z], max: [0.22, 0.43, z + 0.045] }, worldX, worldY, worldZ, buffers, basketColor)
    pushCuboid({ min: [0.78, 0.12, z], max: [0.85, 0.43, z + 0.045] }, worldX, worldY, worldZ, buffers, lightBasketColor)
  }

  pushCuboid({ min: [0.26, 0.36, 0.48], max: [0.32, 0.72, 0.55] }, worldX, worldY, worldZ, buffers, lightBasketColor)
  pushCuboid({ min: [0.68, 0.36, 0.48], max: [0.74, 0.72, 0.55] }, worldX, worldY, worldZ, buffers, lightBasketColor)
  pushCuboid({ min: [0.31, 0.67, 0.48], max: [0.43, 0.78, 0.55] }, worldX, worldY, worldZ, buffers, lightBasketColor)
  pushCuboid({ min: [0.42, 0.75, 0.48], max: [0.58, 0.84, 0.55] }, worldX, worldY, worldZ, buffers, rimColor)
  pushCuboid({ min: [0.57, 0.67, 0.48], max: [0.69, 0.78, 0.55] }, worldX, worldY, worldZ, buffers, lightBasketColor)

  const applePositions: Array<[number, number, number]> = [
    [0.4, 0.53, 0.4],
    [0.58, 0.55, 0.42],
    [0.46, 0.56, 0.59],
    [0.63, 0.52, 0.58],
  ]
  const appleCount = getBasketWorldAppleCount(block)
  for (let i = 0; i < appleCount; i++) {
    const [x, y, z] = applePositions[i]
    pushBasketApple(x, y, z, worldX, worldY, worldZ, buffers)
  }
}
