import { Euler, type PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'
import { BlockType, type RaycastHit } from '../types'
import { getBlockFromChunks } from './physics-helpers'

/**
 * Raycast from camera in the direction the player is looking
 * Returns the hit block and the previous air position for block placement
 */
export function raycast(camera: PerspectiveCamera, playerRotation: { x: number; y: number }, chunks: Map<string, Uint8Array>, maxDistance: number = 5, chunks3D?: Map<string, Uint8Array>, originOverride?: Vector3, includeWater = false): RaycastHit | null {
  const direction = new Vector3(0, 0, -1)
  direction.applyEuler(new Euler(playerRotation.x, playerRotation.y, 0, 'YXZ'))

  const origin = originOverride ? originOverride.clone() : camera.position.clone()
  const step = 0.1

  let lastAirPos: { x: number; y: number; z: number } | null = null

  for (let d = 0; d < maxDistance; d += step) {
    const pos = origin.clone().add(direction.clone().multiplyScalar(d))
    const blockX = Math.floor(pos.x)
    const blockY = Math.floor(pos.y)
    const blockZ = Math.floor(pos.z)

    const block = getBlockFromChunks(blockX, blockY, blockZ, chunks, chunks3D)

    if (block !== BlockType.AIR && (includeWater || block !== BlockType.WATER)) {
      return {
        block: { x: blockX, y: blockY, z: blockZ, type: block },
        previous: lastAirPos,
        distance: d,
      }
    }

    lastAirPos = { x: blockX, y: blockY, z: blockZ }
  }

  return null
}

/**
 * Raycast from a screen position (touch/click coordinates)
 * Returns the hit block and the previous air position for block placement
 */
export function raycastFromScreenPosition(screenX: number, screenY: number, camera: PerspectiveCamera, canvasWidth: number, canvasHeight: number, chunks: Map<string, Uint8Array>, maxDistance: number = 5, chunks3D?: Map<string, Uint8Array>, includeWater = false): RaycastHit | null {
  // Convert screen coordinates to normalized device coordinates (-1 to 1)
  const ndcX = (screenX / canvasWidth) * 2 - 1
  const ndcY = -(screenY / canvasHeight) * 2 + 1

  // Create a ray from the camera through the screen point
  const raycaster = new Raycaster()
  raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera)

  const origin = raycaster.ray.origin.clone()
  const direction = raycaster.ray.direction.clone()
  const step = 0.1

  let lastAirPos: { x: number; y: number; z: number } | null = null

  for (let d = 0; d < maxDistance; d += step) {
    const pos = origin.clone().add(direction.clone().multiplyScalar(d))
    const blockX = Math.floor(pos.x)
    const blockY = Math.floor(pos.y)
    const blockZ = Math.floor(pos.z)

    const block = getBlockFromChunks(blockX, blockY, blockZ, chunks, chunks3D)

    if (block !== BlockType.AIR && (includeWater || block !== BlockType.WATER)) {
      return {
        block: { x: blockX, y: blockY, z: blockZ, type: block },
        previous: lastAirPos,
        distance: d,
      }
    }

    lastAirPos = { x: blockX, y: blockY, z: blockZ }
  }

  return null
}
