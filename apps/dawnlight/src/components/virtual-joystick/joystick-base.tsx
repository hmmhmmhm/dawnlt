import { DEFAULT_LEFT_POS } from './constants'

interface JoystickBaseProps {
  baseRef: React.RefObject<HTMLDivElement | null>
  knobRef: React.RefObject<HTMLDivElement | null>
  joystickSize: number
  knobSize: number
  onTouchStart: (e: React.TouchEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
}

export function JoystickBase({ baseRef, knobRef, joystickSize, knobSize, onTouchStart, onMouseDown }: JoystickBaseProps) {
  const shellStyle: React.CSSProperties = {
    borderColor: 'rgba(255,255,255,0.32)',
    background: 'linear-gradient(180deg, rgba(41,59,82,0.34) 0%, rgba(17,29,46,0.3) 55%, rgba(10,16,28,0.24) 100%)',
    boxShadow: '0 10px 22px rgba(2,7,18,0.34), inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -8px 14px rgba(0,0,0,0.22)',
  }

  const innerRingStyle: React.CSSProperties = {
    borderColor: 'rgba(255,255,255,0.22)',
    background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.1) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -6px 12px rgba(0,0,0,0.16)',
  }

  const knobStyle: React.CSSProperties = {
    borderColor: 'rgba(255,255,255,0.72)',
    background: 'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.96) 0%, rgba(236,236,236,0.9) 48%, rgba(184,184,184,0.82) 100%)',
    boxShadow: '0 8px 16px rgba(3,10,20,0.34), inset 0 1px 0 rgba(255,255,255,0.94), inset 0 -5px 8px rgba(85,85,85,0.32)',
  }

  return (
    <div
      role="application"
      ref={baseRef}
      className="absolute pointer-events-auto z-10"
      style={{
        width: joystickSize,
        height: joystickSize,
        left: DEFAULT_LEFT_POS.x,
        bottom: DEFAULT_LEFT_POS.y,
        touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
    >
      {/* Base shell */}
      <div className="absolute inset-0 rounded-full border-2 backdrop-blur-md" style={shellStyle} />

      {/* Inner guide ring */}
      <div className="absolute inset-[12%] rounded-full border" style={innerRingStyle} />

      {/* Center marker */}
      <div
        className="absolute rounded-full"
        style={{
          width: Math.max(6, joystickSize * 0.08),
          height: Math.max(6, joystickSize * 0.08),
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(210,236,255,0.5)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 0 10px rgba(140,203,255,0.25)',
        }}
      />

      {/* Joystick knob */}
      <div
        ref={knobRef}
        className="absolute rounded-full border-2"
        style={{
          width: knobSize,
          height: knobSize,
          left: (joystickSize - knobSize) / 2,
          top: (joystickSize - knobSize) / 2,
          ...knobStyle,
        }}
      />
    </div>
  )
}
