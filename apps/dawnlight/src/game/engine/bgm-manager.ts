/**
 * BgmManager - Background music manager with day/night cycle
 *
 * - Day songs play when sun is clearly up (timeNorm 0.30–0.70)
 * - Night songs play when sun is completely down (timeNorm ≥0.80 or <0.20)
 * - During transitions (sunrise/sunset), current music keeps playing
 * - Only one audio file loaded at a time (+ prefetch for next via fetch cache)
 * - iOS Safari compatible: audio unlocked via user-gesture play()
 * - Non-blocking: never affects game loading or startup
 */

const STATIC = 'https://static.dawn.lt'

const DAY_SONGS: readonly string[] = [
  `${STATIC}/song-of-the-day/first-date.mp3`,
  `${STATIC}/song-of-the-day/first-daybreak.mp3`,
  `${STATIC}/song-of-the-day/first-morning.mp3`,
  `${STATIC}/song-of-the-day/first-outing.mp3`,
  `${STATIC}/song-of-the-day/first-picnic.mp3`,
  `${STATIC}/song-of-the-day/first-take.mp3`,
  `${STATIC}/song-of-the-day/first-trip.mp3`,
  `${STATIC}/song-of-the-day/sunday-half-past-rain.mp3`,
]

const NIGHT_SONGS: readonly string[] = [
  `${STATIC}/song-of-the-night/a-window-left-open.mp3`,
  `${STATIC}/song-of-the-night/empty-room.mp3`,
  `${STATIC}/song-of-the-night/footsteps-in-snow.mp3`,
  `${STATIC}/song-of-the-night/letters-i-never-sent.mp3`,
  `${STATIC}/song-of-the-night/paper-moon.mp3`,
  `${STATIC}/song-of-the-night/paper-sun.mp3`,
  `${STATIC}/song-of-the-night/sea-at-night.mp3`,
  `${STATIC}/song-of-the-night/the-ocean-at-dawn.mp3`,
]

type TimeOfDay = 'day' | 'night'

const BGM_VOLUME = 0.2
const FADE_DURATION = 2000
const FADE_STEP = 50

