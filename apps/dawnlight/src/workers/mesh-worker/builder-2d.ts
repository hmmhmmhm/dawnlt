/**
 * 2D chunk mesh builder
 */

import { BlockType } from '../../shared/block-types'
import { isGeneratedModelOnlyBlock } from '../../shared/block-utils'
import { CHUNK_SIZE } from '../../shared/constants'
import { calculateAO, faceData } from './faces'
import { renderMushroom } from './mushroom'
import { createAdjacentBlockChecker2D, renderBamboo, renderBush, renderFlower, renderGroundDecoration, renderPebbles, renderStarfish, renderVine } from './special-blocks'
import type { FoliageMeshBuffers, MeshBuffers, MeshWorkerOutput } from './types'
import { getBlock, getBlockIndex, getChunkKey, getChunkYRange, getTextureUV, isBlockTransparent } from './utils'

export function buildMeshData(cx: number, cz: number, chunkData: Uint8Array, neighborChunks: { [key: string]: Uint8Array }): Omit<MeshWorkerOutput, 'type' | 'taskId'> {
  // Convert neighbor chunks to Map
  const chunks = new Map<string, Uint8Array>()
  chunks.set(getChunkKey(cx, cz), chunkData)
  for (const [key, data] of Object.entries(neighborChunks)) {
    chunks.set(key, data)
  }

  const solid: MeshBuffers = {
    vertices: [],
    normals: [],
    uvs: [],
    indices: [],
    colors: [],
  }
  const transparent: MeshBuffers = {
    vertices: [],
    normals: [],
    uvs: [],
    indices: [],
    colors: [],
  }
  const foliage: FoliageMeshBuffers = {
    vertices: [],
    normals: [],
    uvs: [],
    indices: [],
    colors: [],
    windWeights: [],
  }
  const fluid: MeshBuffers = {
    vertices: [],
    normals: [],
    uvs: [],
    indices: [],
    colors: [],
  }

  const { minY, maxY } = getChunkYRange(chunkData)

  // Process all blocks
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunkData[getBlockIndex(x, y, z)]

        if (block === BlockType.AIR) continue

        const worldX = cx * CHUNK_SIZE + x
        const worldZ = cz * CHUNK_SIZE + z

        // Starfish
        if (block === BlockType.STARFISH) {
          renderStarfish(worldX, y, worldZ, solid)
          continue
        }

        if (isGeneratedModelOnlyBlock(block)) {
          continue
        }

        // Ground decorations
        if (block === BlockType.FALLEN_LEAVES || block === BlockType.MOSS) {
          renderGroundDecoration(block, worldX, y, worldZ, foliage)
          continue
        }

        // Pebbles
        if (block === BlockType.PEBBLE || block === BlockType.STONE_PEBBLE || block === BlockType.SNOW_PEBBLE) {
          renderPebbles(block, worldX, y, worldZ, solid)
          continue
        }

        // Vines
        if (block === BlockType.VINE || block === BlockType.SNOW_VINE) {
          const getAdjacentBlock = createAdjacentBlockChecker2D(chunkData, y)
          renderVine(block, worldX, y, worldZ, x, z, y, foliage, getAdjacentBlock)
          continue
        }

        // Bush types
        const isBushType = block === BlockType.BUSH || block === BlockType.SNOW_BUSH || block === BlockType.DEAD_BUSH
        if (isBushType) {
          renderBush(block, worldX, y, worldZ, foliage)
          continue
        }

        // Bamboo
        if (block === BlockType.BAMBOO) {
          renderBamboo(worldX, y, worldZ, foliage)
          continue
        }

        // Mushrooms (3D stem + cap)
        if (block === BlockType.MUSHROOM_RED || block === BlockType.MUSHROOM_BROWN) {
          renderMushroom(block, worldX, y, worldZ, foliage)
          continue
        }

        // Flowers
        if (
          block === BlockType.RED_FLOWER ||
          block === BlockType.YELLOW_FLOWER ||
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
          renderFlower(block, worldX, y, worldZ, foliage)
          continue
        }

        // Regular blocks
        const isFoliage = block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES
        const isFluid = block === BlockType.WATER
        const isTransparentBlock = block === BlockType.GLASS

        let targetBuffers: MeshBuffers | FoliageMeshBuffers

        if (isFoliage) {
          targetBuffers = foliage
        } else if (isFluid) {
          targetBuffers = fluid
        } else if (isTransparentBlock) {
          targetBuffers = transparent
        } else {
          targetBuffers = solid
        }

        for (const [faceName, face] of Object.entries(faceData)) {
          const neighborX = worldX + face.dir[0]
          const neighborY = y + face.dir[1]
          const neighborZ = worldZ + face.dir[2]
          const neighbor = getBlock(neighborX, neighborY, neighborZ, chunks)

          let shouldRender = false
          if (isFoliage || isFluid || isTransparentBlock) {
            shouldRender = neighbor !== block && isBlockTransparent(neighbor)
          } else {
            shouldRender = isBlockTransparent(neighbor)
          }

          if (shouldRender) {
            const baseIndex = targetBuffers.vertices.length / 3
            if (isFoliage) (targetBuffers as FoliageMeshBuffers).windWeights.push(1, 1, 1, 1)

            const faceType = faceName === 'top' ? 'top' : faceName === 'bottom' ? 'bottom' : 'side'
            const uvData = getTextureUV(block, faceType)
            const [uMin, vMin, uMax, vMax] = uvData

            for (const corner of face.corners) {
              targetBuffers.vertices.push(worldX + corner[0], y + corner[1], worldZ + corner[2])
              targetBuffers.normals.push(face.dir[0], face.dir[1], face.dir[2])

              const ao = calculateAO(worldX, y, worldZ, face.dir, corner, (bx, by, bz) => getBlock(bx, by, bz, chunks))
              const light = face.shade * ao
              targetBuffers.colors.push(light, light, light)
            }

            targetBuffers.uvs.push(uMin, vMin, uMax, vMin, uMax, vMax, uMin, vMax)
            targetBuffers.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
          }
        }
      }
    }
  }

  return {
    cx,
    cz,
    minY,
    maxY,
    solid:
      solid.vertices.length > 0
        ? {
            vertices: new Float32Array(solid.vertices),
            normals: new Float32Array(solid.normals),
            uvs: new Float32Array(solid.uvs),
            colors: new Float32Array(solid.colors),
            indices: new Uint32Array(solid.indices),
          }
        : null,
    transparent:
      transparent.vertices.length > 0
        ? {
            vertices: new Float32Array(transparent.vertices),
            normals: new Float32Array(transparent.normals),
            uvs: new Float32Array(transparent.uvs),
            colors: new Float32Array(transparent.colors),
            indices: new Uint32Array(transparent.indices),
          }
        : null,
    foliage:
      foliage.vertices.length > 0
        ? {
            vertices: new Float32Array(foliage.vertices),
            normals: new Float32Array(foliage.normals),
            uvs: new Float32Array(foliage.uvs),
            colors: new Float32Array(foliage.colors),
            indices: new Uint32Array(foliage.indices),
            windWeights: new Float32Array(foliage.windWeights),
          }
        : null,
    fluid:
      fluid.vertices.length > 0
        ? {
            vertices: new Float32Array(fluid.vertices),
            normals: new Float32Array(fluid.normals),
            uvs: new Float32Array(fluid.uvs),
            colors: new Float32Array(fluid.colors),
            indices: new Uint32Array(fluid.indices),
          }
        : null,
  }
}
