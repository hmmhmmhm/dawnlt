import type { CSSProperties } from 'react'
import { MdAccessibilityNew, MdAirlineSeatReclineNormal, MdDirectionsRun, MdEmojiPeople } from 'react-icons/md'
import { PiSneakerMoveFill } from 'react-icons/pi'

export const ACTION_BUTTON_SCALE = 0.86
export const ACTION_BUTTON_DROP = 22

const BASE_CLASS = 'relative overflow-hidden rounded-full border backdrop-blur-md flex items-center justify-center text-white select-none transition-all duration-150 active:scale-[0.98]'

const IDLE_STYLE: CSSProperties = {
  borderColor: 'rgba(255,255,255,0.3)',
  background: 'linear-gradient(180deg, rgba(41,59,82,0.32) 0%, rgba(17,29,46,0.3) 55%, rgba(10,16,28,0.26) 100%)',
  boxShadow: '0 8px 18px rgba(2,7,18,0.3), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -6px 14px rgba(0,0,0,0.2)',
}

const PRESSED_STYLE: CSSProperties = {
  borderColor: 'rgba(129,210,255,0.75)',
  background: 'linear-gradient(180deg, rgba(48,94,130,0.5) 0%, rgba(27,56,84,0.48) 58%, rgba(18,39,62,0.44) 100%)',
  boxShadow: '0 8px 20px rgba(0,14,32,0.35), 0 0 0 1px rgba(98,195,255,0.28), inset 0 1px 0 rgba(255,255,255,0.36), inset 0 -8px 16px rgba(0,0,0,0.24)',
}

export function getActionButtonVisualStyle(isActive: boolean): {
  className: string
  style: CSSProperties
} {
  return {
    className: BASE_CLASS,
    style: isActive ? PRESSED_STYLE : IDLE_STYLE,
  }
}

interface ActionIconProps {
  size: number
}

export function JumpActionIcon({ size }: ActionIconProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8FE8FF',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))',
      }}
    >
      <MdAccessibilityNew size={size * 0.92} />
    </span>
  )
}

export function SprintActionIcon({ size }: ActionIconProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFC16D',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))',
      }}
    >
      <MdDirectionsRun size={size * 0.98} />
    </span>
  )
}

export function CrouchActionIcon({ size }: ActionIconProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9BE6FF',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))',
      }}
    >
      <MdAirlineSeatReclineNormal size={size * 0.95} />
    </span>
  )
}

export function SneakActionIcon({ size }: ActionIconProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8FEFC8',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))',
      }}
    >
      <PiSneakerMoveFill size={size * 0.9} />
    </span>
  )
}

export function EmoteActionIcon({ size }: ActionIconProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFD58A',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.28))',
      }}
    >
      <MdEmojiPeople size={size * 0.9} />
    </span>
  )
}
