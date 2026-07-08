import { MAX_BUTTON_SIZE, MAX_JOYSTICK_SIZE, MAX_KNOB_SIZE, MIN_BUTTON_SIZE, MIN_JOYSTICK_SIZE, MIN_KNOB_SIZE } from './constants'
import type { JoystickSizes } from './types'

// Calculate joystick size based on screen size
export function calculateSizes(screenWidth: number, screenHeight: number): JoystickSizes {
  // Calculate based on shorter screen dimension
  const minDimension = Math.min(screenWidth, screenHeight)

  // Screen size ratio (based on 320px ~ 768px)
  const ratio = Math.max(0, Math.min(1, (minDimension - 320) / (768 - 320)))

  const joystickSize = Math.round(MIN_JOYSTICK_SIZE + ratio * (MAX_JOYSTICK_SIZE - MIN_JOYSTICK_SIZE))
  const knobSize = Math.round(MIN_KNOB_SIZE + ratio * (MAX_KNOB_SIZE - MIN_KNOB_SIZE))
  const buttonSize = Math.round(MIN_BUTTON_SIZE + ratio * (MAX_BUTTON_SIZE - MIN_BUTTON_SIZE))
  const maxDistance = (joystickSize - knobSize) / 2

  return { joystickSize, knobSize, buttonSize, maxDistance }
}
