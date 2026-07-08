/**
 * 3D chunk mesh builder (16x32x16 sections)
 */

import { BlockType } from '../../shared/block-types'
import { isGeneratedModelOnlyBlock } from '../../shared/block-utils'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../shared/constants'
import { calculateAO, faceData } from './faces'
import { renderMushroom } from './mushroom'
import { createAdjacentBlockChecker3D, renderBamboo, renderBush, renderFlower, renderGroundDecoration, renderPebbles, renderStarfish, renderVine } from './special-blocks'
import type { FoliageMeshBuffers, MeshBuffers, MeshWorkerOutput } from './types'
import { getBlock3D, getBlockIndex3D, getChunkKey3D, getTextureUV, isBlockTransparent } from './utils'

export function buildMeshData3D(cx: number, cy: number, cz: number, chunkData: Uint8Array, neighborChunks: { [key: string]: Uint8Array }): Omit<MeshWorkerOutput, 'type' | 'taskId' | 'cy'> {
  // Convert neighbor chunks to Map (3D keys)
  const chunks3D = new Map<string, Uint8Array>()
  chunks3D.set(getChunkKey3D(cx, cy, cz), chunkData)
  for (const [key, data] of Object.entries(neighborChunks)) {
    chunks3D.set(key, data)
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

  const worldYBase = cy * CHUNK_Y_SIZE

  // Process all blocks in 3D chunk section
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const block = chunkData[getBlockIndex3D(x, localY, z)]
        if (block === BlockType.AIR) continue

        const worldX = cx * CHUNK_SIZE + x
        const worldY = worldYBase + localY
        const worldZ = cz * CHUNK_SIZE + z

        // Starfish
        if (block === BlockType.STARFISH) {
          renderStarfish(worldX, worldY, worldZ, solid)
          continue
        }

        if (isGeneratedModelOnlyBlock(block)) {
          continue
        }

        // Ground decorations
        if (block === BlockType.FALLEN_LEAVES || block === BlockType.MOSS) {
          renderGroundDecoration(block, worldX, worldY, worldZ, foliage)
          continue
        }

        // Pebbles
        if (block === BlockType.PEBBLE || block === BlockType.STONE_PEBBLE || block === BlockType.SNOW_PEBBLE) {
          renderPebbles(block, worldX, worldY, worldZ, solid)
          continue
        }

        // Vines
        if (block === BlockType.VINE || block === BlockType.SNOW_VINE) {
          const getAdjacentBlock = createAdjacentBlockChecker3D(chunkData)
          renderVine(block, worldX, worldY, worldZ, x, z, localY, foliage, getAdjacentBlock)
          continue
        }

        // Bush types
        const isBushType = block === BlockType.BUSH || block === BlockType.SNOW_BUSH || block === BlockType.DEAD_BUSH
        if (isBushType) {
          renderBush(block, worldX, worldY, worldZ, foliage)
          continue
        }

        // Bamboo
        if (block === BlockType.BAMBOO) {
          renderBamboo(worldX, worldY, worldZ, foliage)
          continue
        }

        // Mushrooms (3D stem + cap)
        if (block === BlockType.MUSHROOM_RED || block === BlockType.MUSHROOM_BROWN) {
          renderMushroom(block, worldX, worldY, worldZ, foliage)
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
          renderFlower(block, worldX, worldY, worldZ, foliage)
          continue
        }

        // Regular block faces
        for (const [faceName, face] of Object.entries(faceData)) {
          const [dx, dy, dz] = face.dir
          const neighborX = worldX + dx
          const neighborY = worldY + dy
          const neighborZ = worldZ + dz

          // For water blocks, assume missing chunks contain water
          const defaultBlock = block === BlockType.WATER ? BlockType.WATER : BlockType.AIR
          const neighborBlock = getBlock3D(neighborX, neighborY, neighborZ, chunks3D, defaultBlock)

          // Determine if face should be rendered
          let shouldRender = false
          if (block === BlockType.WATER) {
            if (neighborBlock === BlockType.WATER) continue
            if (faceName === 'top') {
              shouldRender = neighborBlock === BlockType.AIR
            } else if (faceName === 'bottom') {
              continue
            } else {
              shouldRender = neighborBlock === BlockType.AIR || !isBlockTransparent(neighborBlock)
            }
          } else if (isBlockTransparent(block)) {
            shouldRender = neighborBlock !== block && isBlockTransparent(neighborBlock)
          } else {
            shouldRender = isBlockTransparent(neighborBlock)
          }

          if (!shouldRender) continue

          // Determine which buffer to use
          const isFoliage = block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES
          let targetBuffers: MeshBuffers | FoliageMeshBuffers
          if (block === BlockType.WATER) {
            targetBuffers = fluid
          } else if (isFoliage) {
            targetBuffers = foliage
          } else if (block === BlockType.GLASS) {
            targetBuffers = transparent
          } else {
            targetBuffers = solid
          }

          const baseIndex = targetBuffers.vertices.length / 3
          const faceType = faceName === 'top' ? 'top' : faceName === 'bottom' ? 'bottom' : 'side'
          const uvData = getTextureUV(block, faceType)
          const [uMin, vMin, uMax, vMax] = uvData

          // Add wind weights for foliage
          if (isFoliage) {
            ;(targetBuffers as FoliageMeshBuffers).windWeights.push(1.0, 1.0, 1.0, 1.0)
          }

          // Add vertices
          for (const corner of face.corners) {
            const vx = worldX + corner[0]
            let vy = worldY + corner[1]
            const vz = worldZ + corner[2]

            // Water height adjustment
            if (block === BlockType.WATER) {
              if (faceName === 'top' || (faceName !== 'bottom' && corner[1] === 1)) {
                vy -= 0.1
              }
            }

            targetBuffers.vertices.push(vx, vy, vz)
            targetBuffers.normals.push(dx, dy, dz)

            // Skip AO for water
            if (block === BlockType.WATER) {
              targetBuffers.colors.push(1.0, 1.0, 1.0)
            } else {
              const ao = calculateAO(worldX, worldY, worldZ, face.dir, corner, (bx, by, bz) => getBlock3D(bx, by, bz, chunks3D))
              const light = face.shade * ao
              targetBuffers.colors.push(light, light, light)
            }
          }

          targetBuffers.uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
          targetBuffers.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
        }
      }
    }
  }

  return {
    cx,
    cz,
    minY: worldYBase,
    maxY: worldYBase + CHUNK_Y_SIZE - 1,
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
