import { AMBIENT_FADE_MS, DEBOUNCE_MS, MASTER_VOLUME, PITCH_MAX, PITCH_MIN, SFX_VOLUMES, VOLUME_AMBIENT } from './sfx-manager-config'
import { getAmbientSfxUrls, getPrioritySfxUrls } from './sfx-map'

export { SFX_VOLUMES }

export class SfxManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private buffers: Map<string, AudioBuffer> = new Map()
  private enabled = true
  private unlocked = false
  private disposed = false
  private gestureListenersActive = true
  private preloaded = false

  private lastPlayTime: Map<string, number> = new Map()

  private ambientSources: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map()

  private repeatAmbients: Map<
    string,
    {
      source: AudioBufferSourceNode
      gain: GainNode
      urls: readonly string[]
      volume: number
      minDelay: number
      maxDelay: number
      timer: ReturnType<typeof setTimeout> | null
    }
  > = new Map()

  /** Events to listen for user gestures (broad set for cross-browser) */
  private static readonly GESTURE_EVENTS = ['click', 'touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'keydown'] as const

  constructor() {
    // Register user-gesture listeners for iOS Safari audio unlock.
    // Uses CAPTURE phase so that stopPropagation() in child components
    // (e.g. virtual joystick) cannot prevent the unlock from firing.
    const opts: AddEventListenerOptions = { capture: true, passive: true }
    for (const evt of SfxManager.GESTURE_EVENTS) {
      document.addEventListener(evt, this.onGesture, opts)
    }

    // Pause/resume ambient loops on visibility change
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  // ── Event Handlers ──────────────────────────────────────────

  /**
   * On user gesture: create/resume AudioContext and preload all SFX.
   * iOS Safari requires AudioContext.resume() from specific events
   * (click, touchend, keydown). touchstart/touchmove may not work for
   * resume(), so we keep retrying on every gesture until successful.
   * Also plays a silent buffer to force-unlock on all platforms.
   */
  private onGesture = (): void => {
    if (this.disposed || this.unlocked) return

    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = MASTER_VOLUME
      this.masterGain.connect(this.ctx.destination)
    }

    // Always attempt resume — keep trying until it works
    if (this.ctx.state === 'running') {
      this.tryUnlock()
    } else if (this.ctx.state === 'suspended') {
      // Play a silent buffer to force iOS Safari to unlock the context
      this.playSilentBuffer()
      this.ctx
        .resume()
        .then(() => this.tryUnlock())
        .catch(() => {})
    }
  }

  /** Play a tiny silent buffer — the most reliable iOS Safari unlock trick */
  private playSilentBuffer(): void {
    if (!this.ctx) return
    try {
      const buf = this.ctx.createBuffer(1, 1, 22050)
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.connect(this.ctx.destination)
      src.start(0)
    } catch {
      /* ignore */
    }
  }

  /** Called once AudioContext is confirmed running */
  private tryUnlock(): void {
    if (this.unlocked || this.disposed) return
    this.unlocked = true
    console.log('[SFX] AudioContext unlocked')
    this.removeGestureListeners()

    // Tiered preload: walk/place/break first, then ambient
    if (!this.preloaded) {
      this.preloaded = true
      this.preload(getPrioritySfxUrls()).then(() => {
        this.preload(getAmbientSfxUrls())
      })
    }
  }

  /** Resume ambient loops when returning to tab */
  private onVisibility = (): void => {
    if (this.disposed || !this.ctx) return

    if (document.hidden) {
      // Suspend context to save resources
      if (this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {})
      }
    } else {
      // Resume context when tab becomes visible
      if (this.ctx.state === 'suspended' && this.enabled) {
        this.ctx.resume().catch(() => {})
      }
    }
  }

  private removeGestureListeners(): void {
    if (!this.gestureListenersActive) return
    this.gestureListenersActive = false
    const opts: EventListenerOptions = { capture: true }
    for (const evt of SfxManager.GESTURE_EVENTS) {
      document.removeEventListener(evt, this.onGesture, opts)
    }
  }

  // ── Preloading ────────────────────────────────────────────

  /**
   * Fetch and decode audio files into AudioBuffers.
   * Errors are silently caught — missing files simply won't play.
   */
  async preload(urls: string[]): Promise<void> {
    if (!this.ctx) return

    const promises = urls.map(async (url) => {
      if (this.buffers.has(url)) return
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.ctx?.decodeAudioData(arrayBuffer)
        if (!audioBuffer) return
        this.buffers.set(url, audioBuffer)
      } catch {
        // Silently skip — file might not exist or decode failed
      }
    })

    await Promise.allSettled(promises)
    console.log(`[SFX] Preloaded ${this.buffers.size}/${urls.length} sounds`)
  }

  // ── One-shot Playback ─────────────────────────────────────

  /**
   * Play a one-shot sound effect.
   * @param url - Path to the SFX file (must be preloaded)
   * @param volume - Volume relative to master (0–1). Default uses master.
   * @param pitchVariation - If true, randomize playbackRate slightly.
   */
  play(url: string, volume = 1, pitchVariation = true): void {
    if (!this.ctx || !this.masterGain || !this.enabled || !this.unlocked || this.disposed) return

    const buffer = this.buffers.get(url)
    if (!buffer) return

    // Debounce: skip if the same URL was played within DEBOUNCE_MS
    const now = performance.now()
    const lastTime = this.lastPlayTime.get(url) ?? 0
    if (now - lastTime < DEBOUNCE_MS) return
    this.lastPlayTime.set(url, now)

    const source = this.ctx.createBufferSource()
    source.buffer = buffer

    // Pitch variation to reduce repetitiveness
    if (pitchVariation) {
      source.playbackRate.value = PITCH_MIN + Math.random() * (PITCH_MAX - PITCH_MIN)
    }

    // Per-sound gain node -> master gain
    const gain = this.ctx.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(this.masterGain)

    source.start()
    // Source is automatically garbage-collected after playback ends
  }

  /**
   * Play a random variant from an array of URLs.
   * Useful for footstep sounds with multiple variations.
   */
  playRandom(urls: readonly string[], volume = 1): void {
    if (urls.length === 0) return
    const idx = Math.floor(Math.random() * urls.length)
    this.play(urls[idx], volume)
  }

  // ── Ambient Loops ─────────────────────────────────────────

  /**
   * Start a looping ambient sound (e.g. rain, swimming).
   * If the ambient is already playing, this is a no-op.
   */
  startAmbient(id: string, url: string, volume = VOLUME_AMBIENT): void {
    if (!this.ctx || !this.masterGain || !this.enabled || !this.unlocked || this.disposed) return
    if (this.ambientSources.has(id)) return

    const buffer = this.buffers.get(url)
    if (!buffer) return

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = this.ctx.createGain()
    gain.gain.value = 0 // Start silent for fade-in
    source.connect(gain)
    gain.connect(this.masterGain)

    source.start()

    // Fade in
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + AMBIENT_FADE_MS / 1000)

    this.ambientSources.set(id, { source, gain })
  }

  /**
   * Start a non-looping ambient that repeats with random delays.
   * Each play picks a random URL from the array and waits a random
   * delay between minDelay and maxDelay (ms) before playing the next.
   */
  startRepeatAmbient(id: string, urls: readonly string[], volume: number, minDelay: number, maxDelay: number): void {
    if (!this.ctx || !this.masterGain || !this.enabled || !this.unlocked || this.disposed) return
    if (this.repeatAmbients.has(id)) return

    this.scheduleRepeatAmbient(id, urls, volume, minDelay, maxDelay)
  }

  private scheduleRepeatAmbient(id: string, urls: readonly string[], volume: number, minDelay: number, maxDelay: number): void {
    if (!this.ctx || !this.masterGain || this.disposed) return

    const url = urls[Math.floor(Math.random() * urls.length)]
    const buffer = this.buffers.get(url)
    if (!buffer) return

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = false

    const gain = this.ctx.createGain()
    gain.gain.value = 0
    source.connect(gain)
    gain.connect(this.masterGain)

    source.start()
    // Fade in
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + AMBIENT_FADE_MS / 1000)

    const entry = {
      source,
      gain,
      urls,
      volume,
      minDelay,
      maxDelay,
      timer: null as ReturnType<typeof setTimeout> | null,
    }
    this.repeatAmbients.set(id, entry)

    // When this clip ends, schedule next after a random delay
    source.onended = () => {
      if (this.disposed || !this.repeatAmbients.has(id)) return
      const delay = minDelay + Math.random() * (maxDelay - minDelay)
      entry.timer = setTimeout(() => {
        if (this.disposed || !this.repeatAmbients.has(id)) return
        this.repeatAmbients.delete(id)
        this.scheduleRepeatAmbient(id, urls, volume, minDelay, maxDelay)
      }, delay)
    }
  }

  /** Stop a repeat ambient with fade-out */
  stopRepeatAmbient(id: string, fadeDuration = AMBIENT_FADE_MS): void {
    const entry = this.repeatAmbients.get(id)
    if (!entry || !this.ctx) return

    if (entry.timer) clearTimeout(entry.timer)
    const { source, gain } = entry
    const fadeEnd = this.ctx.currentTime + fadeDuration / 1000
    gain.gain.cancelScheduledValues(this.ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, fadeEnd)

    setTimeout(() => {
      try {
        source.stop()
      } catch {
        /* */
      }
      source.disconnect()
      gain.disconnect()
    }, fadeDuration + 50)

    this.repeatAmbients.delete(id)
  }

  /** Update volume of a repeat ambient */
  setRepeatAmbientVolume(id: string, volume: number): void {
    const entry = this.repeatAmbients.get(id)
    if (!entry || !this.ctx) return
    entry.volume = volume
    entry.gain.gain.cancelScheduledValues(this.ctx.currentTime)
    entry.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1)
  }

  /** Check if a repeat ambient is active */
  isRepeatAmbientPlaying(id: string): boolean {
    return this.repeatAmbients.has(id)
  }

  /**
   * Stop a looping ambient sound with optional fade-out.
   */
  stopAmbient(id: string, fadeDuration = AMBIENT_FADE_MS): void {
    const entry = this.ambientSources.get(id)
    if (!entry || !this.ctx) return

    const { source, gain } = entry
    const fadeEnd = this.ctx.currentTime + fadeDuration / 1000

    // Cancel any scheduled ramps and fade to 0
    gain.gain.cancelScheduledValues(this.ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, fadeEnd)

    // Stop & cleanup after fade completes
    setTimeout(() => {
      try {
        source.stop()
      } catch {
        // Already stopped
      }
      source.disconnect()
      gain.disconnect()
    }, fadeDuration + 50)

    this.ambientSources.delete(id)
  }

  /** Smoothly update the volume of an active ambient loop */
  setAmbientVolume(id: string, volume: number): void {
    const entry = this.ambientSources.get(id)
    if (!entry || !this.ctx) return
    entry.gain.gain.cancelScheduledValues(this.ctx.currentTime)
    entry.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1)
  }

  /** Check if an ambient loop is currently active */
  isAmbientPlaying(id: string): boolean {
    return this.ambientSources.has(id)
  }

  // ── Public API ────────────────────────────────────────────

  /** Enable or disable all SFX playback */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      for (const id of Array.from(this.ambientSources.keys())) this.stopAmbient(id, 200)
      for (const id of Array.from(this.repeatAmbients.keys())) this.stopRepeatAmbient(id, 200)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** Release all resources */
  dispose(): void {
    this.disposed = true
    this.removeGestureListeners()
    document.removeEventListener('visibilitychange', this.onVisibility)

    // Stop all ambient loops
    for (const id of Array.from(this.ambientSources.keys())) {
      const entry = this.ambientSources.get(id)
      if (entry) {
        try {
          entry.source.stop()
        } catch {
          /* already stopped */
        }
        entry.source.disconnect()
        entry.gain.disconnect()
      }
    }
    this.ambientSources.clear()

    // Stop all repeat ambients
    for (const id of Array.from(this.repeatAmbients.keys())) {
      const entry = this.repeatAmbients.get(id)
      if (entry) {
        if (entry.timer) clearTimeout(entry.timer)
        try {
          entry.source.stop()
        } catch {
          /* */
        }
        entry.source.disconnect()
        entry.gain.disconnect()
      }
    }
    this.repeatAmbients.clear()

    // Close AudioContext
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }

    this.masterGain = null
    this.buffers.clear()
    this.lastPlayTime.clear()
  }
}
