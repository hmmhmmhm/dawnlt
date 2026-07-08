/**
 * Prevents default mobile browser touch behaviors that interfere with game controls:
 * - Pinch-to-zoom (multi-touch zoom)
 * - Pull-to-refresh (overscroll)
 * - Double-tap zoom
 * - Safari bounce scrolling
 *
 * Should be called once at app initialization.
 */
export function preventDefaultTouchBehaviors(): void {
  // Prevent multi-touch zoom (pinch-to-zoom) on the entire document
  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false },
  )

  // Prevent double-tap zoom and long-press context menu on touch
  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    },
    { passive: false },
  )

  // Prevent gesturestart/gesturechange (Safari-specific pinch-to-zoom)
  document.addEventListener('gesturestart', (e: Event) => {
    e.preventDefault()
  })

  document.addEventListener('gesturechange', (e: Event) => {
    e.preventDefault()
  })

  document.addEventListener('gestureend', (e: Event) => {
    e.preventDefault()
  })
}
