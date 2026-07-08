/**
 * Special block rendering functions (vines, vegetation)
 * These are shared between 2D and 3D mesh builders
 */

import { BlockType } from '../../shared/block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../../shared/constants'
import type { FoliageMeshBuffers } from './types'
import { createSeededRandom3D, getBlockIndex3D, getTextureUV } from './utils'

// Re-export ground decorations from separate file
export { renderPebbles, renderStarfish } from './ground-decorations'

type FruitCuboid = {
  min: readonly [number, number, number]
  max: readonly [number, number, number]
}

const cuboidFaces = [
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1,
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.65,
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.82,
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.75,
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    shade: 0.7,
  },
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    shade: 0.78,
  },
] as const

const appleCuboids: readonly FruitCuboid[] = [
  { min: [0.19, 0.22, 0.19], max: [0.81, 0.74, 0.81] },
  { min: [0.29, 0.08, 0.29], max: [0.71, 0.28, 0.71] },
  { min: [0.29, 0.68, 0.29], max: [0.71, 0.88, 0.71] },
  { min: [0.14, 0.34, 0.29], max: [0.3, 0.62, 0.71] },
  { min: [0.7, 0.34, 0.29], max: [0.86, 0.62, 0.71] },
] as const

export function renderApple(worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const [uMin, vMin, uMax, vMax] = getTextureUV(BlockType.APPLE, 'side')
  const uMid = (uMin + uMax) / 2
  const vMid = (vMin + vMax) / 2

  for (const cuboid of appleCuboids) {
    for (const face of cuboidFaces) {
      const baseIndex = foliage.vertices.length / 3
      for (const corner of face.corners) {
        foliage.vertices.push(worldX + cuboid.min[0] + corner[0] * (cuboid.max[0] - cuboid.min[0]), worldY + cuboid.min[1] + corner[1] * (cuboid.max[1] - cuboid.min[1]), worldZ + cuboid.min[2] + corner[2] * (cuboid.max[2] - cuboid.min[2]))
        foliage.normals.push(...face.normal)
        foliage.colors.push(face.shade, face.shade, face.shade)
        foliage.windWeights.push(0.25)
      }
      foliage.uvs.push(uMid, vMid, uMid, vMid, uMid, vMid, uMid, vMid)
      foliage.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
    }
  }
}

/**
 * Render flat ground decorations (moss, fallen leaves)
 */
export function renderGroundDecoration(block: BlockType, worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const baseIndex = foliage.vertices.length / 3
  const flatY = worldY + 0.02

  foliage.vertices.push(worldX, flatY, worldZ, worldX + 1, flatY, worldZ, worldX + 1, flatY, worldZ + 1, worldX, flatY, worldZ + 1)

  for (let i = 0; i < 4; i++) {
    foliage.normals.push(0, 1, 0)
    foliage.colors.push(1, 1, 1)
    foliage.windWeights.push(0.0)
  }

  foliage.uvs.push(uMin, vMin, uMax, vMin, uMax, vMax, uMin, vMax)

  foliage.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
}

type AdjacentBlockChecker = (adjX: number, adjZ: number, localY: number) => BlockType

/**
 * Render vines (attached to walls or hanging)
 */
