import type { Scene } from 'three'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import { isBlockTransparent, isGeneratedModelOnlyBlock } from '../../shared/block-utils'
import { BlockType, type ChunkMeshData } from '../../types'
import { getTextureUV } from '../../utils/textures'
import { getBlock3D, getBlockIndex3D, getChunk3DYRange } from '../world'
import { calculateAO } from './ambient-occlusion'
import { faceData } from './face-definitions'
import { buildMeshesFromBuffers } from './geometry'
import { renderFlatGroundDecoration, renderPebbles, renderStarfish } from './ground-decorations'
import { renderMushroom } from './mushroom'
import { createMeshBuffers, type MeshBuffers } from './types'
import { renderVegetation } from './vegetation'
import { createVineChecker3D, renderVines } from './vines'

/**
 * Process standard block faces for 3D chunks (solid, transparent, foliage, fluid)
 */
function processStandardBlock3D(block: BlockType, worldX: number, worldY: number, worldZ: number, buffers: MeshBuffers, chunks3D: Map<string, Uint8Array>): void {
  const isFoliage = block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES
  const isFluid = block === BlockType.WATER
  const isTransparent = block === BlockType.GLASS

  let vertices: number[], normals: number[], uvs: number[], indices: number[], colors: number[]

  if (isFoliage) {
    vertices = buffers.foliageVertices
    normals = buffers.foliageNormals
    uvs = buffers.foliageUvs
    indices = buffers.foliageIndices
    colors = buffers.foliageColors
  } else if (isFluid) {
    vertices = buffers.fluidVertices
    normals = buffers.fluidNormals
    uvs = buffers.fluidUvs
    indices = buffers.fluidIndices
    colors = buffers.fluidColors
  } else if (isTransparent) {
    vertices = buffers.transparentVertices
    normals = buffers.transparentNormals
    uvs = buffers.transparentUvs
    indices = buffers.transparentIndices
    colors = buffers.transparentColors
  } else {
    vertices = buffers.solidVertices
    normals = buffers.solidNormals
    uvs = buffers.solidUvs
    indices = buffers.solidIndices
    colors = buffers.solidColors
  }

  for (const [faceName, face] of Object.entries(faceData)) {
    const neighborX = worldX + face.dir[0]
    const neighborY = worldY + face.dir[1]
    const neighborZ = worldZ + face.dir[2]

    // For water blocks, assume missing chunks contain water (to avoid grid lines at chunk boundaries)
    const defaultBlock = isFluid ? BlockType.WATER : false
    const neighbor = getBlock3D(neighborX, neighborY, neighborZ, chunks3D, defaultBlock)

    // Determine if face should be rendered
    let shouldRender = false

    if (isFluid) {
      // Water rendering: show faces where water meets air or solid blocks
      if (neighbor === BlockType.WATER) {
        // Don't render faces between water blocks
        continue
      }
      if (faceName === 'top') {
        // Top face: only render if exposed to air
        shouldRender = neighbor === BlockType.AIR
      } else if (faceName === 'bottom') {
        // Bottom face: skip (water doesn't need bottom face)
        continue
      } else {
        // Side faces: render if neighbor is air (edge of water) or solid block (water meets land)
        shouldRender = neighbor === BlockType.AIR || !isBlockTransparent(neighbor)
      }
    } else if (isFoliage || isTransparent) {
      shouldRender = neighbor !== block && isBlockTransparent(neighbor)
    } else {
      shouldRender = isBlockTransparent(neighbor)
    }

    if (shouldRender) {
      const baseIndex = vertices.length / 3
      if (isFoliage) buffers.foliageWindWeights.push(1, 1, 1, 1)

      const faceType = faceName === 'top' ? 'top' : faceName === 'bottom' ? 'bottom' : 'side'
      const uvData = getTextureUV(block, faceType)
      const [uMin, vMin, uMax, vMax] = uvData

      for (const corner of face.corners) {
        let vy = worldY + corner[1]
        // Water height adjustment - lower the top surface and top edges of side faces
        if (isFluid) {
          if (faceName === 'top' || (faceName !== 'bottom' && corner[1] === 1)) {
            vy -= 0.1
          }
        }
        vertices.push(worldX + corner[0], vy, worldZ + corner[2])
        normals.push(face.dir[0], face.dir[1], face.dir[2])

        // Skip AO for water (water uses full brightness)
        if (isFluid) {
          colors.push(1.0, 1.0, 1.0)
        } else {
          const ao = calculateAO(worldX, worldY, worldZ, face.dir, corner, (bx, by, bz) => getBlock3D(bx, by, bz, chunks3D))
          const light = face.shade * ao
          colors.push(light, light, light)
        }
      }

      uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
    }
  }
}

