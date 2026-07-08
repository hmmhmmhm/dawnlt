import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../constants'
import { isBlockOpaque } from '../shared/block-utils'
import { BlockType } from '../types'
import { getBlockIndex3D, getChunkKey3D } from './chunk-3d'

/**
 * 3D Chunk Visibility & Occlusion Culling
 * Functions related to chunk visibility and occlusion culling
 */

/**
 * Check if 3D chunk section needs mesh rendering
 * Returns false in the following cases:
 * - Completely empty (all AIR)
 * - Completely solid with no exposed faces (all same solid block, neighbors not visible)
 */
export function isChunk3DVisible(chunkData: Uint8Array): boolean {
  let hasAir = false
  let hasSolid = false
  let hasTransparent = false

  // Quick scan: check if there's a mix of block types
  for (let i = 0; i < chunkData.length; i++) {
    const block = chunkData[i]
    if (block === BlockType.AIR) {
      hasAir = true
    } else if (!isBlockOpaque(block)) {
      hasTransparent = true
    } else {
      hasSolid = true
    }

    // If both air and solid/transparent exist, there are visible faces
    if (hasAir && (hasSolid || hasTransparent)) {
      return true
    }
  }

  // If only air exists, no mesh needed
  if (!hasSolid && !hasTransparent) {
    return false
  }

  // If only solid blocks exist (no air), mesh may be needed at chunk boundaries
  // But internal faces are not visible - return true to let mesh builder handle it
  return true
}

/**
 * Quickly check if chunk is completely empty (all AIR)
 */
export function isChunk3DEmpty(chunkData: Uint8Array): boolean {
  for (let i = 0; i < chunkData.length; i++) {
    if (chunkData[i] !== BlockType.AIR) {
      return false
    }
  }
  return true
}

/**
 * Check if 3D chunk is completely occluded (hidden by surrounding solid blocks)
 * Chunk is occluded if all 6 faces are covered by opaque blocks from neighbor chunks
 * This allows skipping mesh build for underground chunks that cannot be seen
 */
export function isChunk3DOccluded(cx: number, cy: number, cz: number, chunks3D: Map<string, Uint8Array>): boolean {
  // Check 6 neighbor chunks
  const neighbors = [
    { dx: -1, dy: 0, dz: 0, face: 'left' }, // -X
    { dx: 1, dy: 0, dz: 0, face: 'right' }, // +X
    { dx: 0, dy: -1, dz: 0, face: 'bottom' }, // -Y
    { dx: 0, dy: 1, dz: 0, face: 'top' }, // +Y
    { dx: 0, dy: 0, dz: -1, face: 'back' }, // -Z
    { dx: 0, dy: 0, dz: 1, face: 'front' }, // +Z
  ]

  for (const { dx, dy, dz, face } of neighbors) {
    const neighborKey = getChunkKey3D(cx + dx, cy + dy, cz + dz)
    const neighborData = chunks3D.get(neighborKey)

    // If neighbor doesn't exist, this face is exposed
    if (!neighborData) {
      return false
    }

    // Check if neighbor's entire face touching us is solid (opaque)
    if (!isFaceFullySolid(neighborData, face)) {
      return false
    }
  }

  // All 6 faces are blocked by solid neighbors
  return true
}

/**
 * Check if a specific face of chunk is completely covered by opaque blocks
 */
function isFaceFullySolid(chunkData: Uint8Array, face: string): boolean {
  // Check the face adjacent to target chunk
  // Example: when checking 'right' neighbor, check its LEFT face (x=0)
  switch (face) {
    case 'left': // If neighbor is on left, check its right face (x = CHUNK_SIZE-1)
      for (let y = 0; y < CHUNK_Y_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = chunkData[getBlockIndex3D(CHUNK_SIZE - 1, y, z)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    case 'right': // If neighbor is on right, check its left face (x = 0)
      for (let y = 0; y < CHUNK_Y_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = chunkData[getBlockIndex3D(0, y, z)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    case 'bottom': // If neighbor is below, check its top face (y = CHUNK_Y_SIZE-1)
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = chunkData[getBlockIndex3D(x, CHUNK_Y_SIZE - 1, z)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    case 'top': // If neighbor is above, check its bottom face (y = 0)
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const block = chunkData[getBlockIndex3D(x, 0, z)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    case 'back': // If neighbor is behind, check its front face (z = CHUNK_SIZE-1)
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_Y_SIZE; y++) {
          const block = chunkData[getBlockIndex3D(x, y, CHUNK_SIZE - 1)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    case 'front': // If neighbor is in front, check its back face (z = 0)
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_Y_SIZE; y++) {
          const block = chunkData[getBlockIndex3D(x, y, 0)]
          if (!isBlockOpaque(block)) return false
        }
      }
      return true

    default:
      return false
  }
}
