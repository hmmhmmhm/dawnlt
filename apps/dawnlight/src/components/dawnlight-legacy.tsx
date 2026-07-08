import { useCallback, useEffect, useRef, useState } from 'react'
import { EFFECT_NAMES } from '../constants/effects'
import { type BlockActionDeps, placeBlock as placeBlockAction } from '../game/block-actions'
import { AnimationLoop, ChunkSystem, type DebugStats, GameEngine, InputSystem, type MinimapData, SceneSystem } from '../game/engine'
import { getLodInternalFaceMinDrop, isLodBoundaryFacesEnabled, isLodInternalFacesEnabled, setLodBoundaryFacesEnabled, setLodInternalFaceMinDrop, setLodInternalFacesEnabled } from '../game/engine/lod/far-renderer-debug'
import { createLodBaselineSnapshotForEngine, moveEngineToLodBaseline } from '../game/engine/lod/lod-baseline'
import { handleBlockSfx } from '../game/engine/sfx-triggers'
import { useBgm } from '../hooks/use-bgm'
import { useChatCommands } from '../hooks/use-chat-commands'
import { useSfx } from '../hooks/use-sfx'
import type { ChatMessage } from '../types'
import { Chat } from './chat'
import { Crosshair } from './crosshair'
import { DebugOverlay, GamepadIndicator, LoadingScreen } from './dawnlight-ui'
import { Hud } from './hud'
import { Minimap } from './minimap'
import { type BlockTouchEvent, type JoystickInput, VirtualJoystick } from './virtual-joystick'

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

