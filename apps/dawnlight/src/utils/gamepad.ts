/**
 * Gamepad Input Handler
 *
 * Xbox/PlayStation controller mapping:
 * - Left stick: Movement (WASD)
 * - Right stick: Camera rotation
 * - A/X button: Jump
 * - X/□ button: Break block (left mouse)
 * - B/○ button: Place block (right mouse)
 * - LB/L1: Hotbar slot left
 * - RB/R1: Hotbar slot right
 * - LT/L2: Sprint (Shift)
 * - RT/R2: Break block (alternative)
 * - D-Pad Up/Down: Direct hotbar slot selection
 * - Start: Menu/Chat
 */

import { GAMEPAD_LOOK_SENSITIVITY } from '../constants'

// Deadzone - ignore stick values below this
export const STICK_DEADZONE = 0.15

// Button indices (standard gamepad mapping)
export enum GamepadButton {
  A = 0, // Xbox A / PS X
  B = 1, // Xbox B / PS Circle
  X = 2, // Xbox X / PS Square
  Y = 3, // Xbox Y / PS Triangle
  LB = 4, // Left Bumper
  RB = 5, // Right Bumper
  LT = 6, // Left Trigger
  RT = 7, // Right Trigger
  Back = 8, // Back / Select
  Start = 9, // Start / Options
  LeftStick = 10, // Left Stick Press
  RightStick = 11, // Right Stick Press
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
}

// Stick axis indices
export enum GamepadAxis {
  LeftStickX = 0,
  LeftStickY = 1,
  RightStickX = 2,
  RightStickY = 3,
}

export interface GamepadState {
  connected: boolean
  // Left stick (movement)
  leftStickX: number
  leftStickY: number
  // Right stick (camera)
  rightStickX: number
  rightStickY: number
  // Button states
  buttons: boolean[]
  // Trigger values (0-1)
  leftTrigger: number
  rightTrigger: number
}

export interface GamepadInputResult {
  // State mapped to keyboard keys
  keys: Record<string, boolean>
  // Camera rotation (like mouse movement)
  lookX: number
  lookY: number
  // Action triggers
  attack: boolean // Break block
  placeBlock: boolean // Place block
  jump: boolean // Jump
  sprint: boolean // Sprint
  // Hotbar change
  hotbarChange: number // -1, 0, +1
  // Special actions
  openChat: boolean
}

// Track previous button states (for edge detection)
let previousButtons: boolean[] = new Array(16).fill(false)
let hotbarCooldown = 0

/**
 * Apply deadzone
 */
function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0
  // Normalize value after deadzone to 0-1
  const sign = value > 0 ? 1 : -1
  return (sign * (Math.abs(value) - deadzone)) / (1 - deadzone)
}

/**
 * Get connected gamepad
 */
export function getConnectedGamepad(): Gamepad | null {
  const gamepads = navigator.getGamepads()
  for (const gamepad of gamepads) {
    if (gamepad?.connected) {
      return gamepad
    }
  }
  return null
}

/**
 * Read gamepad state
 */
export function readGamepadState(gamepad: Gamepad | null): GamepadState {
  if (!gamepad) {
    return {
      connected: false,
      leftStickX: 0,
      leftStickY: 0,
      rightStickX: 0,
      rightStickY: 0,
      buttons: new Array(16).fill(false),
      leftTrigger: 0,
      rightTrigger: 0,
    }
  }

  return {
    connected: true,
    leftStickX: applyDeadzone(gamepad.axes[GamepadAxis.LeftStickX] || 0, STICK_DEADZONE),
    leftStickY: applyDeadzone(gamepad.axes[GamepadAxis.LeftStickY] || 0, STICK_DEADZONE),
    rightStickX: applyDeadzone(gamepad.axes[GamepadAxis.RightStickX] || 0, STICK_DEADZONE),
    rightStickY: applyDeadzone(gamepad.axes[GamepadAxis.RightStickY] || 0, STICK_DEADZONE),
    buttons: gamepad.buttons.map((b) => b.pressed),
    leftTrigger: gamepad.buttons[GamepadButton.LT]?.value || 0,
    rightTrigger: gamepad.buttons[GamepadButton.RT]?.value || 0,
  }
}

