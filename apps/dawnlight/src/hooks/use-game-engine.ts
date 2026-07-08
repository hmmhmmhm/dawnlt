/**
 * useGameEngine - Hook that connects React with GameEngine
 *
 * Manages GameEngine instance lifecycle and
 * synchronizes React state with GameEngine.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JoystickInput } from '../components/virtual-joystick'
import type { EffectSettings } from '../constants/effects'
import { type DebugStats, GameEngine, type GameEngineCallbacks, type MinimapData } from '../game/engine/game-engine'
import { type InputCallbacks, InputSystem } from '../game/engine/input-system'
import type { GameMode, Inventory, Player } from '../types'
import type { Weather } from '../types/game-state'
import type { Season } from '../utils/textures'

export interface UseGameEngineOptions {
  onPlaceBlock?: () => void
}

export interface UseGameEngineReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>
  engineRef: React.RefObject<GameEngine | null>
  inputSystemRef: React.RefObject<InputSystem | null>

  // Loading state
  isLoading: boolean
  isReady: boolean
  loadingProgress: number
  loadingMessage: string

  // Game state (read-only snapshots for React)
  selectedSlot: number
  showJoystick: boolean
  showFps: boolean
  fps: number
  debugStats: DebugStats
  minimapData: MinimapData

  // Setters (for UI interaction)
  setSelectedSlot: (slot: number) => void
  setShowJoystick: (show: boolean) => void
  setShowFps: (show: boolean) => void

  // Input handlers
  handleJoystickInput: (input: JoystickInput) => void
  setChatOpen: (open: boolean) => void

  // Game state accessors (for chat commands and UI)
  getPlayer: () => Player | null
  getInventory: () => Inventory | null
  getGameTime: () => number
  setGameTime: (time: number) => void
  getWeather: () => Weather
  setWeather: (weather: Weather, duration?: number) => void
  getSeason: () => Season
  setSeason: (season: Season) => void
  getGameMode: () => GameMode
  setGameMode: (mode: GameMode) => void
  getEffects: () => EffectSettings | null
  setEffect: (name: keyof EffectSettings, value: boolean) => void
}

const DEFAULT_DEBUG_STATS: DebugStats = {
  loadedChunks: 0,
  activeChunks: 0,
  culledChunks: 0,
  cachedChunks: 0,
  cachedMeshes: 0,
  queueLength: 0,
  meshQueueSize: 0,
  lodEnabled: false,
  lodActiveSections: 0,
  lodQueueSize: 0,
  lodProcessingCount: 0,
  lodDroppedTasks: 0,
  lodUpdateMs: 0,
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

const DEFAULT_MINIMAP_DATA: MinimapData = {
  playerX: 0,
  playerZ: 0,
  playerRotation: 0,
  worldGen: null,
}

/**
 * Hook that connects React with GameEngine
 */
