import { haptic as iosHaptic } from 'ios-haptics'

type HapticFn = (() => void) & {
  confirm?: () => void
  error?: () => void
}

const GAMEPAD_GAP_MS = 55

type GamepadActuatorLike = {
  playEffect?: (
    type: 'dual-rumble',
    params: {
      duration: number
      startDelay?: number
      weakMagnitude?: number
      strongMagnitude?: number
    },
  ) => Promise<unknown> | unknown
  pulse?: (value: number, duration: number) => Promise<unknown> | unknown
}

function isIOSOrIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const touchPoints = navigator.maxTouchPoints || 0
  const isiOS = /iPad|iPhone|iPod/i.test(ua)
  const isiPadOSDesktop = platform === 'MacIntel' && touchPoints > 1
  return isiOS || isiPadOSDesktop
}

function getIosHaptic(): HapticFn | null {
  if (!isIOSOrIPadOS()) return null
  return typeof iosHaptic === 'function' ? iosHaptic : null
}

function getFirstGamepadActuator(): GamepadActuatorLike | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null
  const gamepads = navigator.getGamepads()
  for (const gamepad of gamepads) {
    if (!gamepad?.connected) continue
    const gp = gamepad as Gamepad & {
      vibrationActuator?: GamepadActuatorLike
      hapticActuators?: GamepadActuatorLike[]
    }
    if (gp.vibrationActuator) return gp.vibrationActuator
    if (Array.isArray(gp.hapticActuators) && gp.hapticActuators.length > 0) {
      return gp.hapticActuators[0]
    }
  }
  return null
}

function pulseGamepad(actuator: GamepadActuatorLike, magnitude: number, duration: number): void {
  if (typeof actuator.playEffect === 'function') {
    void actuator.playEffect('dual-rumble', {
      duration,
      startDelay: 0,
      weakMagnitude: magnitude,
      strongMagnitude: magnitude,
    })
    return
  }
  if (typeof actuator.pulse === 'function') {
    void actuator.pulse(magnitude, duration)
  }
}

function triggerGamepadPattern(type: 'single' | 'confirm' | 'error'): boolean {
  const actuator = getFirstGamepadActuator()
  if (!actuator) return false

  const pulses = type === 'error' ? [26, 26, 26] : type === 'confirm' ? [24, 24] : [20]
  const magnitude = type === 'single' ? 0.45 : 0.6

  let offset = 0
  for (const duration of pulses) {
    window.setTimeout(() => {
      pulseGamepad(actuator, magnitude, duration)
    }, offset)
    offset += duration + GAMEPAD_GAP_MS
  }
  return true
}

export function triggerFootstepVibration(isSprinting: boolean): void {
  const actuator = getFirstGamepadActuator()
  if (actuator) {
    pulseGamepad(actuator, isSprinting ? 0.2 : 0.15, isSprinting ? 18 : 14)
    return
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(isSprinting ? 15 : 10)
  }
}

export function triggerHaptic(type: 'single' | 'confirm' | 'error' = 'single'): void {
  if (typeof window === 'undefined') return
  if (triggerGamepadPattern(type)) return
  const haptic = getIosHaptic()
  if (!haptic) return
  try {
    if (type === 'confirm') {
      haptic.confirm?.()
    } else if (type === 'error') {
      haptic.error?.()
    } else {
      haptic()
    }
  } catch {
    // Ignore haptic failures to avoid blocking UI interactions.
  }
}