/**
 * Check if button was just pressed (edge detection)
 */
function isButtonJustPressed(buttonIndex: number, currentButtons: boolean[]): boolean {
  return currentButtons[buttonIndex] && !previousButtons[buttonIndex]
}

/**
 * Convert gamepad state to game input
 */
export function processGamepadInput(state: GamepadState, sensitivity: number = GAMEPAD_LOOK_SENSITIVITY): GamepadInputResult {
  const result: GamepadInputResult = {
    keys: {},
    lookX: 0,
    lookY: 0,
    attack: false,
    placeBlock: false,
    jump: false,
    sprint: false,
    hotbarChange: 0,
    openChat: false,
  }

  if (!state.connected) {
    previousButtons = new Array(16).fill(false)
    return result
  }

  // === Movement (left stick → WASD) ===
  // Forward/backward
  if (state.leftStickY < -0.3) {
    result.keys.KeyW = true
  } else if (state.leftStickY > 0.3) {
    result.keys.KeyS = true
  }

  // Left/right
  if (state.leftStickX < -0.3) {
    result.keys.KeyA = true
  } else if (state.leftStickX > 0.3) {
    result.keys.KeyD = true
  }

  // === Camera rotation (right stick) ===
  result.lookX = state.rightStickX * sensitivity
  result.lookY = state.rightStickY * sensitivity

  // === Jump (A button or space) ===
  if (state.buttons[GamepadButton.A]) {
    result.jump = true
    result.keys.Space = true
  }

  // === Break block (X button or RT) ===
  if (state.buttons[GamepadButton.X] || state.rightTrigger > 0.5) {
    result.attack = true
  }

  // === Place block (B button) ===
  if (isButtonJustPressed(GamepadButton.B, state.buttons)) {
    result.placeBlock = true
  }

  // === Sprint (LT) ===
  if (state.leftTrigger > 0.5) {
    result.sprint = true
    result.keys.ShiftLeft = true
  }

  // === Hotbar slot change (LB/RB) ===
  hotbarCooldown = Math.max(0, hotbarCooldown - 1)
  if (hotbarCooldown === 0) {
    if (isButtonJustPressed(GamepadButton.LB, state.buttons)) {
      result.hotbarChange = -1
      hotbarCooldown = 10 // Frame cooldown
    } else if (isButtonJustPressed(GamepadButton.RB, state.buttons)) {
      result.hotbarChange = 1
      hotbarCooldown = 10
    }
  }

  // Direct slot selection with D-Pad (Up/Down for +1/-1)
  if (isButtonJustPressed(GamepadButton.DPadUp, state.buttons)) {
    result.hotbarChange = -1
  } else if (isButtonJustPressed(GamepadButton.DPadDown, state.buttons)) {
    result.hotbarChange = 1
  }

  // === Open chat (Start button) ===
  if (isButtonJustPressed(GamepadButton.Start, state.buttons)) {
    result.openChat = true
  }

  // Save previous button state
  previousButtons = [...state.buttons]

  return result
}

/**
 * Setup gamepad connection events
 */
export function setupGamepadListeners(onConnect?: (gamepad: Gamepad) => void, onDisconnect?: (gamepad: Gamepad) => void): () => void {
  const handleConnect = (e: GamepadEvent) => {
    console.log('[Gamepad] Connected:', e.gamepad.id)
    onConnect?.(e.gamepad)
  }

  const handleDisconnect = (e: GamepadEvent) => {
    console.log('[Gamepad] Disconnected:', e.gamepad.id)
    onDisconnect?.(e.gamepad)
  }

  window.addEventListener('gamepadconnected', handleConnect)
  window.addEventListener('gamepaddisconnected', handleDisconnect)

  // Check initially connected gamepad
  const gamepad = getConnectedGamepad()
  if (gamepad && onConnect) {
    console.log('[Gamepad] Already connected gamepad found:', gamepad.id)
    onConnect(gamepad)
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('gamepadconnected', handleConnect)
    window.removeEventListener('gamepaddisconnected', handleDisconnect)
  }
}
