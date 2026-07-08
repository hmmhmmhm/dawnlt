import type { Scene } from 'three'
import { CHUNK_SIZE } from '../../constants'
import { isBlockTransparent, isGeneratedModelOnlyBlock } from '../../shared/block-utils'
import { BlockType, type ChunkMeshData } from '../../types'
import { getTextureUV } from '../../utils/textures'
import { getBlock, getBlockIndex, getChunkYRange } from '../world'
import { calculateAO } from './ambient-occlusion'
import { faceData } from './face-definitions'
import { buildMeshesFromBuffers } from './geometry'
import { renderFlatGroundDecoration, renderPebbles, renderStarfish } from './ground-decorations'
import { renderMushroom } from './mushroom'
import { createMeshBuffers, type MeshBuffers } from './types'
import { renderVegetation } from './vegetation'
import { createVineChecker2D, renderVines } from './vines'

/**
 * Process standard block faces (solid, transparent, foliage, fluid)
 */
function processStandardBlock(block: BlockType, worldX: number, y: number, worldZ: number, buffers: MeshBuffers, chunks: Map<string, Uint8Array>): void {
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
    const neighborY = y + face.dir[1]
    const neighborZ = worldZ + face.dir[2]
    const neighbor = getBlock(neighborX, neighborY, neighborZ, chunks)

    // Determine if face should be rendered
    let shouldRender = false
    if (isFoliage || isFluid || isTransparent) {
      shouldRender = neighbor !== block && isBlockTransparent(neighbor)
    } else {
      // Solid blocks: render if neighbor is transparent
      shouldRender = isBlockTransparent(neighbor)
    }

    if (shouldRender) {
      const baseIndex = vertices.length / 3
      if (isFoliage) buffers.foliageWindWeights.push(1, 1, 1, 1)

      const faceType = faceName === 'top' ? 'top' : faceName === 'bottom' ? 'bottom' : 'side'
      const uvData = getTextureUV(block, faceType)
      const [uMin, vMin, uMax, vMax] = uvData

      for (const corner of face.corners) {
        vertices.push(worldX + corner[0], y + corner[1], worldZ + corner[2])
        normals.push(face.dir[0], face.dir[1], face.dir[2])

        const ao = calculateAO(worldX, y, worldZ, face.dir, corner, (bx, by, bz) => getBlock(bx, by, bz, chunks))
        const light = face.shade * ao
        colors.push(light, light, light)
      }

      uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
    }
  }
}

/**
 * Build mesh for a 2D chunk (full height column)
 */
export function buildChunkMesh(cx: number, cz: number, chunkData: Uint8Array, chunks: Map<string, Uint8Array>, scene: Scene): ChunkMeshData {
  const buffers = createMeshBuffers()

  // Optimization: Calculate Y range with actual blocks
  const { minY, maxY } = getChunkYRange(chunkData)

  // Process all blocks
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunkData[getBlockIndex(x, y, z)]

        if (block === BlockType.AIR) continue

        const worldX = cx * CHUNK_SIZE + x
        const worldZ = cz * CHUNK_SIZE + z

        // Handle special blocks
        if (block === BlockType.STARFISH) {
          renderStarfish(worldX, y, worldZ, buffers)
          continue
        }

        if (isGeneratedModelOnlyBlock(block)) {
          continue
        }

        if (block === BlockType.FALLEN_LEAVES || block === BlockType.MOSS) {
          renderFlatGroundDecoration(worldX, y, worldZ, block, buffers)
          continue
        }

        if (block === BlockType.PEBBLE || block === BlockType.STONE_PEBBLE || block === BlockType.SNOW_PEBBLE) {
          renderPebbles(worldX, y, worldZ, block, buffers)
          continue
        }

        if (block === BlockType.VINE || block === BlockType.SNOW_VINE) {
          const checker = createVineChecker2D(x, y, z, chunkData)
          renderVines(worldX, y, worldZ, x, y, z, block, buffers, checker)
          continue
        }

        // Mushrooms (3D stem + cap)
        if (block === BlockType.MUSHROOM_RED || block === BlockType.MUSHROOM_BROWN) {
          renderMushroom(worldX, y, worldZ, block, buffers)
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
          renderVegetation(worldX, y, worldZ, block, buffers)
          continue
        }

        // Process standard blocks
        processStandardBlock(block, worldX, y, worldZ, buffers, chunks)
      }
    }
  }

  // Build meshes from buffers
  const chunkWorldX = cx * CHUNK_SIZE
  const chunkWorldZ = cz * CHUNK_SIZE

  return buildMeshesFromBuffers(buffers, { chunkWorldX, chunkWorldZ, minY, maxY }, scene)
}
