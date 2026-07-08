export interface JoystickInput {
  // Movement joystick (left)
  moveX: number // -1 to 1
  moveY: number // -1 to 1
  // Camera joystick (right)
  lookX: number // -1 to 1
  lookY: number // -1 to 1
  // Action buttons
  jump: boolean
  sprint: boolean
  attack: boolean
  placeBlock: boolean
}

// Block touch event type
export interface BlockTouchEvent {
  screenX: number
  screenY: number
  type: 'start' | 'end' | 'cancel'
  touchId: number
}

export interface VirtualJoystickProps {
  onInputChange: (input: JoystickInput) => void
  onBlockTouch?: (event: BlockTouchEvent) => void
  onToggleCrouch?: () => void
  onToggleSneak?: () => void
  onTriggerEmotion?: () => void
  isCrouching?: boolean
  isSneaking?: boolean
  isMoving?: boolean
  hideActionButtons?: boolean
  visible: boolean
}

export interface JoystickPosition {
  x: number
  y: number
}

export interface JoystickSizes {
  joystickSize: number
  knobSize: number
  buttonSize: number
  maxDistance: number
}

export interface CalculatedPosition {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
}
