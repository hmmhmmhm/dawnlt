import type { PerspectiveCamera, WebGLRenderer } from 'three'
import { MOUSE_SENSITIVITY } from '../constants'
import type { GameState } from '../hooks/use-dawnlight-state'
import { triggerHaptic } from '../utils/haptics'

export interface KeyboardHandlerDeps {
  gameState: GameState
  isChatOpenRef: React.MutableRefObject<boolean>
  showJoystickRef: React.MutableRefObject<boolean>
  keyboardKeysRef: React.MutableRefObject<Record<string, boolean>>
  renderer: WebGLRenderer
  setIsChatOpen: (open: boolean) => void
  setChatInitialValue: (value: string) => void
  setSelectedSlot: (slot: number) => void
}

export interface MouseHandlerDeps {
  gameState: GameState
  isChatOpenRef: React.MutableRefObject<boolean>
  showJoystickRef: React.MutableRefObject<boolean>
  renderer: WebGLRenderer
  placeBlock: () => void
}

export interface WheelHandlerDeps {
  gameState: GameState
  setSelectedSlot: (slot: number) => void
}

export interface ResizeHandlerDeps {
  postProcessing: any
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  handlePostProcessingResize: (postProcessing: any, renderer: WebGLRenderer, camera: PerspectiveCamera) => void
}

/**
 * Creates keyboard event handlers (keydown, keyup)
 */
export function createKeyboardHandlers(deps: KeyboardHandlerDeps) {
  const { gameState, isChatOpenRef, showJoystickRef, keyboardKeysRef, renderer, setIsChatOpen, setChatInitialValue, setSelectedSlot } = deps

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isChatOpenRef.current) {
      // Allow Escape to close chat
      if (e.code === 'Escape') {
        setIsChatOpen(false)
        // Don't request pointer lock in joystick mode
        if (!showJoystickRef.current) {
          renderer.domElement.requestPointerLock()
        }
      }
      return
    }

    if (e.code === 'Enter') {
      setChatInitialValue('')
      setIsChatOpen(true)
      document.exitPointerLock()
      // Clear keys to prevent stuck movement
      Object.keys(gameState.keys).forEach((k) => {
        gameState.keys[k] = false
      })
      Object.keys(keyboardKeysRef.current).forEach((k) => {
        keyboardKeysRef.current[k] = false
      })
      return
    }

    if (e.key === '/' && !isChatOpenRef.current) {
      setChatInitialValue('/')
      setIsChatOpen(true)
      document.exitPointerLock()
      Object.keys(gameState.keys).forEach((k) => {
        gameState.keys[k] = false
      })
      Object.keys(keyboardKeysRef.current).forEach((k) => {
        keyboardKeysRef.current[k] = false
      })
      return
    }

    gameState.keys[e.code] = true
    keyboardKeysRef.current[e.code] = true

    // Double-tap Space to toggle flying in Creative mode (ignore key repeat)
    if (e.code === 'Space' && gameState.gameMode === 'creative' && !e.repeat) {
      const now = Date.now()
      if (now - gameState.lastSpacePress < 300) {
        // Double-tap detected - toggle flying
        gameState.player.isFlying = !gameState.player.isFlying
        gameState.isFlySprinting = false // Reset sprint when toggling fly
        console.log('[Creative] Flying mode:', gameState.player.isFlying ? 'ON' : 'OFF')
      }
      gameState.lastSpacePress = now
    }

    // Double-tap W to sprint while flying (ignore key repeat)
    if (e.code === 'KeyW' && gameState.gameMode === 'creative' && gameState.player.isFlying && !e.repeat) {
      const now = Date.now()
      if (now - gameState.lastWPress < 300) {
        gameState.isFlySprinting = true
        console.log('[Creative] Fly sprint: ON')
      }
      gameState.lastWPress = now
    }

    if (e.code.startsWith('Digit')) {
      const slot = parseInt(e.code.replace('Digit', ''), 10) - 1
      if (slot >= 0 && slot <= 8) {
        gameState.player.selectedSlot = slot
        setSelectedSlot(slot)
      }
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    gameState.keys[e.code] = false
    keyboardKeysRef.current[e.code] = false

    // Stop fly sprinting when W is released
    if (e.code === 'KeyW' && gameState.isFlySprinting) {
      gameState.isFlySprinting = false
      console.log('[Creative] Fly sprint: OFF')
    }
  }

  return { handleKeyDown, handleKeyUp }
}

/**
 * Creates mouse event handlers (mousedown, mouseup, mousemove)
 */
export function createMouseHandlers(deps: MouseHandlerDeps) {
  const { gameState, isChatOpenRef, showJoystickRef, renderer, placeBlock } = deps

  const handleMouseMove = (e: MouseEvent) => {
    if (!gameState.isPointerLocked) return

    gameState.player.rotation.y -= e.movementX * MOUSE_SENSITIVITY
    gameState.player.rotation.x -= e.movementY * MOUSE_SENSITIVITY
    gameState.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.player.rotation.x))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (isChatOpenRef.current) return

    // Only request pointer lock when not in joystick mode
    if (!gameState.isPointerLocked && !showJoystickRef.current) {
      renderer.domElement.requestPointerLock()
      return
    }

    if (e.button === 0) {
      gameState.mouseHeld = true
      gameState.isBreaking = true
      gameState.breakProgress = 0
      triggerHaptic('error')
    } else if (e.button === 2) {
      placeBlock()
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      gameState.mouseHeld = false
      gameState.isBreaking = false
      gameState.breakProgress = 0
    }
  }

  return { handleMouseMove, handleMouseDown, handleMouseUp }
}

/**
 * Creates wheel event handler for hotbar slot selection
 */
export function createWheelHandler(deps: WheelHandlerDeps) {
  const { gameState, setSelectedSlot } = deps

  const handleWheel = (e: WheelEvent) => {
    if (e.deltaY > 0) {
      gameState.player.selectedSlot = (gameState.player.selectedSlot + 1) % 9
    } else {
      gameState.player.selectedSlot = (gameState.player.selectedSlot - 1 + 9) % 9
    }
    setSelectedSlot(gameState.player.selectedSlot)
  }

  return { handleWheel }
}

/**
 * Creates pointer lock change handler
 */
export function createPointerLockHandler(gameState: GameState, renderer: WebGLRenderer) {
  const handlePointerLockChange = () => {
    gameState.isPointerLocked = document.pointerLockElement === renderer.domElement
  }

  return { handlePointerLockChange }
}

/**
 * Creates resize handler
 */
export function createResizeHandler(deps: ResizeHandlerDeps) {
  const { postProcessing, renderer, camera, handlePostProcessingResize } = deps

  const handleResize = () => {
    handlePostProcessingResize(postProcessing, renderer, camera)
  }

  return { handleResize }
}
