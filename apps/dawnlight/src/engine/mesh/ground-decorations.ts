/**
 * Ground decoration rendering - starfish, pebbles, moss, fallen leaves
 */
import { BlockType } from '../../types'
import { getTextureUV } from '../../utils/textures'
import type { MeshBuffers } from './types'
import { createSeededRandom } from './utils'

/**
 * Render a 3D starfish on beach sand
 */
export function renderStarfish(worldX: number, worldY: number, worldZ: number, buffers: MeshBuffers): void {
  const { solidVertices, solidNormals, solidUvs, solidIndices, solidColors } = buffers

  const baseUv = getTextureUV(BlockType.SAND, 'top')
  const uvPx = baseUv[0] + 0.01
  const uvPy = baseUv[1] + 0.01

  const random = createSeededRandom(worldX, worldZ)

  // Random position within the block
  const ox = random(1) * 0.4 + 0.3
  const oz = random(2) * 0.4 + 0.3
  const rotation = random(3) * Math.PI * 2

  // Starfish size
  const starSize = 0.25 + random(4) * 0.1
  const armLength = starSize * 0.8
  const armWidth = starSize * 0.15
  const starHeight = 0.06

  const scx = worldX + ox
  const scz = worldZ + oz
  const baseY = worldY + 0.001

  // Starfish colors - orange/coral with variation
  const colorVar = random(10)
  let baseR: number, baseG: number, baseB: number
  if (colorVar < 0.5) {
    baseR = 0.9 + random(11) * 0.1
    baseG = 0.35 + random(12) * 0.15
    baseB = 0.2 + random(13) * 0.1
  } else if (colorVar < 0.8) {
    baseR = 0.95 + random(11) * 0.05
    baseG = 0.5 + random(12) * 0.15
    baseB = 0.45 + random(13) * 0.1
  } else {
    baseR = 0.75 + random(11) * 0.15
    baseG = 0.2 + random(12) * 0.1
    baseB = 0.15 + random(13) * 0.1
  }

  // Draw 5 arms of the starfish
  for (let arm = 0; arm < 5; arm++) {
    const angle = rotation + (arm * Math.PI * 2) / 5
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const perpX = -sinA * armWidth
    const perpZ = cosA * armWidth
    const tipX = scx + cosA * armLength
    const tipZ = scz + sinA * armLength
    const base1X = scx + perpX,
      base1Z = scz + perpZ
    const base2X = scx - perpX,
      base2Z = scz - perpZ

    // Top face of arm (triangle)
    const bIdx = solidVertices.length / 3
    solidVertices.push(base1X, baseY + starHeight, base1Z, base2X, baseY + starHeight, base2Z, tipX, baseY + starHeight * 0.5, tipZ)
    for (let j = 0; j < 3; j++) {
      solidNormals.push(0, 1, 0)
      solidColors.push(baseR, baseG, baseB)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(bIdx, bIdx + 1, bIdx + 2)

    // Bottom face of arm (triangle)
    const bIdx2 = solidVertices.length / 3
    solidVertices.push(base2X, baseY, base2Z, base1X, baseY, base1Z, tipX, baseY, tipZ)
    for (let j = 0; j < 3; j++) {
      solidNormals.push(0, -1, 0)
      solidColors.push(baseR * 0.85, baseG * 0.85, baseB * 0.85)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(bIdx2, bIdx2 + 1, bIdx2 + 2)

    // Side faces
    const bIdx3 = solidVertices.length / 3
    solidVertices.push(base1X, baseY, base1Z, base1X, baseY + starHeight, base1Z, tipX, baseY + starHeight * 0.5, tipZ, tipX, baseY, tipZ)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(sinA, 0.3, -cosA)
      solidColors.push(baseR * 0.92, baseG * 0.92, baseB * 0.92)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(bIdx3, bIdx3 + 1, bIdx3 + 2, bIdx3, bIdx3 + 2, bIdx3 + 3)

    const bIdx4 = solidVertices.length / 3
    solidVertices.push(tipX, baseY, tipZ, tipX, baseY + starHeight * 0.5, tipZ, base2X, baseY + starHeight, base2Z, base2X, baseY, base2Z)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(-sinA, 0.3, cosA)
      solidColors.push(baseR * 0.88, baseG * 0.88, baseB * 0.88)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(bIdx4, bIdx4 + 1, bIdx4 + 2, bIdx4, bIdx4 + 2, bIdx4 + 3)
  }

  // Center body (pentagon top)
  const centerSize = starSize * 0.35
  const cIdx = solidVertices.length / 3
  for (let i = 0; i < 5; i++) {
    const angle = rotation + (i * Math.PI * 2) / 5
    solidVertices.push(scx + Math.cos(angle) * centerSize, baseY + starHeight, scz + Math.sin(angle) * centerSize)
  }
  for (let j = 0; j < 5; j++) {
    solidNormals.push(0, 1, 0)
    solidColors.push(baseR * 1.05, baseG * 1.05, baseB * 1.05)
  }
  solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
  solidIndices.push(cIdx, cIdx + 1, cIdx + 2, cIdx, cIdx + 2, cIdx + 3, cIdx, cIdx + 3, cIdx + 4)
}

/**
 * Render flat ground decorations (moss, fallen leaves)
 */
export function renderFlatGroundDecoration(worldX: number, worldY: number, worldZ: number, block: BlockType, buffers: MeshBuffers): void {
  const { foliageVertices, foliageNormals, foliageUvs, foliageIndices, foliageColors, foliageWindWeights } = buffers

  const uvData = getTextureUV(block, 'side')
  const [uMin, vMin, uMax, vMax] = uvData

  const baseIndex = foliageVertices.length / 3
  const flatY = worldY + 0.02 // Just slightly above ground to avoid z-fighting

  foliageVertices.push(worldX, flatY, worldZ, worldX + 1, flatY, worldZ, worldX + 1, flatY, worldZ + 1, worldX, flatY, worldZ + 1)

  for (let i = 0; i < 4; i++) {
    foliageNormals.push(0, 1, 0)
    foliageColors.push(1, 1, 1)
    foliageWindWeights.push(0.0)
  }

  foliageUvs.push(uMin, vMin, uMax, vMin, uMax, vMax, uMin, vMax)

  foliageIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
}

/**
 * Render 3D pebbles - small scattered cubes with solid colors
 */
export function renderPebbles(worldX: number, worldY: number, worldZ: number, block: BlockType, buffers: MeshBuffers): void {
  const { solidVertices, solidNormals, solidUvs, solidIndices, solidColors } = buffers

  // Use appropriate texture UV based on pebble type
  let baseUv: number[]
  if (block === BlockType.SNOW_PEBBLE) {
    baseUv = getTextureUV(BlockType.SNOW, 'top')
  } else if (block === BlockType.STONE_PEBBLE) {
    baseUv = getTextureUV(BlockType.STONE, 'top')
  } else {
    baseUv = getTextureUV(BlockType.SAND, 'top')
  }
  const uvPx = baseUv[0] + 0.01
  const uvPy = baseUv[1] + 0.01

  const random = createSeededRandom(worldX, worldZ)
  const count = 3 + Math.floor(random(0) * 3)

  for (let i = 0; i < count; i++) {
    const ox = random(i * 3 + 1) * 0.7 + 0.1
    const oz = random(i * 3 + 2) * 0.7 + 0.1
    const size = 0.1 + random(i * 3 + 3) * 0.15
    const height = size * 0.8

    const bx = worldX + ox
    const bz = worldZ + oz
    const by = worldY + 0.001

    // Base colors for pebbles
    let baseR: number, baseG: number, baseB: number
    const colorVar = random(i * 3 + 10)
    if (block === BlockType.SNOW_PEBBLE) {
      if (colorVar < 0.6) {
        const white = 0.9 + random(i * 3 + 11) * 0.1
        baseR = white
        baseG = white
        baseB = white
      } else if (colorVar < 0.85) {
        baseR = 0.88 + random(i * 3 + 11) * 0.08
        baseG = 0.9 + random(i * 3 + 11) * 0.08
        baseB = 0.95 + random(i * 3 + 11) * 0.05
      } else {
        const gray = 0.85 + random(i * 3 + 11) * 0.1
        baseR = gray
        baseG = gray
        baseB = gray + 0.02
      }
    } else if (block === BlockType.STONE_PEBBLE) {
      if (colorVar < 0.6) {
        const gray = 0.35 + random(i * 3 + 11) * 0.2
        baseR = gray
        baseG = gray
        baseB = gray
      } else if (colorVar < 0.85) {
        baseR = 0.4 + random(i * 3 + 11) * 0.1
        baseG = 0.38 + random(i * 3 + 11) * 0.08
        baseB = 0.35 + random(i * 3 + 11) * 0.05
      } else {
        baseR = 0.38 + random(i * 3 + 11) * 0.08
        baseG = 0.4 + random(i * 3 + 11) * 0.08
        baseB = 0.45 + random(i * 3 + 11) * 0.1
      }
    } else {
      if (colorVar < 0.5) {
        const gray = 0.45 + random(i * 3 + 11) * 0.25
        baseR = gray
        baseG = gray
        baseB = gray
      } else if (colorVar < 0.8) {
        baseR = 0.55 + random(i * 3 + 11) * 0.15
        baseG = 0.45 + random(i * 3 + 11) * 0.1
        baseB = 0.35 + random(i * 3 + 11) * 0.1
      } else {
        baseR = 0.4 + random(i * 3 + 11) * 0.1
        baseG = 0.45 + random(i * 3 + 11) * 0.1
        baseB = 0.5 + random(i * 3 + 11) * 0.1
      }
    }

    // Top face
    const baseIndex = solidVertices.length / 3
    solidVertices.push(bx, by + height, bz, bx, by + height, bz + size, bx + size, by + height, bz + size, bx + size, by + height, bz)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(0, 1, 0)
      solidColors.push(baseR, baseG, baseB)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)

    // Front face (z-)
    const idx2 = solidVertices.length / 3
    solidVertices.push(bx, by, bz, bx, by + height, bz, bx + size, by + height, bz, bx + size, by, bz)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(0, 0, -1)
      solidColors.push(baseR * 0.85, baseG * 0.85, baseB * 0.85)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(idx2, idx2 + 1, idx2 + 2, idx2, idx2 + 2, idx2 + 3)

    // Back face (z+)
    const idx3 = solidVertices.length / 3
    solidVertices.push(bx + size, by, bz + size, bx + size, by + height, bz + size, bx, by + height, bz + size, bx, by, bz + size)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(0, 0, 1)
      solidColors.push(baseR * 0.8, baseG * 0.8, baseB * 0.8)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(idx3, idx3 + 1, idx3 + 2, idx3, idx3 + 2, idx3 + 3)

    // Left face (x-)
    const idx4 = solidVertices.length / 3
    solidVertices.push(bx, by, bz + size, bx, by + height, bz + size, bx, by + height, bz, bx, by, bz)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(-1, 0, 0)
      solidColors.push(baseR * 0.7, baseG * 0.7, baseB * 0.7)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(idx4, idx4 + 1, idx4 + 2, idx4, idx4 + 2, idx4 + 3)

    // Right face (x+)
    const idx5 = solidVertices.length / 3
    solidVertices.push(bx + size, by, bz, bx + size, by + height, bz, bx + size, by + height, bz + size, bx + size, by, bz + size)
    for (let j = 0; j < 4; j++) {
      solidNormals.push(1, 0, 0)
      solidColors.push(baseR * 0.75, baseG * 0.75, baseB * 0.75)
    }
    solidUvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
    solidIndices.push(idx5, idx5 + 1, idx5 + 2, idx5, idx5 + 2, idx5 + 3)
  }
}