/** Fisher-Yates shuffle */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class BgmManager {
  private audio: HTMLAudioElement
  private enabled = true
  private timeOfDay: TimeOfDay | null = null
  private playing = false
  private unlocked = false
  private disposed = false
  private fadeTimer: ReturnType<typeof setInterval> | null = null
  private fadeInTimer: ReturnType<typeof setInterval> | null = null
  private gestureListenersActive = true

  // Shuffled playlists & indices
  private dayList: string[]
  private nightList: string[]
  private dayIdx = 0
  private nightIdx = 0
  private pendingUrl: string | null = null

  constructor() {
    this.audio = new Audio()
    this.audio.preload = 'auto'
    this.dayList = shuffle(DAY_SONGS)
    this.nightList = shuffle(NIGHT_SONGS)

    // User-gesture listeners for iOS Safari audio unlock.
    // Uses CAPTURE phase so that stopPropagation() in child components
    // (e.g. virtual joystick) cannot prevent the unlock from firing.
    const opts: AddEventListenerOptions = { capture: true, passive: true }
    document.addEventListener('click', this.onGesture, opts)
    document.addEventListener('touchstart', this.onGesture, opts)
    document.addEventListener('touchend', this.onGesture, opts)
    document.addEventListener('keydown', this.onGesture, opts)

    // Resume playback when tab/app becomes visible again
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  // ── Event Handlers ──────────────────────────────────────────

  /**
   * On user gesture: mark unlocked and attempt playback.
   * iOS Safari requires the first audio.play() to originate from a user gesture.
   * Listeners stay active until play() succeeds (then removed in playSong).
   */
  private onGesture = (): void => {
    if (this.disposed) return
    this.unlocked = true
    if (this.enabled && this.timeOfDay && !this.playing) {
      this.playSong(this.timeOfDay)
    }
  }

  /** Resume audio when returning to tab (mobile browsers pause on tab switch) */
  private onVisibility = (): void => {
    if (!document.hidden && this.enabled && this.playing && this.audio.paused && !this.disposed) {
      this.audio.play().catch(() => {})
    }
  }

  private removeGestureListeners(): void {
    if (!this.gestureListenersActive) return
    this.gestureListenersActive = false
    // capture must match addEventListener's capture flag
    const opts: EventListenerOptions = { capture: true }
    document.removeEventListener('click', this.onGesture, opts)
    document.removeEventListener('touchstart', this.onGesture, opts)
    document.removeEventListener('touchend', this.onGesture, opts)
    document.removeEventListener('keydown', this.onGesture, opts)
  }

  // ── Playlist ────────────────────────────────────────────────

  /** Get the next song URL from the appropriate playlist, reshuffling when exhausted */
  private pickNextUrl(tod: TimeOfDay): string {
    if (tod === 'day') {
      if (this.dayIdx >= this.dayList.length) {
        this.dayList = shuffle(DAY_SONGS)
        this.dayIdx = 0
      }
      return this.dayList[this.dayIdx++]
    }
    if (this.nightIdx >= this.nightList.length) {
      this.nightList = shuffle(NIGHT_SONGS)
      this.nightIdx = 0
    }
    return this.nightList[this.nightIdx++]
  }

  /** Prefetch the next song into browser HTTP cache */
  private prefetchNext(tod: TimeOfDay): void {
    this.pendingUrl = this.pickNextUrl(tod)
    fetch(this.pendingUrl).catch(() => {})
  }

  // ── Playback ────────────────────────────────────────────────

  /**
   * Play a song from the given time-of-day playlist.
   * @param fadeIn - If true, the song volume ramps from 0 to BGM_VOLUME over FADE_DURATION.
   */
  private playSong(tod: TimeOfDay, fadeIn = false): void {
    if (this.disposed || !this.enabled || !this.unlocked) return

    this.clearFadeIn()

    const url = this.pendingUrl ?? this.pickNextUrl(tod)
    this.pendingUrl = null

    this.audio.src = url
    this.audio.volume = fadeIn ? 0 : BGM_VOLUME
    this.audio.loop = false

    this.audio.onended = () => {
      if (!this.disposed && this.enabled && this.timeOfDay) {
        this.playSong(this.timeOfDay)
      }
    }

    this.audio.onerror = () => {
      console.warn('[BGM] Load failed, skipping to next')
      if (!this.disposed && this.enabled && this.timeOfDay) {
        setTimeout(() => this.playSong(this.timeOfDay!), 1500)
      }
    }

    this.playing = true
    this.audio
      .play()
      .then(() => {
        console.log('[BGM] Now playing:', url.split('/').pop())
        this.removeGestureListeners()
        if (fadeIn) this.startFadeIn()
      })
      .catch(() => {
        this.playing = false
      })

    // Prefetch next song in the background
    this.prefetchNext(tod)
  }

  /** Gradually ramp volume from 0 → BGM_VOLUME */
  private startFadeIn(): void {
    const steps = Math.max(1, FADE_DURATION / FADE_STEP)
    const volStep = BGM_VOLUME / steps

    this.fadeInTimer = setInterval(() => {
      if (this.audio.volume + volStep < BGM_VOLUME) {
        this.audio.volume += volStep
      } else {
        this.audio.volume = BGM_VOLUME
        this.clearFadeIn()
      }
    }, FADE_STEP)
  }

  private clearFadeIn(): void {
    if (this.fadeInTimer !== null) {
      clearInterval(this.fadeInTimer)
      this.fadeInTimer = null
    }
  }

  /** Fade out the current song, then fade in one matching the new time-of-day */
  private fadeAndSwitch(tod: TimeOfDay): void {
    if (!this.playing) {
      this.playSong(tod, true)
      return
    }

    this.clearFade()
    this.clearFadeIn()

    // Prevent onended from firing during fade-out
    this.audio.onended = null

    // Prepare the next URL for the new time-of-day
    this.pendingUrl = this.pickNextUrl(tod)
    fetch(this.pendingUrl).catch(() => {})

    const steps = Math.max(1, FADE_DURATION / FADE_STEP)
    const volStep = this.audio.volume / steps

    console.log('[BGM] Fading to', tod, 'music')

    this.fadeTimer = setInterval(() => {
      if (this.audio.volume > volStep + 0.001) {
        this.audio.volume = Math.max(0, this.audio.volume - volStep)
      } else {
        this.audio.pause()
        this.audio.currentTime = 0
        this.clearFade()
        // Small delay ensures the audio element fully settles after pause
        setTimeout(() => this.playSong(tod, true), 50)
      }
    }, FADE_STEP)
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Update BGM based on normalized game time (0–1).
   * Call periodically (every 1–3 seconds is sufficient).
   *
   * Day songs:   timeNorm 0.30 – 0.70  (sun clearly up)
   * Night songs: timeNorm ≥ 0.80 or < 0.20  (sun completely down)
   * Transition:  0.20–0.30 (sunrise) / 0.70–0.80 (sunset) — keep current
   */
  update(timeNorm: number): void {
    if (this.disposed) return

    let tod: TimeOfDay | null = null
    if (timeNorm >= 0.3 && timeNorm < 0.7) tod = 'day'
    else if (timeNorm >= 0.8 || timeNorm < 0.2) tod = 'night'

    // During transition periods, keep current music playing
    if (tod === null) return

    // First determination of time-of-day
    if (this.timeOfDay === null) {
      this.timeOfDay = tod
      console.log('[BGM] Initial time-of-day:', tod, '| unlocked:', this.unlocked, '| playing:', this.playing)
      if (this.unlocked && this.enabled && !this.playing) {
        this.playSong(tod)
      }
      return
    }

    // Day/night changed → crossfade
    if (tod !== this.timeOfDay) {
      console.log('[BGM] Time-of-day changed:', this.timeOfDay, '→', tod, '| unlocked:', this.unlocked, '| playing:', this.playing)
      this.timeOfDay = tod
      if (this.unlocked && this.enabled) {
        this.fadeAndSwitch(tod)
      }
    } else if (this.unlocked && this.enabled && !this.playing && this.fadeTimer === null) {
      // Retry: play() may have been rejected previously (e.g. after fade-out).
      // Without this, the BGM stays silent forever once a play() fails.
      this.playSong(tod)
    }
  }

  /** Enable or disable BGM playback */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.clearFade()
      this.clearFadeIn()
      this.audio.pause()
      this.audio.onended = null
      this.playing = false
    } else if (this.unlocked && this.timeOfDay && !this.playing) {
      this.playSong(this.timeOfDay)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** Release all resources */
  dispose(): void {
    this.disposed = true
    this.clearFade()
    this.clearFadeIn()
    this.removeGestureListeners()
    document.removeEventListener('visibilitychange', this.onVisibility)

    this.audio.pause()
    this.audio.onended = null
    this.audio.onerror = null
    this.audio.removeAttribute('src')
    this.audio.load()
    this.playing = false
  }
}
