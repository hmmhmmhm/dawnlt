import { useEffect, useRef } from 'react'
import type { GameEngine } from '../game/engine'
import { SFX_VOLUMES, SfxManager } from '../game/engine/sfx-manager'
import { SFX_PATHS } from '../game/engine/sfx-map'

/**
 * Hook to manage sound effects tied to the game engine.
 *
 * Creates a SfxManager instance, polls weather state for ambient SFX
 * (rain loop), and assigns the manager to the engine for use by
 * AnimationLoop and block-actions.
 *
 * Returns a ref to the SfxManager so callers can enable/disable SFX
 * via chat commands.
 */
export function useSfx(engineRef: React.RefObject<GameEngine | null>): React.RefObject<SfxManager | null> {
  const sfxRef = useRef<SfxManager | null>(null)

  useEffect(() => {
    const mgr = new SfxManager()
    sfxRef.current = mgr

    // Assign to engine so AnimationLoop can access it
    const engine = engineRef.current
    if (engine) {
      engine.sfxManager = mgr
    }

    // Poll weather every 2 seconds to toggle rain ambient loop
    let lastWeather: string | null = null

    const interval = setInterval(() => {
      const eng = engineRef.current
      if (!eng?.gameStarted) return

      // Sync sfxManager reference if engine was created after this effect
      if (!eng.sfxManager) {
        eng.sfxManager = mgr
      }

      const weather = eng.weather

      if (weather !== lastWeather) {
        // Weather changed
        if (lastWeather === 'rain') {
          mgr.stopAmbient('rain')
        }
        if (weather === 'rain') {
          mgr.startAmbient('rain', SFX_PATHS.ambient.rain, SFX_VOLUMES.ambient)
        }
        lastWeather = weather
      }
    }, 2000)

    return () => {
      clearInterval(interval)
      mgr.dispose()
      sfxRef.current = null
      // Clean up engine reference
      const eng = engineRef.current
      if (eng) {
        eng.sfxManager = null
      }
    }
    // engineRef is a stable ref object — no need to re-run this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineRef.current])

  return sfxRef
}
