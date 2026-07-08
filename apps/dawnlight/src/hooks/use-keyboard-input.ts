import { useCallback, useEffect, useRef } from 'react'

export interface KeyboardInputState {
  keys: Record<string, boolean>
  keyboardKeysRef: React.MutableRefObject<Record<string, boolean>>
}

export interface UseKeyboardInputOptions {
  onSlotSelect?: (slot: number) => void
  onOpenChat?: (initialValue: string) => void
  onToggleFly?: () => void
  onToggleFlySprint?: (enabled: boolean) => void
  isChatOpen: boolean
  isCreativeMode: boolean
  isFlying: boolean
  lastSpacePressRef: React.MutableRefObject<number>
  lastWPressRef: React.MutableRefObject<number>
}

export function useKeyboardInput(options: UseKeyboardInputOptions) {
  const { onSlotSelect, onOpenChat, onToggleFly, onToggleFlySprint, isChatOpen, isCreativeMode, isFlying, lastSpacePressRef, lastWPressRef } = options

  const keysRef = useRef<Record<string, boolean>>({})
  const keyboardKeysRef = useRef<Record<string, boolean>>({})

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isChatOpen) {
        return
      }

      if (e.code === 'Enter') {
        onOpenChat?.('')
        // Clear keys to prevent stuck movement
        Object.keys(keysRef.current).forEach((k) => {
          keysRef.current[k] = false
        })
        Object.keys(keyboardKeysRef.current).forEach((k) => {
          keyboardKeysRef.current[k] = false
        })
        return
      }

      if (e.key === '/' && !isChatOpen) {
        onOpenChat?.('/')
        Object.keys(keysRef.current).forEach((k) => {
          keysRef.current[k] = false
        })
        Object.keys(keyboardKeysRef.current).forEach((k) => {
          keyboardKeysRef.current[k] = false
        })
        return
      }

      keysRef.current[e.code] = true
      keyboardKeysRef.current[e.code] = true

      // Double-tap Space to toggle flying in Creative mode (ignore key repeat)
      if (e.code === 'Space' && isCreativeMode && !e.repeat) {
        const now = Date.now()
        if (now - lastSpacePressRef.current < 300) {
          onToggleFly?.()
        }
        lastSpacePressRef.current = now
      }

      // Double-tap W to sprint while flying (ignore key repeat)
      if (e.code === 'KeyW' && isCreativeMode && isFlying && !e.repeat) {
        const now = Date.now()
        if (now - lastWPressRef.current < 300) {
          onToggleFlySprint?.(true)
        }
        lastWPressRef.current = now
      }

      if (e.code.startsWith('Digit')) {
        const slot = parseInt(e.code.replace('Digit', ''), 10) - 1
        if (slot >= 0 && slot <= 8) {
          onSlotSelect?.(slot)
        }
      }
    },
    [isChatOpen, isCreativeMode, isFlying, onSlotSelect, onOpenChat, onToggleFly, onToggleFlySprint, lastSpacePressRef, lastWPressRef],
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
      keyboardKeysRef.current[e.code] = false

      // Stop fly sprinting when W is released
      if (e.code === 'KeyW') {
        onToggleFlySprint?.(false)
      }
    },
    [onToggleFlySprint],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return {
    keys: keysRef.current,
    keyboardKeysRef,
  }
}
