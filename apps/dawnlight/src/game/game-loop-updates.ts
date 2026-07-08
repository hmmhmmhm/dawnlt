import { MathUtils, type PerspectiveCamera, type Vector3, type WebGLRenderer } from 'three'
import type { JoystickInput } from '../components/virtual-joystick'
import { GAMEPAD_LOOK_SENSITIVITY } from '../constants'
import type { GameState } from '../hooks/use-dawnlight-state'
import { getConnectedGamepad, processGamepadInput, readGamepadState } from '../utils/gamepad'
import { triggerFootstepVibration, triggerHaptic } from '../utils/haptics'

// Gamepad input processing dependencies
export interface GamepadInputDeps {
  gameState: GameState
  isChatOpenRef: React.MutableRefObject<boolean>
  showJoystickRef: React.MutableRefObject<boolean>
  keyboardKeysRef: React.MutableRefObject<Record<string, boolean>>
  gamepadAttackHeldRef: React.MutableRefObject<boolean>
  gamepadJumpHeldRef: React.MutableRefObject<boolean>
  renderer: WebGLRenderer
  placeBlock: () => void
  setSelectedSlot: (slot: number) => void
  setIsChatOpen: (open: boolean) => void
  setChatInitialValue: (value: string) => void
}

/**
 * Process gamepad input and update game state
 */
export function processGamepadInputFrame(deps: GamepadInputDeps): void {
  const { gameState, isChatOpenRef, showJoystickRef, keyboardKeysRef, gamepadAttackHeldRef, gamepadJumpHeldRef, renderer, placeBlock, setSelectedSlot, setIsChatOpen, setChatInitialValue } = deps

  const gamepad = getConnectedGamepad()
  if (!gamepad || isChatOpenRef.current) return

  const gamepadState = readGamepadState(gamepad)
  const gamepadInput = processGamepadInput(gamepadState, GAMEPAD_LOOK_SENSITIVITY)

  // Request pointer lock with A button (not in joystick mode)
  if (!gameState.isPointerLocked && gamepadInput.jump && !showJoystickRef.current) {
    renderer.domElement.requestPointerLock()
  }

  // Merge keyboard and gamepad key states
  const gamepadKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft']
  gamepadKeys.forEach((key) => {
    const keyboardPressed = keyboardKeysRef.current[key] || false
    const gamepadPressed = gamepadInput.keys[key] || false
    gameState.keys[key] = keyboardPressed || gamepadPressed
  })

  // Camera rotation (right stick)
  if (gamepadInput.lookX !== 0 || gamepadInput.lookY !== 0) {
    gameState.player.rotation.y -= gamepadInput.lookX
    gameState.player.rotation.x -= gamepadInput.lookY
    gameState.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.player.rotation.x))
  }

  // Block breaking (X button or RT)
  if (gamepadInput.attack) {
    if (!gamepadAttackHeldRef.current) {
      gameState.mouseHeld = true
      gameState.isBreaking = true
      gameState.breakProgress = 0
      triggerHaptic('error')
    }
    gamepadAttackHeldRef.current = true
  } else {
    if (gamepadAttackHeldRef.current) {
      gameState.mouseHeld = false
      gameState.isBreaking = false
      gameState.breakProgress = 0
    }
    gamepadAttackHeldRef.current = false
  }

  // Block placement (B button)
  if (gamepadInput.placeBlock) {
    placeBlock()
  }

  // Hotbar slot change (LB/RB)
  if (gamepadInput.hotbarChange !== 0) {
    const newSlot = (gameState.player.selectedSlot + gamepadInput.hotbarChange + 9) % 9
    gameState.player.selectedSlot = newSlot
    setSelectedSlot(newSlot)
  }

  // Open chat (Start button)
  if (gamepadInput.openChat) {
    setChatInitialValue('')
    setIsChatOpen(true)
    document.exitPointerLock()
    Object.keys(gameState.keys).forEach((k) => {
      gameState.keys[k] = false
    })
    Object.keys(keyboardKeysRef.current).forEach((k) => {
      keyboardKeysRef.current[k] = false
    })
  }

  // Double-tap jump to toggle flying (Creative mode)
  const jumpJustPressed = gamepadInput.jump && !gamepadJumpHeldRef.current
  if (jumpJustPressed && gameState.gameMode === 'creative') {
    const now = Date.now()
    if (now - gameState.lastSpacePress < 300) {
      gameState.player.isFlying = !gameState.player.isFlying
      gameState.isFlySprinting = false
      console.log('[Creative] Flying mode:', gameState.player.isFlying ? 'ON' : 'OFF')
    }
    gameState.lastSpacePress = now
  }
  gamepadJumpHeldRef.current = gamepadInput.jump
}