export function Dawnlight() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const inputSystemRef = useRef<InputSystem | null>(null)
  const sceneSystemRef = useRef<SceneSystem | null>(null)
  const chunkSystemRef = useRef<ChunkSystem | null>(null)
  const animationLoopRef = useRef<AnimationLoop | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInitialValue, setChatInitialValue] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showFps, setShowFps] = useState(false)
  const [fps, setFps] = useState(0)
  const [debugStats, setDebugStats] = useState<DebugStats>(DEFAULT_DEBUG_STATS)
  const [showMinimap, setShowMinimap] = useState(true)
  const [minimapData, setMinimapData] = useState<MinimapData>({
    playerX: 0,
    playerZ: 0,
    playerRotation: 0,
    worldGen: null,
  })
  const [showJoystick, setShowJoystick] = useState(false)
  const showJoystickRef = useRef(false)
  const [showGamepadIndicator, setShowGamepadIndicator] = useState(false)
  const gamepadIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blockTouchStartTimeRef = useRef<number>(0)
  const blockTouchPosRef = useRef<{ x: number; y: number } | null>(null)
  const BLOCK_TOUCH_LONG_PRESS_THRESHOLD = 200
  const isChatOpenRef = useRef(false)
  const showFpsRef = useRef(showFps)
  const showJoystickStateRef = useRef(showJoystick)
  const showMinimapRef = useRef(showMinimap)
  useEffect(() => {
    isChatOpenRef.current = isChatOpen
  }, [isChatOpen])
  useEffect(() => {
    showJoystickRef.current = showJoystick
    showJoystickStateRef.current = showJoystick
  }, [showJoystick])
  useEffect(() => {
    showFpsRef.current = showFps
  }, [showFps])
  useEffect(() => {
    showMinimapRef.current = showMinimap
  }, [showMinimap])
  const { processCommand } = useChatCommands()
  const bgmManagerRef = useBgm(engineRef)
  const sfxManagerRef = useSfx(engineRef)
  const showGamepadNotificationRef = useRef(() => {
    if (gamepadIndicatorTimeoutRef.current) {
      clearTimeout(gamepadIndicatorTimeoutRef.current)
    }
    setShowGamepadIndicator(true)
    gamepadIndicatorTimeoutRef.current = setTimeout(() => {
      setShowGamepadIndicator(false)
    }, 3000)
  })

  const placeBlockRef = useRef(() => {
    const engine = engineRef.current
    if (!engine) return

    const deps: BlockActionDeps = {
      camera: engine.camera,
      player: engine.player,
      inventory: engine.inventory,
      chunks: engine.chunks,
      chunks3D: engine.chunks3D,
      chunkMeshes3D: engine.chunkMeshes3D,
      chunkConnectivity: engine.chunkConnectivity,
      chunkVersions: engine.chunkVersions,
      rebuildingChunks: engine.rebuildingChunks,
      scene: engine.scene,
      renderer: engine.renderer,
      meshWorkerManager: engine.meshWorkerManager,
      getGameMode: () => engine.gameMode,
      getCameraMode: () => engine.cameraMode,
      getThirdPersonYaw: () => engine.playerAvatar.getFacingYaw(),
      onSfx: (type, blockType) => {
        const engine = engineRef.current
        if (engine) handleBlockSfx(engine, type, blockType)
      },
    }

    placeBlockAction(deps)
  })

  const handleSendMessage = useCallback(
    (content: string) => {
      const engine = engineRef.current
      if (!engine) return

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'User',
        content,
        type: 'user',
        timestamp: Date.now(),
      }

      const prevGameTime = engine.gameTime

      setChatMessages((prev) => {
        const newMessages = [...prev, newMessage]

        if (content.startsWith('/')) {
          const systemMessages = processCommand(content, {
            gameTime: engine.gameTime,
            setGameTime: (time) => {
              engine.gameTime = time
            },
            season: engine.season,
            setSeason: (s) => {
              engine.season = s
            },
            weather: engine.weather,
            setWeather: (w, duration) => {
              engine.weather = w
              if (duration) engine.weatherTime = duration
            },
            gameMode: engine.gameMode,
            setGameMode: (mode) => {
              engine.gameMode = mode
              if (mode === 'survival') engine.player.isFlying = false
            },
            setIsFlying: (flying) => {
              engine.player.isFlying = flying
            },
            effects: engine.effects,
            setEffect: (name, value) => {
              engine.effects[name] = value
            },
            setAllEffects: (value) => {
              EFFECT_NAMES.forEach((name) => {
                engine.effects[name] = value
              })
            },
            toggleFps: () => {
              setShowFps((prev) => !prev)
              return !showFpsRef.current
            },
            toggleJoystick: () => {
              setShowJoystick((prev) => !prev)
              return !showJoystickStateRef.current
            },
            toggleMinimap: () => {
              setShowMinimap((prev) => !prev)
              return !showMinimapRef.current
            },
            renderDistance: engine.renderDistance,
            setRenderDistance: (distance) => {
              engine.setRenderDistance(distance)
            },
            lodSettings: engine.lodRuntime.getSettings(),
            setLodSettings: (settings) => engine.lodRuntime.configure(settings),
            lodDebugColorEnabled: engine.lodRuntime.isDebugColorEnabled(),
            setLodDebugColorEnabled: (enabled) => engine.lodRuntime.setDebugColorEnabled(enabled),
            lodInternalFacesEnabled: isLodInternalFacesEnabled(),
            setLodInternalFacesEnabled: (enabled) => {
              setLodInternalFacesEnabled(enabled)
              engine.lodRuntime.rebuildDebugPipeline()
              return enabled
            },
            lodBoundaryFacesEnabled: isLodBoundaryFacesEnabled(),
            setLodBoundaryFacesEnabled: (enabled) => {
              setLodBoundaryFacesEnabled(enabled)
              engine.lodRuntime.rebuildDebugPipeline()
              return enabled
            },
            lodInternalFaceMinDrop: getLodInternalFaceMinDrop(),
            setLodInternalFaceMinDrop: (value) => {
              const applied = setLodInternalFaceMinDrop(value)
              engine.lodRuntime.rebuildDebugPipeline()
              return applied
            },
            logLodSnapshot: () => engine.lodRuntime.logDebugSnapshot(),
            moveToLodBaseline: (target) => {
              moveEngineToLodBaseline(engine, target)
            },
            getLodBaselineSnapshot: (targetLabel) => {
              const baselineFps = fps || (debugStats.frameTime > 0 ? 1000 / debugStats.frameTime : 0)
              return createLodBaselineSnapshotForEngine(engine, targetLabel, baselineFps)
            },
            bgmEnabled: bgmManagerRef.current?.isEnabled() ?? true,
            setBgmEnabled: (enabled) => bgmManagerRef.current?.setEnabled(enabled),
            sfxEnabled: sfxManagerRef.current?.isEnabled() ?? true,
            setSfxEnabled: (enabled) => sfxManagerRef.current?.setEnabled(enabled),
          })
          newMessages.push(...systemMessages)
        }

        return newMessages
      })

      if (engine.gameTime !== prevGameTime) {
        bgmManagerRef.current?.update(engine.gameTime / 1440)
      }
    },
    [processCommand, fps, debugStats, bgmManagerRef.current?.setEnabled, sfxManagerRef.current?.setEnabled, sfxManagerRef.current?.isEnabled, bgmManagerRef.current?.update, bgmManagerRef.current?.isEnabled],
  )
  const handleJoystickInput = useCallback((input: JoystickInput) => {
    if (inputSystemRef.current) {
      inputSystemRef.current.updateJoystickInput(input)
    }
  }, [])
  const handleBlockTouch = useCallback((event: BlockTouchEvent) => {
    const engine = engineRef.current
    if (!engine) return

    if (event.type === 'start') {
      blockTouchStartTimeRef.current = Date.now()
      blockTouchPosRef.current = { x: event.screenX, y: event.screenY }
    } else if (event.type === 'end' || event.type === 'cancel') {
      const touchDuration = Date.now() - blockTouchStartTimeRef.current
      const touchPos = blockTouchPosRef.current

      if (touchPos && touchDuration < BLOCK_TOUCH_LONG_PRESS_THRESHOLD && event.type === 'end') {
        placeBlockRef.current()
      }

      blockTouchPosRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    console.log('[Dawnlight] Initializing GameEngine...')

    const engine = new GameEngine(containerRef.current, {
      onLoadingProgress: (progress, message) => {
        setLoadingProgress(progress)
        setLoadingMessage(message)
      },
      onLoadingComplete: () => {
        setIsLoading(false)
        setIsReady(true)
      },
      onFpsUpdate: setFps,
      onDebugStatsUpdate: setDebugStats,
      onMinimapUpdate: setMinimapData,
    })
    engineRef.current = engine

    const inputSystem = new InputSystem(engine, {
      onSelectedSlotChange: setSelectedSlot,
      onChatOpen: (initialValue) => {
        setChatInitialValue(initialValue)
        setIsChatOpen(true)
      },
      onPlaceBlock: () => placeBlockRef.current(),
      onGamepadConnected: () => {
        showGamepadNotificationRef.current()
        setShowJoystick(false)
      },
      onGamepadDisconnected: () => {
        setShowGamepadIndicator(false)
        const userAgent = navigator.userAgent || ''
        const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(userAgent)
        if (isMobile) setShowJoystick(true)
      },
    })
    inputSystemRef.current = inputSystem
    inputSystem.registerEventListeners()

    const sceneSystem = new SceneSystem(engine)
    sceneSystemRef.current = sceneSystem

    const chunkSystem = new ChunkSystem(engine, {
      onLoadingProgress: (progress, message) => {
        setLoadingProgress(progress)
        setLoadingMessage(message)
      },
      onLoadingComplete: () => {
        setIsLoading(false)
        setIsReady(true)
        setMinimapData({
          playerX: engine.player.position.x,
          playerZ: engine.player.position.z,
          playerRotation: engine.player.rotation.y,
          worldGen: engine.worldGen,
        })
      },
    })
    chunkSystemRef.current = chunkSystem

    const animationLoop = new AnimationLoop(engine, inputSystem, sceneSystem, chunkSystem, {
      onFpsUpdate: setFps,
      onDebugStatsUpdate: setDebugStats,
      onMinimapUpdate: setMinimapData,
    })
    animationLoopRef.current = animationLoop

    animationLoop.start()
    console.log('[Dawnlight] Starting chunk loading...')
    chunkSystem
      .loadInitialChunks()
      .then(() => {
        console.log('[Dawnlight] Chunk loading complete')
      })
      .catch((err) => {
        console.error('[Dawnlight] Failed to load initial chunks:', err)
        setLoadingMessage('Error loading world')
      })

    const userAgent = navigator.userAgent || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    if (isMobile) setShowJoystick(true)

    return () => {
      console.log('[Dawnlight] Disposing...')
      animationLoop.stop()
      inputSystem.dispose()
      engine.dispose()

      if (gamepadIndicatorTimeoutRef.current) {
        clearTimeout(gamepadIndicatorTimeoutRef.current)
      }

      engineRef.current = null
      inputSystemRef.current = null
      sceneSystemRef.current = null
      chunkSystemRef.current = null
      animationLoopRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (inputSystemRef.current) {
      inputSystemRef.current.setChatOpen(isChatOpen)
    }
  }, [isChatOpen])

  useEffect(() => {
    if (inputSystemRef.current) {
      inputSystemRef.current.setShowJoystick(showJoystick)
    }
  }, [showJoystick])

  const inventory = engineRef.current?.inventory
  const isThirdPerson = engineRef.current?.cameraMode === 'third-person'

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 select-none" style={{ touchAction: 'none' }}>
      <div ref={containerRef} className="w-full h-full" />

      {isLoading && <LoadingScreen progress={loadingProgress} message={loadingMessage} />}

      {showFps && <DebugOverlay fps={fps} stats={debugStats} />}

      {!isThirdPerson && <Crosshair />}

      {isReady && !isLoading && showMinimap && minimapData.worldGen && <Minimap playerX={minimapData.playerX} playerZ={minimapData.playerZ} playerRotation={minimapData.playerRotation} worldGenerator={minimapData.worldGen} size={90} range={192} />}

      <GamepadIndicator visible={showGamepadIndicator} />

      {isReady && inventory && !isLoading && (
        <Hud
          hotbar={inventory.hotbar}
          selectedSlot={selectedSlot}
          onToggleChat={() => {
            const newState = !isChatOpen
            setIsChatOpen(newState)
            if (newState) {
              document.exitPointerLock()
            }
          }}
          onSlotSelect={(slot) => {
            if (engineRef.current) {
              engineRef.current.player.selectedSlot = slot
              setSelectedSlot(slot)
            }
          }}
        />
      )}

      <Chat
        isOpen={isChatOpen}
        messages={chatMessages}
        initialValue={chatInitialValue}
        onSendMessage={handleSendMessage}
        onClose={() => {
          setIsChatOpen(false)
          setChatInitialValue('')
          if (!showJoystickRef.current) {
            engineRef.current?.renderer.domElement.requestPointerLock()
          }
        }}
      />
      {isReady && !isLoading && !isChatOpen && <VirtualJoystick visible={showJoystick} onInputChange={handleJoystickInput} onBlockTouch={handleBlockTouch} />}
    </div>
  )
}

export default Dawnlight
