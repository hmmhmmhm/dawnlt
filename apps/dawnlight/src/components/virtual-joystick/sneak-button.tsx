import { ACTION_BUTTON_SCALE, getActionButtonVisualStyle, SneakActionIcon } from './action-button-visuals'
import { DEFAULT_LEFT_POS } from './constants'

interface SneakButtonProps {
  buttonSize: number
  joystickSize: number
  active: boolean
  onToggle: () => void
  position?: 'lower' | 'upper'
}

export function SneakButton({ buttonSize, joystickSize, active, onToggle, position = 'lower' }: SneakButtonProps) {
  const width = buttonSize * 1.45
  const height = buttonSize * 1.1
  const baseBottomOffset = DEFAULT_LEFT_POS.y + (joystickSize - height) / 2 - 52
  const leftOffset = DEFAULT_LEFT_POS.x + joystickSize + 12
  const bottomOffset = position === 'upper' ? baseBottomOffset + height + 12 : baseBottomOffset
  const visualStyle = getActionButtonVisualStyle(active)

  return (
    <div className="absolute pointer-events-auto z-10" style={{ left: leftOffset, bottom: bottomOffset }}>
      <button
        type="button"
        aria-label="Sneak"
        title="Sneak"
        className={visualStyle.className}
        style={{ width, height, ...visualStyle.style }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          onToggle()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseUp={(e) => {
          e.preventDefault()
          onToggle()
        }}
      >
        <SneakActionIcon size={buttonSize * 0.88 * ACTION_BUTTON_SCALE} />
      </button>
    </div>
  )
}
