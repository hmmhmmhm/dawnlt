import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { Vector3 } from 'three'
import { PLAYER_HEIGHT } from '../constants'
import type { ChunkConnectivity } from '../engine/world'
import type { BlockType, ChunkMeshData, GameMode, Inventory, Player } from '../types'
import type { MeshWorkerManager } from '../workers/mesh-worker-manager'
import type { CameraMode } from './engine/player-avatar'

export interface BlockActionDeps {
  camera: PerspectiveCamera
  player: Player
  inventory: Inventory
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes3D: Map<string, ChunkMeshData>
  chunkConnectivity: Map<string, ChunkConnectivity>
  chunkVersions: Map<string, number>
  rebuildingChunks: Set<string>
  scene: Scene
  renderer: WebGLRenderer
  meshWorkerManager: MeshWorkerManager | null
  getGameMode: () => GameMode
  getCameraMode?: () => CameraMode
  getThirdPersonYaw?: () => number | undefined
  getIsRaining?: () => boolean
  onSfx?: (type: 'place' | 'break', blockType: BlockType) => void
  spawnDroppedItem?: (blockType: BlockType, position: Vector3, count?: number) => void
}

export function getInteractionOrigin(deps: BlockActionDeps): Vector3 | undefined {
  if (deps.getCameraMode?.() !== 'third-person') return undefined
  const { player } = deps
  return new Vector3(player.position.x, player.position.y + PLAYER_HEIGHT * 0.9, player.position.z)
}

export function getInteractionRotation(deps: BlockActionDeps): {
  x: number
  y: number
} {
  if (deps.getCameraMode?.() === 'third-person') {
    const thirdPersonYaw = deps.getThirdPersonYaw?.()
    if (thirdPersonYaw !== undefined) {
      return { x: deps.player.rotation.x, y: thirdPersonYaw + Math.PI }
    }
  }
  return deps.player.rotation
}
