/**
 * TouchCameraHandler - Handles mobile camera rotation via Pointer Events
 *
 * Uses Pointer Events + setPointerCapture for reliable touch tracking.
 * This avoids the browser passive-listener / gesture-interception issues
 * that plague document-level TouchEvent listeners.
 *
 * Registered on the canvas element so only touches that actually land on
 * the game view (not on joystick / jump-button / HUD) are processed.
 *
 * Gesture detection:
 *   - Tap  (< 200 ms, < 10 px movement) → place block
 *   - Long press (≥ 200 ms, < 10 px)    → break block
 *   - Drag (≥ 10 px movement)           → camera rotation
 */

import { triggerHaptic } from '../../utils/haptics'
import type { GameEngine } from './game-engine'
import type { InputCallbacks } from './types'

const LONG_PRESS_MS = 200
const MOVE_THRESHOLD = 10
const BREAK_TO_ROTATE_THRESHOLD = 20
const TAP_MAX_MS = 200
const TAP_MAX_PX = 10
const LOOK_SENSITIVITY = 0.004

type Mode = 'none' | 'rotate' | 'breaking'

export class TouchCameraHandler {
  private pointerId: number | null = null
  private lastX = 0
  private lastY = 0
  private startX = 0
  private startY = 0
  private startTime = 0
  private mode: Mode = 'none'
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private engine: GameEngine,
    private callbacks: InputCallbacks,
    private isEnabled: () => boolean,
  ) {}

  register(): void {
    const c = this.engine.renderer.domElement
    c.addEventListener('pointerdown', this.onDown)
    c.addEventListener('pointermove', this.onMove)
    c.addEventListener('pointerup', this.onUp)
    c.addEventListener('pointercancel', this.onUp)
  }

  unregister(): void {
    const c = this.engine.renderer.domElement
    c.removeEventListener('pointerdown', this.onDown)
    c.removeEventListener('pointermove', this.onMove)
    c.removeEventListener('pointerup', this.onUp)
    c.removeEventListener('pointercancel', this.onUp)
    this.reset()
  }

  private reset(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.mode === 'breaking') {
      this.engine.mouseHeld = false
      this.engine.isBreaking = false
      this.engine.breakProgress = 0
    }
    this.pointerId = null
    this.mode = 'none'
  }

  /* ── pointer handlers (arrow fns for stable `this`) ── */

  private onDown = (e: PointerEvent): void => {
    if (!this.isEnabled()) return
    if (this.pointerId !== null) return

    this.pointerId = e.pointerId
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.startX = e.clientX
    this.startY = e.clientY
    this.startTime = Date.now()
    this.mode = 'none'

    // Long-press → block breaking
    this.timer = setTimeout(() => {
      this.timer = null
      this.mode = 'breaking'
      this.engine.mouseHeld = true
      this.engine.isBreaking = true
      this.engine.breakProgress = 0
      triggerHaptic('error')
    }, LONG_PRESS_MS)

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault() // suppress synthetic mousedown
  }

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return

    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY

    const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY)

    // mode transitions
    if (this.mode === 'none' && dist > MOVE_THRESHOLD) {
      this.mode = 'rotate'
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    } else if (this.mode === 'breaking' && dist > BREAK_TO_ROTATE_THRESHOLD) {
      this.mode = 'rotate'
      this.engine.mouseHeld = false
      this.engine.isBreaking = false
      this.engine.breakProgress = 0
    }

    // camera rotation
    if (this.mode === 'rotate') {
      const p = this.engine.player
      p.rotation.y -= dx * LOOK_SENSITIVITY
      p.rotation.x -= dy * LOOK_SENSITIVITY
      p.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, p.rotation.x))
    }
  }

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.mode === 'breaking') {
      this.engine.mouseHeld = false
      this.engine.isBreaking = false
      this.engine.breakProgress = 0
    } else if (this.mode === 'none') {
      // tap → place block
      const dt = Date.now() - this.startTime
      const dist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY)
      if (dt < TAP_MAX_MS && dist < TAP_MAX_PX) {
        this.callbacks.onPlaceBlock?.()
      }
    }

    this.pointerId = null
    this.mode = 'none'
  }
}
