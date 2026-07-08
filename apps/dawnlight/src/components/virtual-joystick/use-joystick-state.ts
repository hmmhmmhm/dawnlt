import { useCallback, useRef } from 'react'
import type { CalculatedPosition, JoystickInput, JoystickPosition } from './types'

export function useJoystickState(onInputChange: (input: JoystickInput) => void, maxDistance: number) {
  // Touch ID tracking (left joystick only)
  const leftTouchIdRef = useRef<number | null>(null)

  // Joystick origin point (center of fixed joystick)
  const leftOriginRef = useRef<JoystickPosition>({ x: 0, y: 0 })

  // Current input state
  const inputRef = useRef<JoystickInput>({
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    jump: false,
    sprint: false,
    attack: false,
    placeBlock: false,
  })

  // Store onInputChange in ref to solve useEffect dependency issues
  const onInputChangeRef = useRef(onInputChange)
  onInputChangeRef.current = onInputChange

  // Input update function
  const updateInput = useCallback((partial: Partial<JoystickInput>) => {
    inputRef.current = { ...inputRef.current, ...partial }
    onInputChangeRef.current(inputRef.current)
  }, [])

  // Calculate joystick position
  const calculateJoystickPosition = useCallback(
    (touchX: number, touchY: number, originX: number, originY: number): CalculatedPosition => {
      const deltaX = touchX - originX
      const deltaY = touchY - originY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      let clampedX = deltaX
      let clampedY = deltaY

      if (distance > maxDistance) {
        clampedX = (deltaX / distance) * maxDistance
        clampedY = (deltaY / distance) * maxDistance
      }

      return {
        x: clampedX,
        y: clampedY,
        normalizedX: maxDistance > 0 ? clampedX / maxDistance : 0,
        normalizedY: maxDistance > 0 ? clampedY / maxDistance : 0,
      }
    },
    [maxDistance],
  )

  return {
    leftTouchIdRef,
    leftOriginRef,
    updateInput,
    calculateJoystickPosition,
  }
}
