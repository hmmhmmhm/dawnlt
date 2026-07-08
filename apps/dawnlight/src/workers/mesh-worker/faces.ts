/**
 * Face definitions and ambient occlusion calculations
 */

import type { GetBlockFn } from './types'
import { isBlockTransparent } from './utils'

// Face definitions
export const faceData: Record<
  string,
  {
    dir: [number, number, number]
    corners: [number, number, number][]
    shade: number
  }
> = {
  top: {
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1.0,
  },
  bottom: {
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.5,
  },
  front: {
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.8,
  },
  back: {
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.8,
  },
  right: {
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    shade: 0.7,
  },
  left: {
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    shade: 0.7,
  },
}

// AO constants
export const AO_FACTORS = [1.0, 0.8, 0.6, 0.4]

function isSolid(block: number): boolean {
  return !isBlockTransparent(block)
}

export function calculateAO(worldX: number, worldY: number, worldZ: number, faceDir: [number, number, number], corner: number[], getBlock: GetBlockFn): number {
  let axis1 = 0,
    axis2 = 0
  if (faceDir[0] !== 0) {
    axis1 = 1
    axis2 = 2
  } else if (faceDir[1] !== 0) {
    axis1 = 0
    axis2 = 2
  } else {
    axis1 = 0
    axis2 = 1
  }

  const airX = worldX + faceDir[0]
  const airY = worldY + faceDir[1]
  const airZ = worldZ + faceDir[2]

  const off1 = corner[axis1] === 1 ? 1 : -1
  const off2 = corner[axis2] === 1 ? 1 : -1

  const n1x = airX + (axis1 === 0 ? off1 : 0)
  const n1y = airY + (axis1 === 1 ? off1 : 0)
  const n1z = airZ + (axis1 === 2 ? off1 : 0)

  const n2x = airX + (axis2 === 0 ? off2 : 0)
  const n2y = airY + (axis2 === 1 ? off2 : 0)
  const n2z = airZ + (axis2 === 2 ? off2 : 0)

  const cx = airX + (axis1 === 0 ? off1 : 0) + (axis2 === 0 ? off2 : 0)
  const cy = airY + (axis1 === 1 ? off1 : 0) + (axis2 === 1 ? off2 : 0)
  const cz = airZ + (axis1 === 2 ? off1 : 0) + (axis2 === 2 ? off2 : 0)

  const s1 = isSolid(getBlock(n1x, n1y, n1z))
  const s2 = isSolid(getBlock(n2x, n2y, n2z))
  const sc = isSolid(getBlock(cx, cy, cz))

  if (s1 && s2) return AO_FACTORS[3]
  return AO_FACTORS[(s1 ? 1 : 0) + (s2 ? 1 : 0) + (sc ? 1 : 0)]
}
