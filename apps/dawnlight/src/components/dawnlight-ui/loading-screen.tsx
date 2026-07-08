interface LoadingScreenProps {
  progress: number
  message: string
}

export function LoadingScreen({ progress, message }: LoadingScreenProps) {
  return (
    <div className="absolute inset-0 bg-black flex items-start justify-start z-50 p-6">
      <div className="font-mono text-white text-sm leading-relaxed text-left">
        <div className="mb-1">&gt; DAWNLIGHT v1.0</div>
        <div className="mb-1">&gt; Initializing voxel engine...</div>
        <div className="mb-1">&gt; {message}</div>
        <div className="mb-1">
          &gt; [{(() => {
            const filled = Math.floor(progress / 5)
            const empty = 20 - filled
            return '█'.repeat(filled) + '░'.repeat(empty)
          })()}] {progress}%
        </div>
        <div className="flex items-center justify-start">
          <span>&gt;&nbsp;</span>
          <span className="animate-pulse">█</span>
        </div>
      </div>
    </div>
  )
}
