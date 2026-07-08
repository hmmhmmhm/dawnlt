import { useEffect, useRef } from 'react'
import type { GameEngine } from '../game/engine'
import { BgmManager } from '../game/engine/bgm-manager'

/**
 * Hook to manage background music tied to the game's day/night cycle.
 *
 * Creates a BgmManager instance, polls the engine's game time every 2 seconds,
 * and disposes cleanly on unmount. Returns a ref to the BgmManager so callers
 * can enable/disable BGM via commands.
 */
export function useBgm(engineRef: React.RefObject<GameEngine | null>): React.RefObject<BgmManager | null> {
  const bgmRef = useRef<BgmManager | null>(null)

  useEffect(() => {
    const mgr = new BgmManager()
    bgmRef.current = mgr

    // Poll game time every 2 seconds and feed it to the BGM manager.
    // This is lightweight — only checks a number and possibly triggers
    // a day/night music switch.
    const interval = setInterval(() => {
      const engine = engineRef.current
      if (engine?.gameStarted) {
        mgr.update(engine.gameTime / 1440)
      }
    }, 2000)

    return () => {
      clearInterval(interval)
      mgr.dispose()
      bgmRef.current = null
    }
    // engineRef is a stable ref object — no need to re-run this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineRef.current])

  return bgmRef
}