export function useGameEngine(options: UseGameEngineOptions = {}): UseGameEngineReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const inputSystemRef = useRef<InputSystem | null>(null)

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')

  // UI state
  const [selectedSlot, setSelectedSlotState] = useState(0)
  const [showJoystick, setShowJoystickState] = useState(false)
  const [showFps, setShowFps] = useState(false)
  const [fps, setFps] = useState(0)
  const [debugStats, setDebugStats] = useState<DebugStats>(DEFAULT_DEBUG_STATS)
  const [minimapData, setMinimapData] = useState<MinimapData>(DEFAULT_MINIMAP_DATA)

  // Chat open state ref (for input system)
  const isChatOpenRef = useRef(false)

  // Callbacks for engine events
  const engineCallbacks: GameEngineCallbacks = useMemo(
    () => ({
      onLoadingProgress: (progress, message) => {
        setLoadingProgress(progress)
        setLoadingMessage(message)
      },
      onLoadingComplete: () => {
        setIsLoading(false)
        setIsReady(true)
      },
      onFpsUpdate: (newFps) => {
        setFps(newFps)
      },
      onDebugStatsUpdate: (stats) => {
        setDebugStats(stats)
      },
      onMinimapUpdate: (data) => {
        setMinimapData(data)
      },
    }),
    [],
  )

  // Callbacks for input events
  const inputCallbacks: InputCallbacks = useMemo(
    () => ({
      onSelectedSlotChange: (slot) => {
        setSelectedSlotState(slot)
      },
      onChatOpen: (_initialValue) => {
        // This will be handled by the component
      },
      onPlaceBlock: options.onPlaceBlock,
      onGamepadConnected: () => {
        setShowJoystickState(false)
      },
      onGamepadDisconnected: () => {
        // Mobile detection will be handled by InputSystem
      },
    }),
    [options.onPlaceBlock],
  )

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current) return

    console.log('[useGameEngine] Initializing...')

    // Create engine
    const engine = new GameEngine(containerRef.current, engineCallbacks)
    engineRef.current = engine

    // Create input system
    const inputSystem = new InputSystem(engine, inputCallbacks)
    inputSystemRef.current = inputSystem
    inputSystem.registerEventListeners()

    // Update joystick state from input system
    setShowJoystickState(inputSystem.getShowJoystick())

    // Load initial chunks and start game
    engine.loadInitialChunks().then(() => {
      engine.start()
      setMinimapData({
        playerX: engine.player.position.x,
        playerZ: engine.player.position.z,
        playerRotation: engine.player.rotation.y,
        worldGen: engine.worldGen,
      })
    })

    // Cleanup
    return () => {
      console.log('[useGameEngine] Disposing...')
      inputSystem.dispose()
      engine.dispose()
      engineRef.current = null
      inputSystemRef.current = null
    }
  }, [inputCallbacks, engineCallbacks])

  // Sync joystick state with input system
  useEffect(() => {
    if (inputSystemRef.current) {
      inputSystemRef.current.setShowJoystick(showJoystick)
    }
  }, [showJoystick])

  // ==================== Public API ====================

  const setSelectedSlot = useCallback((slot: number) => {
    if (engineRef.current) {
      engineRef.current.player.selectedSlot = slot
    }
    setSelectedSlotState(slot)
  }, [])

  const setShowJoystick = useCallback((show: boolean) => {
    setShowJoystickState(show)
  }, [])

  const handleJoystickInput = useCallback((input: JoystickInput) => {
    if (inputSystemRef.current) {
      inputSystemRef.current.updateJoystickInput(input)
    }
  }, [])

  const setChatOpen = useCallback((open: boolean) => {
    isChatOpenRef.current = open
    if (inputSystemRef.current) {
      inputSystemRef.current.setChatOpen(open)
    }
  }, [])

  // Game state accessors
  const getPlayer = useCallback(() => {
    return engineRef.current?.player ?? null
  }, [])

  const getInventory = useCallback(() => {
    return engineRef.current?.inventory ?? null
  }, [])

  const getGameTime = useCallback(() => {
    return engineRef.current?.gameTime ?? 480
  }, [])

  const setGameTime = useCallback((time: number) => {
    if (engineRef.current) {
      engineRef.current.gameTime = time
    }
  }, [])

  const getWeather = useCallback((): Weather => {
    return engineRef.current?.weather ?? 'clear'
  }, [])

  const setWeather = useCallback((weather: Weather, duration?: number) => {
    if (engineRef.current) {
      engineRef.current.weather = weather
      if (duration !== undefined) {
        engineRef.current.weatherTime = duration
      }
    }
  }, [])

  const getSeason = useCallback((): Season => {
    return engineRef.current?.season ?? 'spring'
  }, [])

  const setSeason = useCallback((season: Season) => {
    if (engineRef.current) {
      engineRef.current.season = season
    }
  }, [])

  const getGameMode = useCallback((): GameMode => {
    return engineRef.current?.gameMode ?? 'survival'
  }, [])

  const setGameMode = useCallback((mode: GameMode) => {
    if (engineRef.current) {
      engineRef.current.gameMode = mode
      if (mode === 'survival') {
        engineRef.current.player.isFlying = false
      }
    }
  }, [])

  const getEffects = useCallback(() => {
    return engineRef.current?.effects ?? null
  }, [])

  const setEffect = useCallback((name: keyof EffectSettings, value: boolean) => {
    if (engineRef.current) {
      engineRef.current.effects[name] = value
    }
  }, [])

  return {
    // Refs
    containerRef,
    engineRef,
    inputSystemRef,

    // Loading state
    isLoading,
    isReady,
    loadingProgress,
    loadingMessage,

    // Game state
    selectedSlot,
    showJoystick,
    showFps,
    fps,
    debugStats,
    minimapData,

    // Setters
    setSelectedSlot,
    setShowJoystick,
    setShowFps,

    // Input handlers
    handleJoystickInput,
    setChatOpen,

    // Game state accessors
    getPlayer,
    getInventory,
    getGameTime,
    setGameTime,
    getWeather,
    setWeather,
    getSeason,
    setSeason,
    getGameMode,
    setGameMode,
    getEffects,
    setEffect,
  }
}

export default useGameEngine
