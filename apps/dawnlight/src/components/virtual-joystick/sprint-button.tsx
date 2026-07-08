import { useEffect, useState } from 'react'
import { ACTION_BUTTON_DROP, ACTION_BUTTON_SCALE, getActionButtonVisualStyle, SprintActionIcon } from './action-button-visuals'

interface SprintButtonProps {
  buttonSize: number
  isSprintActive: boolean
  onSprintStart: () => void
  onSprintEnd: () => void
  onSprintToggle: () => void
}

export function SprintButton({ buttonSize, isSprintActive, onSprintStart, onSprintEnd, onSprintToggle }: SprintButtonProps) {
  const [viewport, setViewport] = useState(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })
  const [mousePressed, setMousePressed] = useState(false)

  useEffect(() => {
    const check = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isMobile = viewport.width < 768
  const isPortrait = viewport.height > viewport.width
  const isShortHeight = viewport.height < 700
  const jumpBottomOffset = isMobile ? (isPortrait ? (isShortHeight ? 140 : 116) : isShortHeight ? 110 : 92) : 20

  const actionHeight = buttonSize * 1.3 * ACTION_BUTTON_SCALE
  const adjustedJumpBottomOffset = Math.max(8, jumpBottomOffset - ACTION_BUTTON_DROP)
  // Stack sprint above jump button.
  const sprintBottomOffset = adjustedJumpBottomOffset + actionHeight + 12
  const visualStyle = getActionButtonVisualStyle(isMobile ? isSprintActive : mousePressed)

  return (
    <div className="absolute right-4 pointer-events-auto z-10" style={{ bottom: `calc(${sprintBottomOffset}px + env(safe-area-inset-bottom, 0px))` }}>
      <button
        type="button"
        aria-label="Run"
        title="Run"
        className={visualStyle.className}
        style={{
          width: buttonSize * 2 * ACTION_BUTTON_SCALE,
          height: actionHeight,
          ...visualStyle.style,
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isMobile) return
          setMousePressed(true)
          onSprintStart()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          if (isMobile) {
            onSprintToggle()
            return
          }
          setMousePressed(false)
          onSprintEnd()
        }}
        onTouchCancel={() => {
          if (isMobile) return
          setMousePressed(false)
          onSprintEnd()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMousePressed(true)
          onSprintStart()
        }}
        onMouseUp={(e) => {
          e.preventDefault()
          setMousePressed(false)
          onSprintEnd()
        }}
        onMouseLeave={() => {
          setMousePressed(false)
          onSprintEnd()
        }}
      >
        <SprintActionIcon size={buttonSize * 0.98 * ACTION_BUTTON_SCALE} />
      </button>
    </div>
  )
}
