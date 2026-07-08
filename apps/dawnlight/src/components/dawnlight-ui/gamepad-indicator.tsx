interface GamepadIndicatorProps {
  visible: boolean
}

export function GamepadIndicator({ visible }: GamepadIndicatorProps) {
  if (!visible) return null

  return (
    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 z-40 animate-fade-in">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <span className="text-white text-xs font-medium">🎮 Gamepad Connected</span>
    </div>
  )
}
