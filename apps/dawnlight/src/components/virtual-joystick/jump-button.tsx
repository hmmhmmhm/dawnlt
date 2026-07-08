import { useEffect, useState } from 'react'
import { ACTION_BUTTON_DROP, ACTION_BUTTON_SCALE, getActionButtonVisualStyle, JumpActionIcon } from './action-button-visuals'

interface JumpButtonProps {
  buttonSize: number
  onJumpStart: () => void
  onJumpEnd: () => void
}

export function JumpButton({ buttonSize, onJumpStart, onJumpEnd }: JumpButtonProps) {
  const [viewport, setViewport] = useState(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })
  const [pressed, setPressed] = useState(false)

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

  // Keep jump button above hotbar on short mobile screens.
  const bottomOffset = isMobile ? (isPortrait ? (isShortHeight ? 140 : 116) : isShortHeight ? 110 : 92) : 20
  const adjustedBottomOffset = Math.max(8, bottomOffset - ACTION_BUTTON_DROP)
  const visualStyle = getActionButtonVisualStyle(pressed)

  return (
    <div className="absolute right-4 pointer-events-auto z-10" style={{ bottom: `calc(${adjustedBottomOffset}px + env(safe-area-inset-bottom, 0px))` }}>
      <button
        type="button"
        aria-label="Jump"
        title="Jump"
        className={visualStyle.className}
        style={{
          width: buttonSize * 2 * ACTION_BUTTON_SCALE,
          height: buttonSize * 1.3 * ACTION_BUTTON_SCALE,
          ...visualStyle.style,
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setPressed(true)
          onJumpStart()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          setPressed(false)
          onJumpEnd()
        }}
        onTouchCancel={() => {
          setPressed(false)
          onJumpEnd()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setPressed(true)
          onJumpStart()
        }}
        onMouseUp={(e) => {
          e.preventDefault()
          setPressed(false)
          onJumpEnd()
        }}
        onMouseLeave={() => {
          setPressed(false)
          onJumpEnd()
        }}
      >
        <JumpActionIcon size={buttonSize * 0.98 * ACTION_BUTTON_SCALE} />
      </button>
    </div>
  )
}
