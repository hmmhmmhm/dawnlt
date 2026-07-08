import type { Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'

// Re-export BlockType from shared module for backwards compatibility
export { BlockType } from '../shared/block-types'

import type { BlockType } from '../shared/block-types'

export interface ChatMessage {
  id: string
  sender: string
  content: string
  type: 'user' | 'system'
  timestamp: number
}

export type GameMode = 'survival' | 'creative'

export interface Player {
  position: Vector3
  velocity: Vector3
  rotation: { x: number; y: number }
  isGrounded: boolean
  isFlying: boolean
  isCrouching: boolean
  isSneaking: boolean
  selectedSlot: number
}

export interface InventoryItem {
  type: BlockType
  count: number
  storedType?: BlockType
  storedCount?: number
}

export interface Inventory {
  slots: (InventoryItem | null)[]
  hotbar: (InventoryItem | null)[]
}

export interface CraftingRecipe {
  pattern: (BlockType | null)[][]
  result: { type: BlockType; count: number }
}

export interface RaycastHit {
  block: { x: number; y: number; z: number; type: BlockType }
  previous: { x: number; y: number; z: number } | null
  distance: number
}

export interface ChunkMeshData {
  solid?: Mesh
  transparent?: Mesh
  foliage?: Mesh
  fluid?: Mesh
}

// Chunk metadata for optimization
export interface ChunkMeta {
  minY: number // Lowest Y with non-air block
  maxY: number // Highest Y with non-air block
}

export interface GameState {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  player: Player
  chunks: Map<string, Uint8Array>
  chunkMeshes: Map<string, ChunkMeshData>
  inventory: Inventory
  craftingSlots: (InventoryItem | null)[]
  craftingResult: InventoryItem | null
  cursorItem: InventoryItem | null
  isInventoryOpen: boolean
  isPointerLocked: boolean
  keys: Record<string, boolean>
  targetBlock: string | null
  breakProgress: number
  isBreaking: boolean
  droppedItems: any[]
  gameStarted: boolean
}
