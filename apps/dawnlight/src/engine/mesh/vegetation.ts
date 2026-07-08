/**
 * Vegetation rendering - bush, flower, bamboo, mushroom
 */
import { BlockType } from '../../types'
import { getTextureUV } from '../../utils/textures'
import type { MeshBuffers } from './types'

type FruitFace = {
  normal: [number, number, number]
  corners: [number, number, number][]
  shade: number
}

type FruitCuboid = {
  min: [number, number, number]
  max: [number, number, number]
  color: [number, number, number]
  pixel: [number, number]
}

const cuboidFaces: FruitFace[] = [
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
]

const appleCuboids: FruitCuboid[] = [
  { min: [0.28, 0.26, 0.28], max: [0.72, 0.68, 0.72], color: [0.95, 0.08, 0.1], pixel: [7, 8] },
  { min: [0.34, 0.18, 0.34], max: [0.66, 0.32, 0.66], color: [0.7, 0.03, 0.06], pixel: [10, 12] },
  { min: [0.35, 0.62, 0.35], max: [0.65, 0.76, 0.65], color: [1, 0.18, 0.16], pixel: [5, 5] },
  { min: [0.22, 0.36, 0.34], max: [0.34, 0.58, 0.66], color: [0.72, 0.02, 0.05], pixel: [12, 9] },
  { min: [0.66, 0.36, 0.34], max: [0.78, 0.58, 0.66], color: [0.88, 0.05, 0.08], pixel: [6, 8] },
  { min: [0.48, 0.75, 0.47], max: [0.52, 0.86, 0.53], color: [0.5, 0.24, 0.08], pixel: [7, 2] },
  { min: [0.52, 0.78, 0.45], max: [0.66, 0.84, 0.57], color: [0.2, 0.58, 0.12], pixel: [10, 3] },
]

function appleUvAt(uMin: number, vMin: number, uMax: number, vMax: number, pixelX: number, pixelY: number): [number, number] {
  const u = uMin + ((pixelX + 0.5) / 16) * (uMax - uMin)
  const v = vMax - ((pixelY + 0.5) / 16) * (vMax - vMin)
  return [u, v]
}

export function renderAppleFruit(worldX: number, worldY: number, worldZ: number, buffers: MeshBuffers): void {
  const { foliageVertices, foliageNormals, foliageUvs, foliageIndices, foliageColors, foliageWindWeights } = buffers
  const [uMin, vMin, uMax, vMax] = getTextureUV(BlockType.APPLE, 'side')

  for (const cuboid of appleCuboids) {
    const [u, v] = appleUvAt(uMin, vMin, uMax, vMax, cuboid.pixel[0], cuboid.pixel[1])
    for (const face of cuboidFaces) {
      const baseIndex = foliageVertices.length / 3
      for (const corner of face.corners) {
        foliageVertices.push(worldX + cuboid.min[0] + corner[0] * (cuboid.max[0] - cuboid.min[0]), worldY + cuboid.min[1] + corner[1] * (cuboid.max[1] - cuboid.min[1]), worldZ + cuboid.min[2] + corner[2] * (cuboid.max[2] - cuboid.min[2]))
        foliageNormals.push(...face.normal)
        foliageColors.push(cuboid.color[0] * face.shade, cuboid.color[1] * face.shade, cuboid.color[2] * face.shade)
        foliageWindWeights.push(0.25)
      }
      foliageUvs.push(u, v, u, v, u, v, u, v)
      foliageIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
    }
  }
}

/**
 * Render vegetation (bush, flower, bamboo, mushroom)
 */
