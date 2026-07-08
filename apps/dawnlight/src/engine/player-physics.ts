import { Vector3 } from 'three'
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, PLAYER_HEIGHT } from '../constants'
import { BlockType, type GameMode, type Player } from '../types'
import { createCollisionChecker } from './collision'
import { FLY_HORIZONTAL_SPEED, FLY_SPEED, FLY_SPRINT_SPEED } from './physics-constants'
import { getBlockFromChunks } from './physics-helpers'

const GROUND_SPEED_SCALE = 0.65
const JUMP_HEIGHT_SCALE = Math.sqrt(0.7)
const SWIM_TURN_RATE = 3.2 // rad/s
const SWIM_ACCEL = 6.0 // m/s^2

/**
 * Update player physics including movement, collision, and special modes (flying, swimming)
 */
export function updatePlayerPhysics(player: Player, deltaTime: number, keys: Record<string, boolean>, chunks: Map<string, Uint8Array>, gameMode: GameMode = 'survival', isFlySprinting: boolean = false, chunks3D?: Map<string, Uint8Array>) {
  const getBlockAt = (x: number, y: number, z: number) => getBlockFromChunks(x, y, z, chunks, chunks3D)

  // Flying mode (Creative only)
  if (gameMode === 'creative' && player.isFlying) {
    handleFlyingMode(player, deltaTime, keys, isFlySprinting)
    return
  }

  // Create collision checker for current chunks
  const collision = createCollisionChecker(chunks, chunks3D)

  // Check if player is underwater
  const { isSwimming, isHeadUnderwater } = checkWaterStatus(player, getBlockAt)

  // Calculate movement speed based on state
  const moveSpeed = calculateMoveSpeed(player, keys, isSwimming)

  // Apply vertical movement (swimming or normal physics)
  if (isSwimming) {
    applySwimmingHorizontalMovement(player, deltaTime, keys, moveSpeed)
    handleSwimmingPhysics(player, deltaTime, keys, isHeadUnderwater)
  } else {
    // Apply horizontal movement
    applyHorizontalMovement(player, keys, moveSpeed)
    handleNormalPhysics(player, deltaTime, keys)
  }

  // Resolve collisions and update position
  resolveCollisions(player, deltaTime, collision)

  // Prevent falling through the world
  if (player.position.y < -10) {
    player.position.y = 50
    player.velocity.set(0, 0, 0)
  }
}

/**
 * Handle flying mode physics
 */
function handleFlyingMode(player: Player, deltaTime: number, keys: Record<string, boolean>, isFlySprinting: boolean) {
  const flySpeed = isFlySprinting ? FLY_SPRINT_SPEED : FLY_HORIZONTAL_SPEED

  const forward = new Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y))
  const right = new Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y))

  const moveDirection = new Vector3(0, 0, 0)

  if (keys.KeyW) moveDirection.add(forward)
  if (keys.KeyS) moveDirection.sub(forward)
  if (keys.KeyA) moveDirection.sub(right)
  if (keys.KeyD) moveDirection.add(right)

  if (moveDirection.length() > 0) {
    moveDirection.normalize()
    player.velocity.x = moveDirection.x * flySpeed
    player.velocity.z = moveDirection.z * flySpeed
  } else {
    player.velocity.x = 0
    player.velocity.z = 0
  }

  // Vertical movement: Space = up, Shift = down
  if (keys.Space) {
    player.velocity.y = FLY_SPEED
  } else if (keys.ShiftLeft) {
    player.velocity.y = -FLY_SPEED
  } else {
    player.velocity.y = 0
  }

  // Apply movement without collision (fly through blocks)
  player.position.x += player.velocity.x * deltaTime
  player.position.z += player.velocity.z * deltaTime
  player.position.y += player.velocity.y * deltaTime

  // Prevent falling below world
  if (player.position.y < -10) {
    player.position.y = 50
  }

  player.isGrounded = false
}

/**
 * Check if player is in water
 */
function checkWaterStatus(player: Player, getBlockAt: (x: number, y: number, z: number) => BlockType) {
  // Check if head is underwater
  const headPos = player.position.clone()
  headPos.y += PLAYER_HEIGHT * 0.8
  const headBlock = getBlockAt(Math.floor(headPos.x), Math.floor(headPos.y), Math.floor(headPos.z))
  const isHeadUnderwater = headBlock === BlockType.WATER

  // Check if body is underwater (for swimming physics even when head is out)
  const bodyPos = player.position.clone()
  bodyPos.y += PLAYER_HEIGHT * 0.5
  const bodyBlock = getBlockAt(Math.floor(bodyPos.x), Math.floor(bodyPos.y), Math.floor(bodyPos.z))
  const isBodyInWater = bodyBlock === BlockType.WATER

  const isSwimming = isBodyInWater || isHeadUnderwater

  return { isSwimming, isHeadUnderwater }
}

