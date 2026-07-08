import { Vector3 } from 'three'
import { SPAWN_ROTATION_Y, SPAWN_X, SPAWN_Z } from '../../constants'
import { BlockType, type Inventory, type Player } from '../../types'

export function createInitialPlayer(): Player {
  return {
    position: new Vector3(SPAWN_X, 50, SPAWN_Z),
    velocity: new Vector3(0, 0, 0),
    rotation: { x: 0, y: SPAWN_ROTATION_Y },
    isGrounded: false,
    isFlying: false,
    isCrouching: false,
    isSneaking: false,
    selectedSlot: 0,
  }
}

export function createInitialInventory(): Inventory {
  return {
    slots: new Array(36).fill(null),
    hotbar: [
      { type: BlockType.GRASS, count: 64 },
      { type: BlockType.DIRT, count: 64 },
      { type: BlockType.STONE, count: 64 },
      { type: BlockType.SAND, count: 64 },
      { type: BlockType.WOOD, count: 64 },
      { type: BlockType.LEAVES, count: 64 },
      { type: BlockType.COBBLESTONE, count: 64 },
      { type: BlockType.PLANKS, count: 64 },
      { type: BlockType.GLASS, count: 64 },
    ],
  }
}
