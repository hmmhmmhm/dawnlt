import { useCallback, useEffect, useRef, useState } from 'react'
import type { LineSegments, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import type { JoystickInput } from '../components/virtual-joystick'
import type { EffectSettings } from '../constants/effects'
import type { WorldGenerator } from '../engine/world'
import type { ChatMessage, ChunkMeshData, GameMode, Inventory, Player } from '../types'
import type { Season } from '../utils/textures'

// Debug stats interface
export interface DebugStats {
  loadedChunks: number
  activeChunks: number
  culledChunks: number
  cachedChunks: number
  cachedMeshes: number
  queueLength: number
  meshQueueSize: number
  visibleMeshes: number
  totalFaces: number
  isLoading: boolean
  playerChunkX: number
  playerChunkZ: number
  frameTime: number
  drawCalls: number
  triangles: number
  workerCount: number
  busyWorkers: number
  pendingTasks: number
  chunkMemory: number
  meshMemory: number
  totalMemory: number
}

// Minimap data interface
export interface MinimapData {
  playerX: number
  playerZ: number
  playerRotation: number
  worldGen: WorldGenerator | null
}

// Chunk load task interface
export interface ChunkLoadTask {
  cx: number
  cy: number
  cz: number
  dist: number
  priority: 'data' | 'mesh' | 'edge' | 'cache' | 'mesh-cache'
}

// Game state interface for gameStateRef
export interface GameState {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  player: Player
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes: Map<string, ChunkMeshData>
  inventory: Inventory
  worldGen: WorldGenerator
  clock: Timer
  keys: Record<string, boolean>
  isPointerLocked: boolean
  lastSpacePress: number
  highlightMesh: LineSegments | null
  breakProgress: number
  isBreaking: boolean
  targetBlock: string | null
  mouseHeld: boolean
  frameCount: number
  lastFpsUpdate: number
  gameStarted: boolean
  gameTime: number
  weather: 'clear' | 'rain' | 'snow'
  weatherTime: number
  season: Season
  gameMode: GameMode
  lastWPress: number
  isFlySprinting: boolean
  effects: EffectSettings
  lastChunkX: number
  lastChunkZ: number
  chunkUpdateTimer: number
  chunkLoadQueue: ChunkLoadTask[]
  footstepTimer: number
  footstepInterval: number
  footstepSprintInterval: number
}

// Default debug stats
const DEFAULT_DEBUG_STATS: DebugStats = {
  loadedChunks: 0,
  activeChunks: 0,
  culledChunks: 0,
  cachedChunks: 0,
  cachedMeshes: 0,
  queueLength: 0,
  meshQueueSize: 0,
  visibleMeshes: 0,
  totalFaces: 0,
  isLoading: false,
  playerChunkX: 0,
  playerChunkZ: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  workerCount: 0,
  busyWorkers: 0,
  pendingTasks: 0,
  chunkMemory: 0,
  meshMemory: 0,
  totalMemory: 0,
}

// Default joystick input
const DEFAULT_JOYSTICK_INPUT: JoystickInput = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
  sprint: false,
  attack: false,
  placeBlock: false,
}

export interface UseDawnlightStateReturn {
  // Container ref
  containerRef: React.RefObject<HTMLDivElement | null>

  // UI State
  selectedSlot: number
  setSelectedSlot: React.Dispatch<React.SetStateAction<number>>
  isReady: boolean
  setIsReady: React.Dispatch<React.SetStateAction<boolean>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  loadingProgress: number
  setLoadingProgress: React.Dispatch<React.SetStateAction<number>>
  loadingMessage: string
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>

  // Chat state
  isChatOpen: boolean
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>
  chatInitialValue: string
  setChatInitialValue: React.Dispatch<React.SetStateAction<string>>
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isChatOpenRef: React.MutableRefObject<boolean>

  // Debug state
  showFps: boolean
  setShowFps: React.Dispatch<React.SetStateAction<boolean>>
  fps: number
  setFps: React.Dispatch<React.SetStateAction<number>>
  debugStats: DebugStats
  setDebugStats: React.Dispatch<React.SetStateAction<DebugStats>>

  // Minimap state
  showMinimap: boolean
  setShowMinimap: React.Dispatch<React.SetStateAction<boolean>>
  minimapData: MinimapData
  setMinimapData: React.Dispatch<React.SetStateAction<MinimapData>>

  // Joystick state
  showJoystick: boolean
  setShowJoystick: React.Dispatch<React.SetStateAction<boolean>>
  showJoystickRef: React.MutableRefObject<boolean>
  joystickInputRef: React.MutableRefObject<JoystickInput>

  // Gamepad state
  setIsGamepadConnected: React.Dispatch<React.SetStateAction<boolean>>
  showGamepadIndicator: boolean
  setShowGamepadIndicator: React.Dispatch<React.SetStateAction<boolean>>
  gamepadIndicatorTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  gamepadAttackHeldRef: React.MutableRefObject<boolean>
  gamepadJumpHeldRef: React.MutableRefObject<boolean>
  keyboardKeysRef: React.MutableRefObject<Record<string, boolean>>

  // Virtual joystick tracking refs
  joystickAttackHeldRef: React.MutableRefObject<boolean>
  joystickPlaceHeldRef: React.MutableRefObject<boolean>
  joystickJumpHeldRef: React.MutableRefObject<boolean>

