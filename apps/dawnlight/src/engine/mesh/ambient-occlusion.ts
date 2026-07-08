import { isSolid } from '../../shared/block-utils'
import type { GetBlockFn } from './types'

// AO (Ambient Occlusion) factors for different occlusion levels
export const AO_FACTORS = [1.0, 0.8, 0.6, 0.4]

/**
 * Calculate ambient occlusion for a vertex corner
 * @param worldX - World X position of the block
 * @param worldY - World Y position of the block
 * @param worldZ - World Z position of the block
 * @param faceDir - Direction of the face normal
 * @param corner - Corner position [0-1, 0-1, 0-1]
 * @param getBlock - Function to get block at position
 * @returns AO factor (1.0 = no occlusion, 0.4 = maximum occlusion)
 */
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
