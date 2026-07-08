import type { Vector3 } from 'three'
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../constants'
import { getBlockFromChunks, isBlockSolid } from './physics-helpers'

export interface CollisionResult {
  x: boolean
  y: boolean
  z: boolean
  ceiling: boolean
  floor: boolean
}

/**
 * Creates a collision checker function bound to specific chunks
 */
export function createCollisionChecker(chunks: Map<string, Uint8Array>, chunks3D?: Map<string, Uint8Array>) {
  // For wall collision (XZ): allow movement through unloaded chunks
  const getBlockAtForWalls = (x: number, y: number, z: number) => getBlockFromChunks(x, y, z, chunks, chunks3D, false)

  // For floor/ceiling collision (Y): treat missing chunks as solid to prevent falling through
  const getBlockAtForFloor = (x: number, y: number, z: number) => getBlockFromChunks(x, y, z, chunks, chunks3D, true)

  const isBlockSolidAtForWalls = (x: number, y: number, z: number): boolean => {
    const block = getBlockAtForWalls(x, y, z)
    return isBlockSolid(block)
  }

  const isBlockSolidAtForFloor = (x: number, y: number, z: number): boolean => {
    const block = getBlockAtForFloor(x, y, z)
    return isBlockSolid(block)
  }

  /**
   * Check collision at a given position
   */
  function checkCollision(position: Vector3): CollisionResult {
    const collision = { x: false, y: false, z: false, ceiling: false, floor: false }
    const padding = PLAYER_WIDTH / 2
    // Small margin to prevent floating-point precision issues at block boundaries
    const margin = 0.001

    // Check heights for the player's body
    const checkHeights = [0, PLAYER_HEIGHT * 0.5, PLAYER_HEIGHT]

    // Check all 4 corners of the player's bounding box at each height
    // This prevents clipping through wall corners
    const cornerOffsets = [
      [-padding + margin, -padding + margin],
      [-padding + margin, padding - margin],
      [padding - margin, -padding + margin],
      [padding - margin, padding - margin],
    ]

    // Wall collision (XZ) - allow movement through unloaded chunks
    for (const dy of checkHeights) {
      const checkY = Math.floor(position.y + dy)

      for (const [ox, oz] of cornerOffsets) {
        const checkX = position.x + ox
        const checkZ = position.z + oz

        if (isBlockSolidAtForWalls(Math.floor(checkX), checkY, Math.floor(checkZ))) {
          // Determine which axis is causing the collision
          // by checking if the block overlaps with player bounds
          const blockX = Math.floor(checkX)
          const blockZ = Math.floor(checkZ)

          // Check X overlap: does the block overlap with player's X extent?
          const playerMinX = position.x - padding + margin
          const playerMaxX = position.x + padding - margin
          const blockMinX = blockX
          const blockMaxX = blockX + 1

          // Check Z overlap: does the block overlap with player's Z extent?
          const playerMinZ = position.z - padding + margin
          const playerMaxZ = position.z + padding - margin
          const blockMinZ = blockZ
          const blockMaxZ = blockZ + 1

          const overlapX = playerMaxX > blockMinX && playerMinX < blockMaxX
          const overlapZ = playerMaxZ > blockMinZ && playerMinZ < blockMaxZ

          if (overlapX && overlapZ) {
            // Both axes overlap - collision on both
            collision.x = true
            collision.z = true
          } else if (overlapX) {
            collision.z = true
          } else if (overlapZ) {
            collision.x = true
          }
        }
      }
    }

    // Floor/ceiling collision (Y) - treat missing chunks as solid to prevent falling through
    const groundY = position.y - 0.1
    const headY = position.y + PLAYER_HEIGHT

    for (const [ox, oz] of cornerOffsets) {
      const checkX = Math.floor(position.x + ox)
      const checkZ = Math.floor(position.z + oz)

      if (isBlockSolidAtForFloor(checkX, Math.floor(groundY), checkZ)) {
        collision.y = true
        collision.floor = true
      }
      if (isBlockSolidAtForFloor(checkX, Math.floor(headY), checkZ)) {
        collision.y = true
        collision.ceiling = true
      }
    }

    return collision
  }

  /**
   * Get the height of the ground at a given position
   * Uses floor collision (treats missing chunks as solid)
   */
  function getGroundHeight(position: Vector3): number | null {
    const padding = PLAYER_WIDTH / 2
    const groundY = position.y - 0.1
    let maxHitY = -Infinity
    let hit = false

    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const checkX = Math.floor(position.x + ox * padding * 0.9)
        const checkZ = Math.floor(position.z + oz * padding * 0.9)

        if (isBlockSolidAtForFloor(checkX, Math.floor(groundY), checkZ)) {
          const blockTop = Math.floor(groundY) + 1
          if (blockTop > maxHitY) maxHitY = blockTop
          hit = true
        }
      }
    }
    return hit ? maxHitY : null
  }

  /**
   * Push player out of walls if stuck inside blocks
   * Uses wall collision (allows movement through unloaded chunks)
   */
  function pushOutOfWalls(position: Vector3): Vector3 {
    const padding = PLAYER_WIDTH / 2
    const margin = 0.001
    const pushStrength = 0.05 // How far to push per check
    const maxPushIterations = 10

    const result = position.clone()

    for (let iter = 0; iter < maxPushIterations; iter++) {
      let stuck = false
      let pushX = 0
      let pushZ = 0

      const checkHeights = [0, PLAYER_HEIGHT * 0.5, PLAYER_HEIGHT]

      for (const dy of checkHeights) {
        const checkY = Math.floor(result.y + dy)

        // Check all 4 corners
        const corners = [
          { x: result.x - padding + margin, z: result.z - padding + margin },
          { x: result.x - padding + margin, z: result.z + padding - margin },
          { x: result.x + padding - margin, z: result.z - padding + margin },
          { x: result.x + padding - margin, z: result.z + padding - margin },
        ]

        for (const corner of corners) {
          if (isBlockSolidAtForWalls(Math.floor(corner.x), checkY, Math.floor(corner.z))) {
            stuck = true
            const blockCenterX = Math.floor(corner.x) + 0.5
            const blockCenterZ = Math.floor(corner.z) + 0.5

            // Push away from block center
            pushX += result.x - blockCenterX
            pushZ += result.z - blockCenterZ
          }
        }
      }

      if (!stuck) break

      // Normalize and apply push
      const pushLen = Math.sqrt(pushX * pushX + pushZ * pushZ)
      if (pushLen > 0) {
        result.x += (pushX / pushLen) * pushStrength
        result.z += (pushZ / pushLen) * pushStrength
      }
    }

    return result
  }

  return {
    checkCollision,
    getGroundHeight,
    pushOutOfWalls,
    isBlockSolidAt: isBlockSolidAtForWalls,
  }
}