  // Block touch state refs
  blockTouchStartTimeRef: React.MutableRefObject<number>
  blockTouchPosRef: React.MutableRefObject<{ x: number; y: number } | null>
  blockTouchBreakingRef: React.MutableRefObject<boolean>
  blockTouchTargetRef: React.MutableRefObject<string | null>
  blockTouchProgressRef: React.MutableRefObject<number>
  BLOCK_TOUCH_LONG_PRESS_THRESHOLD: number

  // Game state ref
  gameStateRef: React.MutableRefObject<GameState | null>

  // Toggle state refs (for command context)
  showFpsRef: React.MutableRefObject<boolean>
  showJoystickStateRef: React.MutableRefObject<boolean>
  showMinimapRef: React.MutableRefObject<boolean>

  // Utility functions
  showGamepadNotification: () => void
}

export function useDawnlightState(): UseDawnlightStateReturn {
  // Container ref
  const containerRef = useRef<HTMLDivElement>(null)

  // UI State
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Generating world...')

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInitialValue, setChatInitialValue] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const isChatOpenRef = useRef(false)

  // Debug state
  const [showFps, setShowFps] = useState(false)
  const [fps, setFps] = useState(0)
  const [debugStats, setDebugStats] = useState<DebugStats>(DEFAULT_DEBUG_STATS)

  // Minimap state
  const [showMinimap, setShowMinimap] = useState(true)
  const [minimapData, setMinimapData] = useState<MinimapData>({
    playerX: 0,
    playerZ: 0,
    playerRotation: 0,
    worldGen: null,
  })

  // Joystick state
  const [showJoystick, setShowJoystick] = useState(false)
  const showJoystickRef = useRef(false)
  const joystickInputRef = useRef<JoystickInput>(DEFAULT_JOYSTICK_INPUT)

  // Gamepad state
  const [, setIsGamepadConnected] = useState(false)
  const [showGamepadIndicator, setShowGamepadIndicator] = useState(false)
  const gamepadIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gamepadAttackHeldRef = useRef(false)
  const gamepadJumpHeldRef = useRef(false)
  const keyboardKeysRef = useRef<Record<string, boolean>>({})

  // Virtual joystick tracking refs
  const joystickAttackHeldRef = useRef(false)
  const joystickPlaceHeldRef = useRef(false)
  const joystickJumpHeldRef = useRef(false)

  // Block touch state refs
  const blockTouchStartTimeRef = useRef<number>(0)
  const blockTouchPosRef = useRef<{ x: number; y: number } | null>(null)
  const blockTouchBreakingRef = useRef(false)
  const blockTouchTargetRef = useRef<string | null>(null)
  const blockTouchProgressRef = useRef(0)
  const BLOCK_TOUCH_LONG_PRESS_THRESHOLD = 200

  // Game state ref
  const gameStateRef = useRef<GameState | null>(null)

  // Toggle state refs (for command context)
  const showFpsRef = useRef(showFps)
  const showJoystickStateRef = useRef(showJoystick)
  const showMinimapRef = useRef(showMinimap)

  // Keep refs in sync with state
  useEffect(() => {
    isChatOpenRef.current = isChatOpen
  }, [isChatOpen])
  useEffect(() => {
    showJoystickRef.current = showJoystick
  }, [showJoystick])
  useEffect(() => {
    showFpsRef.current = showFps
  }, [showFps])
  useEffect(() => {
    showJoystickStateRef.current = showJoystick
  }, [showJoystick])
  useEffect(() => {
    showMinimapRef.current = showMinimap
  }, [showMinimap])

  // Gamepad notification function (auto-hide after 3 seconds)
  const showGamepadNotification = useCallback(() => {
    if (gamepadIndicatorTimeoutRef.current) {
      clearTimeout(gamepadIndicatorTimeoutRef.current)
    }
    setShowGamepadIndicator(true)
    gamepadIndicatorTimeoutRef.current = setTimeout(() => {
      setShowGamepadIndicator(false)
    }, 3000)
  }, [])

  return {
    // Container ref
    containerRef,

    // UI State
    selectedSlot,
    setSelectedSlot,
    isReady,
    setIsReady,
    isLoading,
    setIsLoading,
    loadingProgress,
    setLoadingProgress,
    loadingMessage,
    setLoadingMessage,

    // Chat state
    isChatOpen,
    setIsChatOpen,
    chatInitialValue,
    setChatInitialValue,
    chatMessages,
    setChatMessages,
    isChatOpenRef,

    // Debug state
    showFps,
    setShowFps,
    fps,
    setFps,
    debugStats,
    setDebugStats,

    // Minimap state
    showMinimap,
    setShowMinimap,
    minimapData,
    setMinimapData,

    // Joystick state
    showJoystick,
    setShowJoystick,
    showJoystickRef,
    joystickInputRef,

    // Gamepad state
    setIsGamepadConnected,
    showGamepadIndicator,
    setShowGamepadIndicator,
    gamepadIndicatorTimeoutRef,
    gamepadAttackHeldRef,
    gamepadJumpHeldRef,
    keyboardKeysRef,

    // Virtual joystick tracking refs
    joystickAttackHeldRef,
    joystickPlaceHeldRef,
    joystickJumpHeldRef,

    // Block touch state refs
    blockTouchStartTimeRef,
    blockTouchPosRef,
    blockTouchBreakingRef,
    blockTouchTargetRef,
    blockTouchProgressRef,
    BLOCK_TOUCH_LONG_PRESS_THRESHOLD,

    // Game state ref
    gameStateRef,

    // Toggle state refs
    showFpsRef,
    showJoystickStateRef,
    showMinimapRef,

    // Utility functions
    showGamepadNotification,
  }
}
