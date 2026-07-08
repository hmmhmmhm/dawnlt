import type { JoystickInput } from '../../components/virtual-joystick'
import { GAMEPAD_LOOK_SENSITIVITY, MOUSE_SENSITIVITY } from '../../constants'
import { getConnectedGamepad, processGamepadInput, readGamepadState, setupGamepadListeners } from '../../utils/gamepad'
import { triggerHaptic } from '../../utils/haptics'
import type { GameEngine } from './game-engine'
import { processJoystickInputFrame } from './input-joystick'
import { TouchCameraHandler } from './touch-camera'
import type { InputCallbacks } from './types'

export type { InputCallbacks }

const MAX_RENDER_PIXEL_RATIO = 1.75

export class InputSystem {
  private keyboardKeys: Record<string, boolean> = {}
  private gamepadAttackHeld = false
  private gamepadJumpHeld = false
  private joystickAttackHeld = false
  private joystickPlaceHeld = false
  private joystickJumpHeld = false
  private joystickInput: JoystickInput = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    sprint: false,
    attack: false,
    placeBlock: false,
  }
  private isChatOpen = false
  private showJoystick = false
  private handleKeyDownBound: (e: KeyboardEvent) => void
  private handleKeyUpBound: (e: KeyboardEvent) => void
  private handleMouseMoveBound: (e: MouseEvent) => void
  private handleMouseDownBound: (e: MouseEvent) => void
  private handleMouseUpBound: (e: MouseEvent) => void
  private handleWheelBound: (e: WheelEvent) => void
  private handlePointerLockChangeBound: () => void
  private handleResizeBound: () => void
  private cleanupGamepad: (() => void) | null = null
  private touchCamera: TouchCameraHandler
  private callbacks: InputCallbacks
  private engine: GameEngine

  constructor(engine: GameEngine, callbacks: InputCallbacks = {}) {
    this.engine = engine
    this.callbacks = callbacks
    this.touchCamera = new TouchCameraHandler(engine, callbacks, () => this.showJoystick && !this.isChatOpen)
    this.handleKeyDownBound = this.handleKeyDown.bind(this)
    this.handleKeyUpBound = this.handleKeyUp.bind(this)
    this.handleMouseMoveBound = this.handleMouseMove.bind(this)
    this.handleMouseDownBound = this.handleMouseDown.bind(this)
    this.handleMouseUpBound = this.handleMouseUp.bind(this)
    this.handleWheelBound = this.handleWheel.bind(this)
    this.handlePointerLockChangeBound = this.handlePointerLockChange.bind(this)
    this.handleResizeBound = this.handleResize.bind(this)
    this.keepHelperStateReferences()
  }

  private keepHelperStateReferences(): void {
    void this.joystickAttackHeld
    void this.joystickPlaceHeld
    void this.joystickJumpHeld
  }

  registerEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDownBound)
    document.addEventListener('keyup', this.handleKeyUpBound)
    document.addEventListener('mousemove', this.handleMouseMoveBound)
    document.addEventListener('mousedown', this.handleMouseDownBound)
    document.addEventListener('mouseup', this.handleMouseUpBound)
    document.addEventListener('wheel', this.handleWheelBound)
    document.addEventListener('pointerlockchange', this.handlePointerLockChangeBound)
    window.addEventListener('resize', this.handleResizeBound)

    // Setup gamepad listeners
    this.cleanupGamepad = setupGamepadListeners(
      (_gamepad) => {
        this.callbacks.onGamepadConnected?.()
        this.showJoystick = false
      },
      () => {
        this.callbacks.onGamepadDisconnected?.()
        if (this.isMobile()) {
          this.showJoystick = true
        }
      },
    )

    // Auto-detect mobile and show joystick
    if (this.isMobile() && !getConnectedGamepad()) {
      this.showJoystick = true
    }

    // Mobile camera rotation via pointer events on canvas
    this.touchCamera.register()
  }

  unregisterEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDownBound)
    document.removeEventListener('keyup', this.handleKeyUpBound)
    document.removeEventListener('mousemove', this.handleMouseMoveBound)
    document.removeEventListener('mousedown', this.handleMouseDownBound)
    document.removeEventListener('mouseup', this.handleMouseUpBound)
    document.removeEventListener('wheel', this.handleWheelBound)
    document.removeEventListener('pointerlockchange', this.handlePointerLockChangeBound)
    window.removeEventListener('resize', this.handleResizeBound)

    if (this.cleanupGamepad) {
      this.cleanupGamepad()
      this.cleanupGamepad = null
    }

    this.touchCamera.unregister()
  }

  private isMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i
    const isMobileDevice = mobileRegex.test(userAgent)
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
    return isMobileDevice || isTablet
  }

  private clearCrouchOnMoveInput(code: string): void {
    if (this.engine.player.isCrouching && (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD')) {
      this.engine.player.isCrouching = false
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isChatOpen) {
      if (e.code === 'Escape') {
        this.isChatOpen = false
        if (!this.showJoystick) {
          this.engine.renderer.domElement.requestPointerLock()
        }
      }
      return
    }

    // Open chat with Enter
    if (e.code === 'Enter') {
      this.callbacks.onChatOpen?.('')
      this.isChatOpen = true
      document.exitPointerLock()
      this.clearAllKeys()
      return
    }

    // Open chat with / (command mode)
    if (e.key === '/') {
      this.callbacks.onChatOpen?.('/')
      this.isChatOpen = true
      document.exitPointerLock()
      this.clearAllKeys()
      return
    }

    // Capture screenshot
    if (e.code === 'F2' && !e.repeat) {
      this.callbacks.onCaptureScreenshot?.()
      return
    }

    this.engine.keys[e.code] = true
    this.keyboardKeys[e.code] = true
    this.clearCrouchOnMoveInput(e.code)

    // Double-tap Space to toggle flying in Creative mode
    if (e.code === 'Space' && this.engine.gameMode === 'creative' && !e.repeat) {
      const now = Date.now()
      if (now - this.engine.lastSpacePress < 300) {
        this.engine.player.isFlying = !this.engine.player.isFlying
        if (this.engine.player.isFlying) {
          this.engine.player.isSneaking = false
          this.engine.player.isCrouching = false
        }
        this.engine.isFlySprinting = false
      }
      this.engine.lastSpacePress = now
    }

    // Double-tap W to sprint while flying
    if (e.code === 'KeyW' && this.engine.gameMode === 'creative' && this.engine.player.isFlying && !e.repeat) {
      const now = Date.now()
      if (now - this.engine.lastWPress < 300) {
        this.engine.isFlySprinting = true
      }
      this.engine.lastWPress = now
    }

    // Hotbar slot selection (1-9)
    if (e.code.startsWith('Digit')) {
      const slot = parseInt(e.code.replace('Digit', ''), 10) - 1
      if (slot >= 0 && slot <= 8) {
        this.engine.player.selectedSlot = slot
        this.callbacks.onSelectedSlotChange?.(slot)
      }
    }

    // Toggle first/third-person camera
    if (e.code === 'KeyV' && !e.repeat) {
      this.engine.toggleCameraMode()
    }

    // Toggle crouch (sit) with C
    if (e.code === 'KeyC' && !e.repeat && !this.engine.player.isFlying) {
      this.engine.player.isCrouching = !this.engine.player.isCrouching
      if (this.engine.player.isCrouching) {
        this.engine.player.isSneaking = false
        this.engine.keys.KeyW = false
        this.engine.keys.KeyA = false
        this.engine.keys.KeyS = false
        this.engine.keys.KeyD = false
        this.keyboardKeys.KeyW = false
        this.keyboardKeys.KeyA = false
        this.keyboardKeys.KeyS = false
        this.keyboardKeys.KeyD = false
      }
    }

    // Toggle sneaky-walk mode with Ctrl
    if (e.code === 'ControlLeft' && !e.repeat && !this.engine.player.isFlying) {
      this.engine.player.isSneaking = !this.engine.player.isSneaking
      if (this.engine.player.isSneaking) {
        this.engine.player.isCrouching = false
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.engine.keys[e.code] = false
    this.keyboardKeys[e.code] = false

    // Stop fly sprinting when W is released
    if (e.code === 'KeyW' && this.engine.isFlySprinting) {
      this.engine.isFlySprinting = false
    }
  }

  private clearAllKeys(): void {
    Object.keys(this.engine.keys).forEach((k) => {
      this.engine.keys[k] = false
    })
    Object.keys(this.keyboardKeys).forEach((k) => {
      this.keyboardKeys[k] = false
    })
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.engine.isPointerLocked) return

    this.engine.player.rotation.y -= e.movementX * MOUSE_SENSITIVITY
    this.engine.player.rotation.x -= e.movementY * MOUSE_SENSITIVITY
    this.engine.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.engine.player.rotation.x))
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.isChatOpen) return

    // Request pointer lock if not in joystick mode
    if (!this.engine.isPointerLocked && !this.showJoystick) {
      this.engine.renderer.domElement.requestPointerLock()
      return
    }

    if (e.button === 0) {
      // Left click - start breaking
      this.engine.mouseHeld = true
      this.engine.isBreaking = true
      this.engine.breakProgress = 0
      triggerHaptic('error')
    } else if (e.button === 2) {
      // Right click - place block
      this.callbacks.onPlaceBlock?.()
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.engine.mouseHeld = false
      this.engine.isBreaking = false
      this.engine.breakProgress = 0
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (e.deltaY > 0) {
      this.engine.player.selectedSlot = (this.engine.player.selectedSlot + 1) % 9
    } else {
      this.engine.player.selectedSlot = (this.engine.player.selectedSlot - 1 + 9) % 9
    }
    this.callbacks.onSelectedSlotChange?.(this.engine.player.selectedSlot)
  }

  private handlePointerLockChange(): void {
    this.engine.isPointerLocked = document.pointerLockElement === this.engine.renderer.domElement
  }

  private handleResize(): void {
    const { renderer, camera, postProcessing } = this.engine
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO)

    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Update post-processing
    postProcessing.composer.setPixelRatio(pixelRatio)
    postProcessing.composer.setSize(window.innerWidth, window.innerHeight)
    postProcessing.bloomPass.setSize(window.innerWidth, window.innerHeight)
    postProcessing.bokehPass.setSize(window.innerWidth, window.innerHeight)
    postProcessing.smaaPass.setSize(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio)
  }

  processGamepadFrame(): void {
    if (this.isChatOpen) return

    const gamepad = getConnectedGamepad()
    if (!gamepad) return

    const gamepadState = readGamepadState(gamepad)
    const gamepadInput = processGamepadInput(gamepadState, GAMEPAD_LOOK_SENSITIVITY)

    // Request pointer lock with A button
    if (!this.engine.isPointerLocked && gamepadInput.jump && !this.showJoystick) {
      this.engine.renderer.domElement.requestPointerLock()
    }

    // Merge keyboard and gamepad key states
    const gamepadKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ShiftLeft']
    gamepadKeys.forEach((key) => {
      const keyboardPressed = this.keyboardKeys[key] || false
      const gamepadPressed = gamepadInput.keys[key] || false
      this.engine.keys[key] = keyboardPressed || gamepadPressed
    })
    if (this.engine.player.isCrouching && (this.engine.keys.KeyW || this.engine.keys.KeyA || this.engine.keys.KeyS || this.engine.keys.KeyD)) {
      this.engine.player.isCrouching = false
    }

    // Camera rotation (right stick)
    if (gamepadInput.lookX !== 0 || gamepadInput.lookY !== 0) {
      this.engine.player.rotation.y -= gamepadInput.lookX
      this.engine.player.rotation.x -= gamepadInput.lookY
      this.engine.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.engine.player.rotation.x))
    }

    // Block breaking
    if (gamepadInput.attack) {
      if (!this.gamepadAttackHeld) {
        this.engine.mouseHeld = true
        this.engine.isBreaking = true
        this.engine.breakProgress = 0
        triggerHaptic('error')
      }
      this.gamepadAttackHeld = true
    } else {
      if (this.gamepadAttackHeld) {
        this.engine.mouseHeld = false
        this.engine.isBreaking = false
        this.engine.breakProgress = 0
      }
      this.gamepadAttackHeld = false
    }

    // Block placement
    if (gamepadInput.placeBlock) {
      this.callbacks.onPlaceBlock?.()
    }

    // Hotbar slot change
    if (gamepadInput.hotbarChange !== 0) {
      const newSlot = (this.engine.player.selectedSlot + gamepadInput.hotbarChange + 9) % 9
      this.engine.player.selectedSlot = newSlot
      this.callbacks.onSelectedSlotChange?.(newSlot)
    }

    // Open chat
    if (gamepadInput.openChat) {
      this.callbacks.onChatOpen?.('')
      this.isChatOpen = true
      document.exitPointerLock()
      this.clearAllKeys()
    }

    // Double-tap jump to toggle flying
    const jumpJustPressed = gamepadInput.jump && !this.gamepadJumpHeld
    if (jumpJustPressed && this.engine.gameMode === 'creative') {
      const now = Date.now()
      if (now - this.engine.lastSpacePress < 300) {
        this.engine.player.isFlying = !this.engine.player.isFlying
        this.engine.isFlySprinting = false
      }
      this.engine.lastSpacePress = now
    }
    this.gamepadJumpHeld = gamepadInput.jump
  }

  processJoystickFrame(): void {
    processJoystickInputFrame(this)
  }

  updateJoystickInput(input: JoystickInput): void {
    this.joystickInput = input
  }
  setChatOpen(open: boolean): void {
    this.isChatOpen = open
  }
  setShowJoystick(show: boolean): void {
    this.showJoystick = show
    if (show && document.pointerLockElement) document.exitPointerLock()
  }
  getShowJoystick(): boolean {
    return this.showJoystick
  }
  getKeyboardKeys(): Record<string, boolean> {
    return { ...this.keyboardKeys }
  }
  getJoystickInput(): JoystickInput {
    return { ...this.joystickInput }
  }
  dispose(): void {
    this.unregisterEventListeners()
  }
}

export default InputSystem