// Joystick input processing dependencies
export interface JoystickInputDeps {
  gameState: GameState
  joystickInputRef: React.MutableRefObject<JoystickInput>
  isChatOpenRef: React.MutableRefObject<boolean>
  keyboardKeysRef: React.MutableRefObject<Record<string, boolean>>
  joystickAttackHeldRef: React.MutableRefObject<boolean>
  joystickPlaceHeldRef: React.MutableRefObject<boolean>
  joystickJumpHeldRef: React.MutableRefObject<boolean>
  placeBlock: () => void
}

const JOYSTICK_THRESHOLD = 0.3
const LOOK_SENSITIVITY = 0.05

/**
 * Process virtual joystick input and update game state
 */
export function processJoystickInputFrame(deps: JoystickInputDeps): void {
  const { gameState, joystickInputRef, isChatOpenRef, keyboardKeysRef, joystickAttackHeldRef, joystickPlaceHeldRef, joystickJumpHeldRef, placeBlock } = deps

  if (isChatOpenRef.current) return

  const joystickInput = joystickInputRef.current

  // Movement joystick -> WASD key mapping
  const joystickW = joystickInput.moveY < -JOYSTICK_THRESHOLD
  const joystickS = joystickInput.moveY > JOYSTICK_THRESHOLD
  const joystickA = joystickInput.moveX < -JOYSTICK_THRESHOLD
  const joystickD = joystickInput.moveX > JOYSTICK_THRESHOLD
  const joystickSpace = joystickInput.jump

  // Merge with keyboard state (and existing gamepad state)
  gameState.keys.KeyW = keyboardKeysRef.current.KeyW || gameState.keys.KeyW || joystickW
  gameState.keys.KeyS = keyboardKeysRef.current.KeyS || gameState.keys.KeyS || joystickS
  gameState.keys.KeyA = keyboardKeysRef.current.KeyA || gameState.keys.KeyA || joystickA
  gameState.keys.KeyD = keyboardKeysRef.current.KeyD || gameState.keys.KeyD || joystickD

  // When no gamepad connected, joystick-only mode
  if (!getConnectedGamepad()) {
    gameState.keys.KeyW = keyboardKeysRef.current.KeyW || joystickW
    gameState.keys.KeyS = keyboardKeysRef.current.KeyS || joystickS
    gameState.keys.KeyA = keyboardKeysRef.current.KeyA || joystickA
    gameState.keys.KeyD = keyboardKeysRef.current.KeyD || joystickD
    gameState.keys.Space = keyboardKeysRef.current.Space || joystickSpace
  }

  // Camera rotation (right joystick)
  if (joystickInput.lookX !== 0 || joystickInput.lookY !== 0) {
    gameState.player.rotation.y -= joystickInput.lookX * LOOK_SENSITIVITY
    gameState.player.rotation.x -= joystickInput.lookY * LOOK_SENSITIVITY
    gameState.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.player.rotation.x))
  }

  // Jump button
  if (joystickInput.jump) {
    gameState.keys.Space = true

    // Double-tap jump to toggle flying (Creative mode)
    const jumpJustPressed = joystickInput.jump && !joystickJumpHeldRef.current
    if (jumpJustPressed && gameState.gameMode === 'creative') {
      const now = Date.now()
      if (now - gameState.lastSpacePress < 300) {
        gameState.player.isFlying = !gameState.player.isFlying
        gameState.isFlySprinting = false
      }
      gameState.lastSpacePress = now
    }
  }
  joystickJumpHeldRef.current = joystickInput.jump

  // Block breaking button (hold)
  if (joystickInput.attack) {
    if (!joystickAttackHeldRef.current) {
      gameState.mouseHeld = true
      gameState.isBreaking = true
      gameState.breakProgress = 0
      triggerHaptic('error')
    }
    joystickAttackHeldRef.current = true
  } else {
    if (joystickAttackHeldRef.current) {
      gameState.mouseHeld = false
      gameState.isBreaking = false
      gameState.breakProgress = 0
    }
    joystickAttackHeldRef.current = false
  }

  // Block placement button (edge detection)
  if (joystickInput.placeBlock && !joystickPlaceHeldRef.current) {
    placeBlock()
  }
  joystickPlaceHeldRef.current = joystickInput.placeBlock
}