/**
 * Calculate movement speed based on player state
 */
function calculateMoveSpeed(player: Player, keys: Record<string, boolean>, isSwimming: boolean): number {
  let currentSpeed = MOVE_SPEED
  if (isSwimming) {
    currentSpeed *= 0.6
  } else if (player.isSneaking) {
    // Sneak mode: hold Shift to temporarily use normal sprint speed.
    currentSpeed *= (keys.ShiftLeft ? 1.8 : 0.45) * GROUND_SPEED_SCALE
  } else if (keys.ShiftLeft) {
    // Sprinting
    currentSpeed *= 1.8 * GROUND_SPEED_SCALE
  } else {
    currentSpeed *= GROUND_SPEED_SCALE
  }
  return currentSpeed
}

/**
 * Apply horizontal movement based on input
 */
function applyHorizontalMovement(player: Player, keys: Record<string, boolean>, moveSpeed: number) {
  if (player.isCrouching) {
    player.velocity.x = 0
    player.velocity.z = 0
    return
  }

  const forward = new Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y))
  const right = new Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y))

  const moveDirection = new Vector3(0, 0, 0)

  if (keys.KeyW) moveDirection.add(forward)
  if (keys.KeyS) moveDirection.sub(forward)
  if (keys.KeyA) moveDirection.sub(right)
  if (keys.KeyD) moveDirection.add(right)

  if (moveDirection.length() > 0) {
    moveDirection.normalize()
    player.velocity.x = moveDirection.x * moveSpeed
    player.velocity.z = moveDirection.z * moveSpeed
  } else {
    player.velocity.x = 0
    player.velocity.z = 0
  }
}

/**
 * Handle swimming physics
 */
function handleSwimmingPhysics(player: Player, deltaTime: number, keys: Record<string, boolean>, isHeadUnderwater: boolean) {
  // Water physics
  player.velocity.x *= 0.96
  player.velocity.z *= 0.96

  if (player.velocity.y < -4) {
    // Diving / Entering water at high speed
    // Apply strong drag to slow down, preserving some momentum for a "dive"
    // Drag factor needs to be strong enough to stop fall but allow some depth
    player.velocity.y += (-1 - player.velocity.y) * 6 * deltaTime
  } else {
    // Normal swimming controls (Snappy)
    if (keys.Space) {
      if (!isHeadUnderwater) {
        // Surface jump / dolphin jump - Boost to get out of water
        player.velocity.y = 8
      } else {
        // Swim up
        player.velocity.y = 2.1 // additional 25% reduction from 2.8
      }
    } else if (keys.ShiftLeft) {
      // Swim down
      player.velocity.y = -3
    } else {
      // Buoyancy / slight sinking
      player.velocity.y = -1 // Slowly sink
    }
  }
  player.isGrounded = false
}

function applySwimmingHorizontalMovement(player: Player, deltaTime: number, keys: Record<string, boolean>, moveSpeed: number) {
  const forward = new Vector3(-Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y))
  const right = new Vector3(Math.cos(player.rotation.y), 0, -Math.sin(player.rotation.y))
  const moveDirection = new Vector3(0, 0, 0)

  if (keys.KeyW) moveDirection.add(forward)
  if (keys.KeyS) moveDirection.sub(forward)
  if (keys.KeyA) moveDirection.sub(right)
  if (keys.KeyD) moveDirection.add(right)

  if (moveDirection.lengthSq() < 0.0001) {
    player.velocity.x *= 0.9
    player.velocity.z *= 0.9
    return
  }

  moveDirection.normalize()
  const targetHeading = Math.atan2(moveDirection.x, moveDirection.z)
  const currentSpeed = Math.hypot(player.velocity.x, player.velocity.z)
  const currentHeading = currentSpeed > 0.01 ? Math.atan2(player.velocity.x, player.velocity.z) : targetHeading

  const headingDelta = Math.atan2(Math.sin(targetHeading - currentHeading), Math.cos(targetHeading - currentHeading))
  const maxTurn = SWIM_TURN_RATE * deltaTime
  const clampedDelta = Math.max(-maxTurn, Math.min(maxTurn, headingDelta))
  const nextHeading = currentHeading + clampedDelta

  const speedDelta = moveSpeed - currentSpeed
  const maxSpeedChange = SWIM_ACCEL * deltaTime
  const nextSpeed = currentSpeed + Math.max(-maxSpeedChange, Math.min(maxSpeedChange, speedDelta))

  player.velocity.x = Math.sin(nextHeading) * nextSpeed
  player.velocity.z = Math.cos(nextHeading) * nextSpeed
}