export function renderVine(block: BlockType, worldX: number, worldY: number, worldZ: number, x: number, z: number, localY: number, foliage: FoliageMeshBuffers, getAdjacentBlock: AdjacentBlockChecker): void {
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
    const adjX = x + dir.dx
    const adjZ = z + dir.dz
    const adjBlock = getAdjacentBlock(adjX, adjZ, localY)

    if (adjBlock === BlockType.WOOD || adjBlock === BlockType.LEAVES || adjBlock === BlockType.PALM_WOOD || adjBlock === BlockType.SNOW_LEAVES) {
      hasAttachment = true
      const baseIndex = foliage.vertices.length / 3

      if (dir.dx === 1) {
        foliage.vertices.push(worldX + 1 - vineOffset, worldY, worldZ, worldX + 1 - vineOffset, worldY, worldZ + 1, worldX + 1 - vineOffset, worldY + 1, worldZ + 1, worldX + 1 - vineOffset, worldY + 1, worldZ)
      } else if (dir.dx === -1) {
        foliage.vertices.push(worldX + vineOffset, worldY, worldZ + 1, worldX + vineOffset, worldY, worldZ, worldX + vineOffset, worldY + 1, worldZ, worldX + vineOffset, worldY + 1, worldZ + 1)
      } else if (dir.dz === 1) {
        foliage.vertices.push(worldX + 1, worldY, worldZ + 1 - vineOffset, worldX, worldY, worldZ + 1 - vineOffset, worldX, worldY + 1, worldZ + 1 - vineOffset, worldX + 1, worldY + 1, worldZ + 1 - vineOffset)
      } else {
        foliage.vertices.push(worldX, worldY, worldZ + vineOffset, worldX + 1, worldY, worldZ + vineOffset, worldX + 1, worldY + 1, worldZ + vineOffset, worldX, worldY + 1, worldZ + vineOffset)
      }

      for (let i = 0; i < 4; i++) {
        foliage.normals.push(dir.nx, 0, dir.nz)
        foliage.colors.push(1, 1, 1)
        foliage.windWeights.push(0.0)
      }

      foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

      foliage.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2, baseIndex)
    }
  }

  if (!hasAttachment) {
    const baseIndex = foliage.vertices.length / 3
    foliage.vertices.push(worldX + 0.2, worldY, worldZ + 0.2, worldX + 0.8, worldY, worldZ + 0.8, worldX + 0.8, worldY + 1, worldZ + 0.8, worldX + 0.2, worldY + 1, worldZ + 0.2)
    foliage.vertices.push(worldX + 0.2, worldY, worldZ + 0.8, worldX + 0.8, worldY, worldZ + 0.2, worldX + 0.8, worldY + 1, worldZ + 0.2, worldX + 0.2, worldY + 1, worldZ + 0.8)

    for (let i = 0; i < 8; i++) {
      foliage.normals.push(0, 1, 0)
      foliage.colors.push(1, 1, 1)
      foliage.windWeights.push(i % 4 >= 2 ? 0.4 : 0.0)
    }

    foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
    foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

    foliage.indices.push(
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
 * Render bush-type vegetation (cross-mesh)
 */
export function renderBush(block: BlockType, worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const seededRandom = createSeededRandom3D(worldX, worldY, worldZ)

  // Render 3 grass blade clusters at different heights for natural weed look
  const bladeCount = 3
  for (let b = 0; b < bladeCount; b++) {
    const baseIndex = foliage.vertices.length / 3

    // Each blade cluster has random height, position offset, size, and rotation
    const bladeHeight = 0.5 + seededRandom(b * 5 + 1) * 0.5 // 0.5 ~ 1.0
    const offsetX = (seededRandom(b * 5 + 2) - 0.5) * 0.25
    const offsetZ = (seededRandom(b * 5 + 3) - 0.5) * 0.25
    const bladeSize = 0.35 + seededRandom(b * 5 + 4) * 0.15 // 0.35 ~ 0.5
    const angle = (seededRandom(b * 5 + 5) * Math.PI) / 3

    const centerX = worldX + 0.5 + offsetX
    const centerZ = worldZ + 0.5 + offsetZ

    const cos1 = Math.cos(angle) * bladeSize
    const sin1 = Math.sin(angle) * bladeSize
    const cos2 = Math.cos(angle + Math.PI / 2) * bladeSize
    const sin2 = Math.sin(angle + Math.PI / 2) * bladeSize

    // First diagonal quad
    foliage.vertices.push(centerX - cos1, worldY, centerZ - sin1, centerX + cos1, worldY, centerZ + sin1, centerX + cos1, worldY + bladeHeight, centerZ + sin1, centerX - cos1, worldY + bladeHeight, centerZ - sin1)
    // Second diagonal quad (perpendicular)
    foliage.vertices.push(centerX - cos2, worldY, centerZ - sin2, centerX + cos2, worldY, centerZ + sin2, centerX + cos2, worldY + bladeHeight, centerZ + sin2, centerX - cos2, worldY + bladeHeight, centerZ - sin2)

    for (let i = 0; i < 8; i++) {
      foliage.normals.push(0, 1, 0)
      foliage.colors.push(1, 1, 1)
      foliage.windWeights.push(i % 4 >= 2 ? 1.0 : 0.0)
    }

    foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
    foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

    // Double-sided rendering
    foliage.indices.push(
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
 * Render bamboo (cross-mesh)
 */
export function renderBamboo(worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const uvData = getTextureUV(BlockType.BAMBOO, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const baseIndex = foliage.vertices.length / 3
  const blockHeight = 1.0

  foliage.vertices.push(worldX, worldY, worldZ, worldX + 1, worldY, worldZ + 1, worldX + 1, worldY + blockHeight, worldZ + 1, worldX, worldY + blockHeight, worldZ)
  foliage.vertices.push(worldX, worldY, worldZ + 1, worldX + 1, worldY, worldZ, worldX + 1, worldY + blockHeight, worldZ, worldX, worldY + blockHeight, worldZ + 1)

  for (let i = 0; i < 8; i++) {
    foliage.normals.push(0, 1, 0)
    foliage.colors.push(1, 1, 1)
    foliage.windWeights.push(i % 4 >= 2 ? 1.0 : 0.0)
  }

  foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
  foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

  foliage.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 4, baseIndex + 5, baseIndex + 6, baseIndex + 4, baseIndex + 6, baseIndex + 7)
}

/**
 * Render flower (cross-mesh)
 */
export function renderFlower(block: BlockType, worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const seededRandom = createSeededRandom3D(worldX, worldY, worldZ)

  const flowerCenterX = worldX + 0.5
  const flowerCenterZ = worldZ + 0.5
  const flowerHeight = 0.7
  const flowerSize = 0.3 + seededRandom(1) * 0.1
  const rotationOffset = (seededRandom(2) * Math.PI) / 2

  for (let q = 0; q < 2; q++) {
    const baseIndex = foliage.vertices.length / 3
    const angle = rotationOffset + (q * Math.PI) / 2
    const qCos = Math.cos(angle)
    const qSin = Math.sin(angle)

    foliage.vertices.push(
      flowerCenterX - qCos * flowerSize,
      worldY,
      flowerCenterZ - qSin * flowerSize,
      flowerCenterX + qCos * flowerSize,
      worldY,
      flowerCenterZ + qSin * flowerSize,
      flowerCenterX + qCos * flowerSize,
      worldY + flowerHeight,
      flowerCenterZ + qSin * flowerSize,
      flowerCenterX - qCos * flowerSize,
      worldY + flowerHeight,
      flowerCenterZ - qSin * flowerSize,
    )

    for (let i = 0; i < 4; i++) {
      foliage.normals.push(-qSin, 0, qCos)
      foliage.colors.push(1, 1, 1)
      foliage.windWeights.push(i >= 2 ? 0.6 : 0.0)
    }

    foliage.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

    foliage.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2, baseIndex)
  }
}

/**
 * Create adjacent block checker for 2D chunks
 */
export function createAdjacentBlockChecker2D(chunkData: Uint8Array, _localY: number): AdjacentBlockChecker {
  return (adjX: number, adjZ: number, y: number): BlockType => {
    if (adjX >= 0 && adjX < CHUNK_SIZE && adjZ >= 0 && adjZ < CHUNK_SIZE) {
      const adjIndex = adjX + y * CHUNK_SIZE + adjZ * CHUNK_SIZE * CHUNK_HEIGHT
      return chunkData[adjIndex] as BlockType
    }
    return BlockType.AIR
  }
}

/**
 * Create adjacent block checker for 3D chunks
 */
export function createAdjacentBlockChecker3D(chunkData: Uint8Array): AdjacentBlockChecker {
  return (adjX: number, adjZ: number, localY: number): BlockType => {
    if (adjX >= 0 && adjX < CHUNK_SIZE && adjZ >= 0 && adjZ < CHUNK_SIZE) {
      const adjIndex = getBlockIndex3D(adjX, localY, adjZ)
      return chunkData[adjIndex] as BlockType
    }
    return BlockType.AIR
  }
}