// Footstep vibration state
export interface FootstepState {
  footstepTimer: number
  footstepInterval: number
  footstepSprintInterval: number
}

/**
 * Update footstep vibration
 */
export function updateFootstepVibration(state: FootstepState, gameState: GameState, deltaTime: number): void {
  const isMoving = gameState.keys.KeyW || gameState.keys.KeyS || gameState.keys.KeyA || gameState.keys.KeyD
  const isSprinting = gameState.keys.ShiftLeft && isMoving
  const canTriggerFootstep = gameState.player.isGrounded && isMoving && !gameState.player.isFlying

  if (canTriggerFootstep) {
    state.footstepTimer += deltaTime
    const interval = isSprinting ? state.footstepSprintInterval : state.footstepInterval

    if (state.footstepTimer >= interval) {
      state.footstepTimer = 0
      triggerFootstepVibration(isSprinting)
    }
  } else {
    state.footstepTimer = 0
  }
}

/**
 * Update camera position and rotation
 */
export function updateCamera(camera: PerspectiveCamera, player: { position: Vector3; rotation: { x: number; y: number } }, deltaTime: number, playerHeight: number): void {
  camera.position.x = player.position.x
  camera.position.z = player.position.z

  const targetCameraY = player.position.y + playerHeight * 0.9
  const smoothFactor = 15 * deltaTime
  camera.position.y = MathUtils.lerp(camera.position.y, targetCameraY, Math.min(smoothFactor, 1))

  camera.rotation.order = 'YXZ'
  camera.rotation.y = player.rotation.y
  camera.rotation.x = player.rotation.x
}

/**
 * Prevent camera from clipping into solid blocks
 */
export function preventCameraClipping(camera: PerspectiveCamera, getBlock: (x: number, y: number, z: number) => number, AIR_BLOCK: number, WATER_BLOCK: number, transparentBlocks: number[]): void {
  const camBlockX = Math.floor(camera.position.x)
  const camBlockY = Math.floor(camera.position.y)
  const camBlockZ = Math.floor(camera.position.z)
  const camBlock = getBlock(camBlockX, camBlockY, camBlockZ)

  // Check if camera is inside a solid block
  if (camBlock !== AIR_BLOCK && camBlock !== WATER_BLOCK && !transparentBlocks.includes(camBlock)) {
    // Find nearest safe position
    const offsets = [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ]

    for (const offset of offsets) {
      const checkX = camBlockX + offset.x
      const checkY = camBlockY + offset.y
      const checkZ = camBlockZ + offset.z
      const checkBlock = getBlock(checkX, checkY, checkZ)

      if (checkBlock === AIR_BLOCK || checkBlock === WATER_BLOCK) {
        // Push camera towards safe block
        const pushAmount = 0.6
        camera.position.x += offset.x * pushAmount
        camera.position.y += offset.y * pushAmount
        camera.position.z += offset.z * pushAmount
        break
      }
    }
  }
}
