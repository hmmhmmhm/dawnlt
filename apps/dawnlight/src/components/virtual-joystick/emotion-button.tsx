import { ACTION_BUTTON_SCALE, EmoteActionIcon, getActionButtonVisualStyle } from './action-button-visuals'
import { DEFAULT_LEFT_POS } from './constants'

interface EmotionButtonProps {
  buttonSize: number
  joystickSize: number
  onTrigger: () => void
}

export function EmotionButton({ buttonSize, joystickSize, onTrigger }: EmotionButtonProps) {
  const width = buttonSize * 1.45
  const height = buttonSize * 1.1
  const leftOffset = DEFAULT_LEFT_POS.x + joystickSize + 12
  const bottomOffset = DEFAULT_LEFT_POS.y + (joystickSize - height) / 2 - 52
  const visualStyle = getActionButtonVisualStyle(false)

  return (
    <div className="absolute pointer-events-auto z-10" style={{ left: leftOffset, bottom: bottomOffset }}>
      <button
        type="button"
        aria-label="Emote"
        title="Emote"
        className={visualStyle.className}
        style={{ width, height, ...visualStyle.style }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          onTrigger()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseUp={(e) => {
          e.preventDefault()
          onTrigger()
        }}
      >
        <EmoteActionIcon size={buttonSize * 0.88 * ACTION_BUTTON_SCALE} />
      </button>
    </div>
  )
}
