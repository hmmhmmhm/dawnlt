import { useCallback, useEffect, useRef, useState } from 'react'
import { triggerHaptic } from '../../utils/haptics'
import { CrouchButton } from './crouch-button'
import { EmotionButton } from './emotion-button'
import { JoystickBase } from './joystick-base'
import { JumpButton } from './jump-button'
import { SneakButton } from './sneak-button'
import { SprintButton } from './sprint-button'
import type { VirtualJoystickProps } from './types'
import { useJoystickState } from './use-joystick-state'
import { useJoystickTouch } from './use-joystick-touch'
import { calculateSizes } from './utils'

export function VirtualJoystick({ onInputChange, visible, onToggleCrouch, onToggleSneak, onTriggerEmotion, isCrouching = false, isSneaking = false, isMoving = false, hideActionButtons = false }: VirtualJoystickProps) {
  // Dynamic size state
  const [sizes, setSizes] = useState(() => calculateSizes(window.innerWidth, window.innerHeight))
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [isSprintActive, setIsSprintActive] = useState(false)

  // Screen size change detection
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      setSizes(calculateSizes(window.innerWidth, window.innerHeight))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Refs
  const leftKnobRef = useRef<HTMLDivElement>(null)
  const leftBaseRef = useRef<HTMLDivElement>(null)

  // Joystick state management (left only)
  const { leftTouchIdRef, leftOriginRef, updateInput, calculateJoystickPosition } = useJoystickState(onInputChange, sizes.maxDistance)

  // Touch event handling
  const { handleLeftJoystickTouchStart } = useJoystickTouch({
    visible,
    leftTouchIdRef,
    leftOriginRef,
    leftKnobRef,
    leftBaseRef,
    calculateJoystickPosition,
    updateInput,
  })

  // Button handlers
  const handleJumpStart = useCallback(() => {
    updateInput({ jump: true })
  }, [updateInput])

  const handleJumpEnd = useCallback(() => {
    triggerHaptic()
    updateInput({ jump: false })
  }, [updateInput])

  const handleSprintStart = useCallback(() => {
    triggerHaptic()
    setIsSprintActive(true)
    updateInput({ sprint: true })
  }, [updateInput])

  const handleSprintEnd = useCallback(() => {
    setIsSprintActive(false)
    updateInput({ sprint: false })
  }, [updateInput])

  const handleSprintToggle = useCallback(() => {
    triggerHaptic()
    setIsSprintActive((prev) => {
      const next = !prev
      updateInput({ sprint: next })
      return next
    })
  }, [updateInput])

  useEffect(() => {
    if (!visible && isSprintActive) {
      setIsSprintActive(false)
      updateInput({ sprint: false })
    }
  }, [visible, isSprintActive, updateInput])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      onInputChange({
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0,
        jump: false,
        sprint: false,
        attack: false,
        placeBlock: false,
      })
    }
  }, [onInputChange])

  if (!visible) return null

  const { joystickSize, knobSize, buttonSize } = sizes
  const showStealthButtons = viewportWidth > 300

  return (
    <div className="fixed inset-0 pointer-events-none z-60">
      {/* Left joystick (movement) - fixed position */}
      <JoystickBase baseRef={leftBaseRef} knobRef={leftKnobRef} joystickSize={joystickSize} knobSize={knobSize} onTouchStart={handleLeftJoystickTouchStart} onMouseDown={handleLeftJoystickTouchStart} />

      {!hideActionButtons && (
        <>
          {/* Jump button */}
          <JumpButton buttonSize={buttonSize} onJumpStart={handleJumpStart} onJumpEnd={handleJumpEnd} />

          <SprintButton buttonSize={buttonSize} isSprintActive={isSprintActive} onSprintStart={handleSprintStart} onSprintEnd={handleSprintEnd} onSprintToggle={handleSprintToggle} />

          {showStealthButtons && isMoving && (
            <SneakButton
              buttonSize={buttonSize}
              joystickSize={joystickSize}
              active={isSneaking}
              position="upper"
              onToggle={() => {
                triggerHaptic()
                onToggleSneak?.()
              }}
            />
          )}

          {showStealthButtons && !isMoving && (
            <CrouchButton
              buttonSize={buttonSize}
              joystickSize={joystickSize}
              active={isCrouching}
              onToggle={() => {
                triggerHaptic()
                onToggleCrouch?.()
              }}
            />
          )}

          {showStealthButtons && (
            <EmotionButton
              buttonSize={buttonSize}
              joystickSize={joystickSize}
              onTrigger={() => {
                triggerHaptic()
                onTriggerEmotion?.()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
