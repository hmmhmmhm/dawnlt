import { useCallback, useRef } from 'react'
import type { JoystickInput } from '../components/virtual-joystick'
import { GAMEPAD_LOOK_SENSITIVITY } from '../constants'
import { getConnectedGamepad, processGamepadInput, readGamepadState } from '../utils/gamepad'

export interface GameInputState {
  moveForward: boolean
  moveBackward: boolean
  moveLeft: boolean
  moveRight: boolean
  jump: boolean
  sprint: boolean
  lookX: number
  lookY: number
  attack: boolean
  placeBlock: boolean
  hotbarChange: number
  openChat: boolean
}

export interface UseGameInputOptions {
  isChatOpen: boolean
  isPointerLocked: boolean
  showJoystick: boolean
  onPlaceBlock: () => void
  onSlotChange: (slot: number) => void
  onOpenChat: () => void
  onRequestPointerLock: () => void
  onToggleFly: () => void
  isCreativeMode: boolean
  isFlying: boolean
  lastSpacePressRef: React.MutableRefObject<number>
}

export function useGameInput(options: UseGameInputOptions) {
  const { isChatOpen, isPointerLocked, showJoystick, onPlaceBlock, onSlotChange, onOpenChat, onRequestPointerLock, onToggleFly, isCreativeMode, lastSpacePressRef } = options

  const gamepadAttackHeldRef = useRef(false)
  const gamepadJumpHeldRef = useRef(false)
  const joystickAttackHeldRef = useRef(false)
  const joystickPlaceHeldRef = useRef(false)
  const joystickJumpHeldRef = useRef(false)
  const joystickInputRef = useRef<JoystickInput>({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    sprint: false,
    attack: false,
    placeBlock: false,
  })

  const handleJoystickInput = useCallback((input: JoystickInput) => {
    joystickInputRef.current = input
  }, [])

  const processGamepadInputFrame = useCallback(
    (keysRef: Record<string, boolean>, keyboardKeysRef: Record<string, boolean>, _playerRotation: { x: number; y: number }): { lookX: number; lookY: number; isBreaking: boolean } => {
      let lookX = 0
      let lookY = 0
      let isBreaking = false

      const gamepad = getConnectedGamepad()
      if (gamepad && !isChatOpen) {
        const gamepadState = readGamepadState(gamepad)
        const gamepadInput = processGamepadInput(gamepadState, GAMEPAD_LOOK_SENSITIVITY)

        // Request pointer lock with A button if not locked (skip in joystick mode)
        if (!isPointerLocked && gamepadInput.jump && !showJoystick) {
          onRequestPointerLock()
        }

        // Merge gamepad keys with keyboard keys
        const gamepadKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft']
        gamepadKeys.forEach((key) => {
          const keyboardPressed = keyboardKeysRef[key] || false
          const gamepadPressed = gamepadInput.keys[key] || false
          keysRef[key] = keyboardPressed || gamepadPressed
        })

        // Camera rotation
        if (gamepadInput.lookX !== 0 || gamepadInput.lookY !== 0) {
          lookX = gamepadInput.lookX
          lookY = gamepadInput.lookY
        }

        // Attack (X button or RT)
        if (gamepadInput.attack) {
          if (!gamepadAttackHeldRef.current) {
            isBreaking = true
          }
          gamepadAttackHeldRef.current = true
        } else {
          gamepadAttackHeldRef.current = false
        }

        // Place block (B button)
        if (gamepadInput.placeBlock) {
          onPlaceBlock()
        }

        // Hotbar change (LB/RB)
        if (gamepadInput.hotbarChange !== 0) {
          const currentSlot = 0 // This needs to be passed in
          const newSlot = (currentSlot + gamepadInput.hotbarChange + 9) % 9
          onSlotChange(newSlot)
        }

        // Open chat (Start button)
        if (gamepadInput.openChat) {
          onOpenChat()
        }

        // Double tap jump for flying (Creative mode)
        const jumpJustPressed = gamepadInput.jump && !gamepadJumpHeldRef.current
        if (jumpJustPressed && isCreativeMode) {
          const now = Date.now()
          if (now - lastSpacePressRef.current < 300) {
            onToggleFly()
          }
          lastSpacePressRef.current = now
        }
        gamepadJumpHeldRef.current = gamepadInput.jump
      }

      return { lookX, lookY, isBreaking }
    },
    [isChatOpen, isPointerLocked, showJoystick, onPlaceBlock, onSlotChange, onOpenChat, onRequestPointerLock, onToggleFly, isCreativeMode, lastSpacePressRef],
  )

  const processJoystickInputFrame = useCallback(
    (keysRef: Record<string, boolean>, keyboardKeysRef: Record<string, boolean>, _playerRotation: { x: number; y: number }): { lookX: number; lookY: number; isBreaking: boolean } => {
      let lookX = 0
      let lookY = 0
      let isBreaking = false

      const joystickInput = joystickInputRef.current
      if (!isChatOpen) {
        const JOYSTICK_THRESHOLD = 0.3
        const LOOK_SENSITIVITY = 0.05

        // Movement joystick -> WASD keys mapping
        const joystickW = joystickInput.moveY < -JOYSTICK_THRESHOLD
        const joystickS = joystickInput.moveY > JOYSTICK_THRESHOLD
        const joystickA = joystickInput.moveX < -JOYSTICK_THRESHOLD
        const joystickD = joystickInput.moveX > JOYSTICK_THRESHOLD
        const joystickSpace = joystickInput.jump
        const joystickSprint = joystickInput.sprint

        // When no gamepad connected, use joystick for movement
        if (!getConnectedGamepad()) {
          keysRef.KeyW = keyboardKeysRef.KeyW || joystickW
          keysRef.KeyS = keyboardKeysRef.KeyS || joystickS
          keysRef.KeyA = keyboardKeysRef.KeyA || joystickA
          keysRef.KeyD = keyboardKeysRef.KeyD || joystickD
          keysRef.Space = keyboardKeysRef.Space || joystickSpace
          keysRef.ShiftLeft = keyboardKeysRef.ShiftLeft || joystickSprint
        }

        // Camera rotation (right joystick)
        if (joystickInput.lookX !== 0 || joystickInput.lookY !== 0) {
          lookX = joystickInput.lookX * LOOK_SENSITIVITY
          lookY = joystickInput.lookY * LOOK_SENSITIVITY
        }

        // Jump double-tap for flying (Creative mode)
        if (joystickInput.jump) {
          keysRef.Space = true

          const jumpJustPressed = joystickInput.jump && !joystickJumpHeldRef.current
          if (jumpJustPressed && isCreativeMode) {
            const now = Date.now()
            if (now - lastSpacePressRef.current < 300) {
              onToggleFly()
            }
            lastSpacePressRef.current = now
          }
        }
        joystickJumpHeldRef.current = joystickInput.jump

        // Attack button (hold)
        if (joystickInput.attack) {
          if (!joystickAttackHeldRef.current) {
            isBreaking = true
          }
          joystickAttackHeldRef.current = true
        } else {
          joystickAttackHeldRef.current = false
        }

        // Place block button (edge detection)
        if (joystickInput.placeBlock && !joystickPlaceHeldRef.current) {
          onPlaceBlock()
        }
        joystickPlaceHeldRef.current = joystickInput.placeBlock
      }

      return { lookX, lookY, isBreaking }
    },
    [isChatOpen, onPlaceBlock, onToggleFly, isCreativeMode, lastSpacePressRef],
  )

  return {
    handleJoystickInput,
    processGamepadInputFrame,
    processJoystickInputFrame,
    joystickInputRef,
    gamepadAttackHeldRef,
    joystickAttackHeldRef,
  }
}
