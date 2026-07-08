/**
 * Vine rendering - flat quads on adjacent solid blocks or cross-mesh if hanging
 */

import { CHUNK_HEIGHT, CHUNK_SIZE } from '../../constants'
import { BlockType } from '../../types'
import { getTextureUV } from '../../utils/textures'
import { getBlockIndex3D } from '../world'
import type { MeshBuffers } from './types'

export interface VineAdjacentChecker {
  getAdjacentBlock: (localX: number, localY: number, localZ: number, dx: number, dz: number) => BlockType
}

/**
 * Render vines - flat quad on adjacent solid blocks or cross-mesh if hanging
 */
export function renderVines(worldX: number, worldY: number, worldZ: number, localX: number, localY: number, localZ: number, block: BlockType, buffers: MeshBuffers, checker: VineAdjacentChecker): void {
  const { foliageVertices, foliageNormals, foliageUvs, foliageIndices, foliageColors, foliageWindWeights } = buffers

  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const adjacentDirs = [
    { dx: 1, dz: 0, nx: -1, nz: 0 },
    { dx: -1, dz: 0, nx: 1, nz: 0 },
    { dx: 0, dz: 1, nx: 0, nz: -1 },
    { dx: 0, dz: -1, nx: 0, nz: 1 },
  ]

  let hasAttachment = false
  const vineOffset = 0.02

  for (const dir of adjacentDirs) {
    const adjBlock = checker.getAdjacentBlock(localX, localY, localZ, dir.dx, dir.dz)

    if (adjBlock === BlockType.WOOD || adjBlock === BlockType.LEAVES || adjBlock === BlockType.PALM_WOOD || adjBlock === BlockType.SNOW_LEAVES) {
      hasAttachment = true
      const baseIndex = foliageVertices.length / 3

      if (dir.dx === 1) {
        foliageVertices.push(worldX + 1 - vineOffset, worldY, worldZ, worldX + 1 - vineOffset, worldY, worldZ + 1, worldX + 1 - vineOffset, worldY + 1, worldZ + 1, worldX + 1 - vineOffset, worldY + 1, worldZ)
      } else if (dir.dx === -1) {
        foliageVertices.push(worldX + vineOffset, worldY, worldZ + 1, worldX + vineOffset, worldY, worldZ, worldX + vineOffset, worldY + 1, worldZ, worldX + vineOffset, worldY + 1, worldZ + 1)
      } else if (dir.dz === 1) {
        foliageVertices.push(worldX + 1, worldY, worldZ + 1 - vineOffset, worldX, worldY, worldZ + 1 - vineOffset, worldX, worldY + 1, worldZ + 1 - vineOffset, worldX + 1, worldY + 1, worldZ + 1 - vineOffset)
      } else {
        foliageVertices.push(worldX, worldY, worldZ + vineOffset, worldX + 1, worldY, worldZ + vineOffset, worldX + 1, worldY + 1, worldZ + vineOffset, worldX, worldY + 1, worldZ + vineOffset)
      }

      for (let i = 0; i < 4; i++) {
        foliageNormals.push(dir.nx, 0, dir.nz)
        foliageColors.push(1, 1, 1)
        foliageWindWeights.push(0.0)
      }

      foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

      foliageIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2, baseIndex)
    }
  }

  if (!hasAttachment) {
    const baseIndex = foliageVertices.length / 3
    foliageVertices.push(worldX + 0.2, worldY, worldZ + 0.2, worldX + 0.8, worldY, worldZ + 0.8, worldX + 0.8, worldY + 1, worldZ + 0.8, worldX + 0.2, worldY + 1, worldZ + 0.2)
    foliageVertices.push(worldX + 0.2, worldY, worldZ + 0.8, worldX + 0.8, worldY, worldZ + 0.2, worldX + 0.8, worldY + 1, worldZ + 0.2, worldX + 0.2, worldY + 1, worldZ + 0.8)

    for (let i = 0; i < 8; i++) {
      foliageNormals.push(0, 1, 0)
      foliageColors.push(1, 1, 1)
      foliageWindWeights.push(i % 4 >= 2 ? 0.4 : 0.0)
    }

    foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
    foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

    foliageIndices.push(
      baseIndex,
      baseIndex + 1,
      baseIndex + 2,
      baseIndex,
      baseIndex + 2,
      baseIndex + 3,
      baseIndex + 2,
      baseIndex + 1,
      baseIndex,
      baseIndex + 3,
      baseIndex + 2,
      baseIndex,
      baseIndex + 4,
      baseIndex + 5,
      baseIndex + 6,
      baseIndex + 4,
      baseIndex + 6,
      baseIndex + 7,
      baseIndex + 6,
      baseIndex + 5,
      baseIndex + 4,
      baseIndex + 7,
      baseIndex + 6,
      baseIndex + 4,
    )
  }
}

/**
 * Helper to create vine checker for 2D chunks
 */
export function createVineChecker2D(_x: number, _y: number, _z: number, chunkData: Uint8Array): VineAdjacentChecker {
  return {
    getAdjacentBlock: (localX: number, localY: number, localZ: number, dx: number, dz: number) => {
      const adjX = localX + dx
      const adjZ = localZ + dz
      if (adjX >= 0 && adjX < CHUNK_SIZE && adjZ >= 0 && adjZ < CHUNK_SIZE) {
        const adjIndex = adjX + localY * CHUNK_SIZE + adjZ * CHUNK_SIZE * CHUNK_HEIGHT
        return chunkData[adjIndex] as BlockType
      }
      return BlockType.AIR
    },
  }
}

/**
 * Helper to create vine checker for 3D chunks
 */
export function createVineChecker3D(chunkData: Uint8Array): VineAdjacentChecker {
  return {
    getAdjacentBlock: (localX: number, localY: number, localZ: number, dx: number, dz: number) => {
      const adjX = localX + dx
      const adjZ = localZ + dz
      if (adjX >= 0 && adjX < CHUNK_SIZE && adjZ >= 0 && adjZ < CHUNK_SIZE) {
        const adjIndex = getBlockIndex3D(adjX, localY, adjZ)
        return chunkData[adjIndex] as BlockType
      }
      return BlockType.AIR
    },
  }
}
