import { useCallback, useEffect, useRef } from 'react'
import type { CalculatedPosition, JoystickInput, JoystickPosition } from './types'

interface UseJoystickTouchProps {
  visible: boolean
  leftTouchIdRef: React.MutableRefObject<number | null>
  leftOriginRef: React.MutableRefObject<JoystickPosition>
  leftKnobRef: React.RefObject<HTMLDivElement | null>
  leftBaseRef: React.RefObject<HTMLDivElement | null>
  calculateJoystickPosition: (touchX: number, touchY: number, originX: number, originY: number) => CalculatedPosition
  updateInput: (partial: Partial<JoystickInput>) => void
}

export function useJoystickTouch({ visible, leftTouchIdRef, leftOriginRef, leftKnobRef, leftBaseRef, calculateJoystickPosition, updateInput }: UseJoystickTouchProps) {
  // Reset left joystick
  const resetLeftJoystick = useCallback(() => {
    leftTouchIdRef.current = null
    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = 'translate(0px, 0px)'
    }
    updateInput({ moveX: 0, moveY: 0 })
  }, [leftTouchIdRef, leftKnobRef, updateInput])

  // Touch event handlers for left joystick (document level for move/end)
  useEffect(() => {
    if (!visible) return

    const handleTouchMove = (e: TouchEvent) => {
      let leftTouchFound = false

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i]

        if (touch.identifier === leftTouchIdRef.current) {
          leftTouchFound = true
          e.preventDefault()
          const pos = calculateJoystickPosition(touch.clientX, touch.clientY, leftOriginRef.current.x, leftOriginRef.current.y)
          if (leftKnobRef.current) {
            leftKnobRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`
          }
          updateInput({ moveX: pos.normalizedX, moveY: pos.normalizedY })
        }
      }

      if (leftTouchIdRef.current !== null && !leftTouchFound) {
        resetLeftJoystick()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === leftTouchIdRef.current) {
          resetLeftJoystick()
        }
      }
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
      resetLeftJoystick()
    }
  }, [visible, leftTouchIdRef, leftOriginRef, leftKnobRef, calculateJoystickPosition, updateInput, resetLeftJoystick])

  // Mouse tracking state
  const isMouseLeftActiveRef = useRef(false)

  // Mouse event handlers (desktop joystick mode)
  useEffect(() => {
    if (!visible) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseLeftActiveRef.current) {
        const pos = calculateJoystickPosition(e.clientX, e.clientY, leftOriginRef.current.x, leftOriginRef.current.y)
        if (leftKnobRef.current) {
          leftKnobRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`
        }
        updateInput({ moveX: pos.normalizedX, moveY: pos.normalizedY })
      }
    }

    const handleMouseUp = () => {
      if (isMouseLeftActiveRef.current) {
        isMouseLeftActiveRef.current = false
        leftTouchIdRef.current = null
        if (leftKnobRef.current) {
          leftKnobRef.current.style.transform = 'translate(0px, 0px)'
        }
        updateInput({ moveX: 0, moveY: 0 })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [visible, leftOriginRef, leftKnobRef, leftTouchIdRef, calculateJoystickPosition, updateInput])

  // Left joystick touch/mouse start handler
  const handleLeftJoystickTouchStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (leftTouchIdRef.current !== null) return

      const base = leftBaseRef.current
      if (!base) return
      const rect = base.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      leftOriginRef.current = { x: centerX, y: centerY }

      if ('touches' in e) {
        leftTouchIdRef.current = e.changedTouches[0].identifier
      } else {
        leftTouchIdRef.current = -1
        isMouseLeftActiveRef.current = true
      }

      if (leftKnobRef.current) {
        leftKnobRef.current.style.transform = 'translate(0px, 0px)'
      }

      e.preventDefault()
      e.stopPropagation()
    },
    [leftTouchIdRef, leftOriginRef, leftKnobRef, leftBaseRef],
  )

  return {
    handleLeftJoystickTouchStart,
  }
}
