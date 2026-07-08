declare module 'ios-haptics' {
  export type HapticFn = (() => void) & {
    confirm?: () => void
    error?: () => void
  }

  export const haptic: HapticFn
}