/**
 * Handle normal (non-swimming) physics
 */
function handleNormalPhysics(player: Player, deltaTime: number, keys: Record<string, boolean>) {
  // Normal physics
  if (!player.isGrounded) {
    player.velocity.y += GRAVITY * deltaTime
  }

  if (keys.Space && player.isGrounded) {
    // Height is proportional to v^2, so scale velocity by sqrt(0.7) for ~30% lower jump height.
    player.velocity.y = JUMP_FORCE * JUMP_HEIGHT_SCALE
    player.isGrounded = false
  }
}

/**
 * Resolve collisions and update player position
 */
function resolveCollisions(player: Player, deltaTime: number, collision: ReturnType<typeof createCollisionChecker>) {
  // Check if current position is stuck and push out
  const pushedPos = collision.pushOutOfWalls(player.position)
  player.position.copy(pushedPos)

  // Helper for auto-step
  const tryAutoStep = (targetX: number, targetZ: number): boolean => {
    if (!player.isGrounded) return false

    const stepHeight = 1.1
    const targetY = player.position.y + stepHeight

    const testPos = new Vector3(targetX, targetY, targetZ)
    const stepCollision = collision.checkCollision(testPos)

    if (!stepCollision.x && !stepCollision.y && !stepCollision.z) {
      player.position.y = targetY
      return true
    }
    return false
  }

  // Sequential Axis Resolution with improved corner handling
  // We handle X, Z, then Y to prevent wall-sticking where wall penetration causes false floor detection

  // 1. X Movement
  const nextX = player.position.x + player.velocity.x * deltaTime
  const tempPos = player.position.clone()
  tempPos.x = nextX

  let col = collision.checkCollision(tempPos)
  if (col.x) {
    if (tryAutoStep(nextX, player.position.z)) {
      player.position.x = nextX
      // tryAutoStep updates player.position.y, so we sync tempPos
      tempPos.y = player.position.y
    } else {
      player.velocity.x = 0
      tempPos.x = player.position.x // Revert X
    }
  } else {
    player.position.x = nextX
  }

  // 2. Z Movement
  const nextZ = player.position.z + player.velocity.z * deltaTime
  tempPos.z = nextZ

  col = collision.checkCollision(tempPos)
  if (col.z) {
    if (tryAutoStep(player.position.x, nextZ)) {
      player.position.z = nextZ
      tempPos.y = player.position.y
    } else {
      player.velocity.z = 0
      tempPos.z = player.position.z // Revert Z
    }
  } else {
    player.position.z = nextZ
  }

  // 3. Diagonal corner check - if both X and Z moved, check the combined position
  // This prevents slipping through corners when moving diagonally
  if (player.velocity.x !== 0 && player.velocity.z !== 0) {
    const diagonalPos = new Vector3(player.position.x, player.position.y, player.position.z)
    const diagonalCol = collision.checkCollision(diagonalPos)

    if (diagonalCol.x || diagonalCol.z) {
      // Stuck in a corner after moving both axes - push out
      const pushedDiagonal = collision.pushOutOfWalls(player.position)
      player.position.copy(pushedDiagonal)
    }
  }

  // 4. Y Movement
  const nextY = player.position.y + player.velocity.y * deltaTime
  tempPos.y = nextY

  col = collision.checkCollision(tempPos)

  if (player.velocity.y > 0) {
    // Moving up
    if (col.ceiling) {
      player.velocity.y = 0
    } else {
      player.position.y = nextY
      player.isGrounded = false
    }
  } else if (player.velocity.y < 0) {
    // Moving down
    if (col.floor) {
      // Landed on ground
      player.isGrounded = true

      // Snap to ground
      const groundH = collision.getGroundHeight(tempPos)
      if (groundH !== null) {
        player.position.y = groundH
      } else {
        player.position.y = nextY // Fallback
      }
      player.velocity.y = 0
    } else {
      player.position.y = nextY
      player.isGrounded = false
    }
  } else {
    // Not moving vertically
    if (!col.floor) {
      player.isGrounded = false
    }
  }
}