/**
 * Build mesh for a 3D chunk section (16x32x16)
 * This is optimized for vertical culling - only renders the Y section
 */
export function buildChunkMesh3D(cx: number, cy: number, cz: number, chunkData: Uint8Array, chunks3D: Map<string, Uint8Array>, scene: Scene): ChunkMeshData {
  const buffers = createMeshBuffers()

  // Calculate Y range for this section
  const { minY, maxY } = getChunk3DYRange(chunkData)
  const worldYOffset = cy * CHUNK_Y_SIZE

  // Process all blocks in this section
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let localY = minY; localY <= maxY; localY++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunkData[getBlockIndex3D(x, localY, z)]

        if (block === BlockType.AIR) continue

        const worldX = cx * CHUNK_SIZE + x
        const worldY = worldYOffset + localY
        const worldZ = cz * CHUNK_SIZE + z

        // Handle special blocks
        if (block === BlockType.STARFISH) {
          renderStarfish(worldX, worldY, worldZ, buffers)
          continue
        }

        if (isGeneratedModelOnlyBlock(block)) {
          continue
        }

        if (block === BlockType.FALLEN_LEAVES || block === BlockType.MOSS) {
          renderFlatGroundDecoration(worldX, worldY, worldZ, block, buffers)
          continue
        }

        if (block === BlockType.PEBBLE || block === BlockType.STONE_PEBBLE || block === BlockType.SNOW_PEBBLE) {
          renderPebbles(worldX, worldY, worldZ, block, buffers)
          continue
        }

        if (block === BlockType.VINE || block === BlockType.SNOW_VINE) {
          const checker = createVineChecker3D(chunkData)
          renderVines(worldX, worldY, worldZ, x, localY, z, block, buffers, checker)
          continue
        }

        // Mushrooms (3D stem + cap)
        if (block === BlockType.MUSHROOM_RED || block === BlockType.MUSHROOM_BROWN) {
          renderMushroom(worldX, worldY, worldZ, block, buffers)
          continue
        }

        if (
          block === BlockType.BUSH ||
          block === BlockType.RED_FLOWER ||
          block === BlockType.YELLOW_FLOWER ||
          block === BlockType.DEAD_BUSH ||
          block === BlockType.BAMBOO ||
          block === BlockType.SNOW_BUSH ||
          block === BlockType.WINTER_FLOWER ||
          block === BlockType.WILD_WHEAT ||
          block === BlockType.WILD_RICE ||
          block === BlockType.WHEAT_CROP_1 ||
          block === BlockType.WHEAT_CROP_2 ||
          block === BlockType.WHEAT_CROP_3 ||
          block === BlockType.WHEAT_CROP_4 ||
          block === BlockType.RICE_CROP_1 ||
          block === BlockType.RICE_CROP_2 ||
          block === BlockType.RICE_CROP_3 ||
          block === BlockType.RICE_CROP_4
        ) {
          renderVegetation(worldX, worldY, worldZ, block, buffers)
          continue
        }

        // Process standard blocks
        processStandardBlock3D(block, worldX, worldY, worldZ, buffers, chunks3D)
      }
    }
  }

  // Build meshes from buffers
  const chunkWorldX = cx * CHUNK_SIZE
  const chunkWorldZ = cz * CHUNK_SIZE

  return buildMeshesFromBuffers(buffers, { chunkWorldX, chunkWorldZ, minY, maxY, worldYOffset }, scene, { isChunkMesh: true, cx, cy, cz })
}