export function renderVegetation(worldX: number, worldY: number, worldZ: number, block: BlockType, buffers: MeshBuffers): void {
  const { foliageVertices, foliageNormals, foliageUvs, foliageIndices, foliageColors, foliageWindWeights } = buffers

  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const isBushType = block === BlockType.BUSH || block === BlockType.SNOW_BUSH || block === BlockType.DEAD_BUSH

  if (isBushType) {
    // Seeded random for deterministic per-position variation
    const bushSeed = worldX * 73856093 + worldY * 19349663 + worldZ * 83492791
    const bushRandom = (offset: number) => {
      const n = Math.sin(bushSeed + offset) * 43758.5453123
      return n - Math.floor(n)
    }

    // Render 3 grass blade clusters at different heights for natural weed look
    const bladeCount = 3
    for (let b = 0; b < bladeCount; b++) {
      const baseIndex = foliageVertices.length / 3

      // Each blade cluster has random height, position offset, size, and rotation
      const bladeHeight = 0.5 + bushRandom(b * 5 + 1) * 0.5 // 0.5 ~ 1.0
      const offsetX = (bushRandom(b * 5 + 2) - 0.5) * 0.25
      const offsetZ = (bushRandom(b * 5 + 3) - 0.5) * 0.25
      const bladeSize = 0.35 + bushRandom(b * 5 + 4) * 0.15 // 0.35 ~ 0.5
      const angle = (bushRandom(b * 5 + 5) * Math.PI) / 3

      const centerX = worldX + 0.5 + offsetX
      const centerZ = worldZ + 0.5 + offsetZ

      const cos1 = Math.cos(angle) * bladeSize
      const sin1 = Math.sin(angle) * bladeSize
      const cos2 = Math.cos(angle + Math.PI / 2) * bladeSize
      const sin2 = Math.sin(angle + Math.PI / 2) * bladeSize

      // First diagonal quad
      foliageVertices.push(centerX - cos1, worldY, centerZ - sin1, centerX + cos1, worldY, centerZ + sin1, centerX + cos1, worldY + bladeHeight, centerZ + sin1, centerX - cos1, worldY + bladeHeight, centerZ - sin1)
      // Second diagonal quad (perpendicular)
      foliageVertices.push(centerX - cos2, worldY, centerZ - sin2, centerX + cos2, worldY, centerZ + sin2, centerX + cos2, worldY + bladeHeight, centerZ + sin2, centerX - cos2, worldY + bladeHeight, centerZ - sin2)

      for (let i = 0; i < 8; i++) {
        foliageNormals.push(0, 1, 0)
        foliageColors.push(1, 1, 1)
        foliageWindWeights.push(i % 4 >= 2 ? 1.0 : 0.0)
      }

      foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
      foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

      // Double-sided rendering
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
  } else if (block === BlockType.BAMBOO) {
    // Cross-mesh for bamboo
    const baseIndex = foliageVertices.length / 3
    const blockHeight = 1.0

    foliageVertices.push(worldX, worldY, worldZ, worldX + 1, worldY, worldZ + 1, worldX + 1, worldY + blockHeight, worldZ + 1, worldX, worldY + blockHeight, worldZ)
    foliageVertices.push(worldX, worldY, worldZ + 1, worldX + 1, worldY, worldZ, worldX + 1, worldY + blockHeight, worldZ, worldX, worldY + blockHeight, worldZ + 1)

    for (let i = 0; i < 8; i++) {
      foliageNormals.push(0, 1, 0)
      foliageColors.push(1, 1, 1)
      foliageWindWeights.push(i % 4 >= 2 ? 1.0 : 0.0)
    }

    foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
    foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

    foliageIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 4, baseIndex + 5, baseIndex + 6, baseIndex + 4, baseIndex + 6, baseIndex + 7)
  } else {
    // Simple cross-mesh flower rendering (2 crossed vertical quads)
    const seed = worldX * 73856093 + worldY * 19349663 + worldZ * 83492791
    const seededRandom = (offset: number) => {
      const n = Math.sin(seed + offset) * 43758.5453123
      return n - Math.floor(n)
    }

    // Flower position within block (centered)
    const flowerCenterX = worldX + 0.5
    const flowerCenterZ = worldZ + 0.5
    const flowerHeight = 0.7
    const flowerSize = 0.3 + seededRandom(1) * 0.1
    const rotationOffset = (seededRandom(2) * Math.PI) / 2

    // 2 crossed vertical quads at 90 degrees
    for (let q = 0; q < 2; q++) {
      const baseIndex = foliageVertices.length / 3
      const angle = rotationOffset + (q * Math.PI) / 2
      const qCos = Math.cos(angle)
      const qSin = Math.sin(angle)

      foliageVertices.push(
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
        foliageNormals.push(-qSin, 0, qCos)
        foliageColors.push(1, 1, 1)
        foliageWindWeights.push(i >= 2 ? 0.6 : 0.0)
      }

      foliageUvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)

      // Double-sided
      foliageIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 2, baseIndex + 1, baseIndex, baseIndex + 3, baseIndex + 2, baseIndex)
    }
  }
}
