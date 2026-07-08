import type React from 'react'
import { type MutableRefObject, useEffect } from 'react'
import { AnimationLoop, ChunkSystem, type DebugStats, GameEngine, InputSystem, type MinimapData, SceneSystem } from '../game/engine'

type DawnlightDebugState = {
  engine: GameEngine
  inputSystem: InputSystem
  sceneSystem: SceneSystem
  chunkSystem: ChunkSystem
  animationLoop: AnimationLoop
}

type DawnlightDebugWindow = Window & {
  __dawnlight?: DawnlightDebugState
}

function isDevRuntime(): boolean {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV)
}

type EngineRefs = {
  engineRef: MutableRefObject<GameEngine | null>
  inputSystemRef: MutableRefObject<InputSystem | null>
  sceneSystemRef: MutableRefObject<SceneSystem | null>
  chunkSystemRef: MutableRefObject<ChunkSystem | null>
  animationLoopRef: MutableRefObject<AnimationLoop | null>
}

type SetupState = {
  setLoadingProgress: React.Dispatch<React.SetStateAction<number>>
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  setIsReady: React.Dispatch<React.SetStateAction<boolean>>
  setFps: React.Dispatch<React.SetStateAction<number>>
  setDebugStats: React.Dispatch<React.SetStateAction<DebugStats>>
  setMinimapData: React.Dispatch<React.SetStateAction<MinimapData>>
  setChatInitialValue: React.Dispatch<React.SetStateAction<string>>
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedSlot: React.Dispatch<React.SetStateAction<number>>
  setShowGamepadIndicator: React.Dispatch<React.SetStateAction<boolean>>
  setShowJoystick: React.Dispatch<React.SetStateAction<boolean>>
}

type EngineInitArgs = {
  containerRef: MutableRefObject<HTMLDivElement | null>
  refs: EngineRefs
  state: SetupState
  showFpsRef: MutableRefObject<boolean>
  gamepadIndicatorTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  placeBlockRef: MutableRefObject<() => void>
  onCaptureScreenshot: () => void
  showGamepadNotificationRef: MutableRefObject<() => void>
  factories?: EngineFactories
}

type EngineFactories = {
  createEngine: Constructor<GameEngine>
  createInputSystem: Constructor<InputSystem>
  createSceneSystem: Constructor<SceneSystem>
  createChunkSystem: Constructor<ChunkSystem>
  createAnimationLoop: Constructor<AnimationLoop>
}

type Constructor<T> = new (...args: any[]) => T

const DEFAULT_ENGINE_FACTORIES: EngineFactories = {
  createEngine: GameEngine,
  createInputSystem: InputSystem,
  createSceneSystem: SceneSystem,
  createChunkSystem: ChunkSystem,
  createAnimationLoop: AnimationLoop,
}

export function initializeEngineRuntime(args: EngineInitArgs): (() => void) | undefined {
  const { containerRef, refs, state, showFpsRef, gamepadIndicatorTimeoutRef, placeBlockRef, onCaptureScreenshot, showGamepadNotificationRef, factories = DEFAULT_ENGINE_FACTORIES } = args

  if (!containerRef.current) return undefined

  const engine = new factories.createEngine(containerRef.current, {
    onLoadingProgress: (progress: number, message: string) => {
      state.setLoadingProgress(progress)
      state.setLoadingMessage(message)
    },
    onLoadingComplete: () => {
      state.setIsLoading(false)
      state.setIsReady(true)
    },
    onFpsUpdate: state.setFps,
    onDebugStatsUpdate: state.setDebugStats,
    onMinimapUpdate: state.setMinimapData,
  })
  refs.engineRef.current = engine

  const inputSystem = new factories.createInputSystem(engine, {
    onSelectedSlotChange: state.setSelectedSlot,
    onChatOpen: (initialValue: string) => {
      state.setChatInitialValue(initialValue)
      state.setIsChatOpen(true)
    },
    onPlaceBlock: () => placeBlockRef.current(),
    onCaptureScreenshot,
    onGamepadConnected: () => {
      showGamepadNotificationRef.current()
      state.setShowJoystick(false)
    },
    onGamepadDisconnected: () => {
      state.setShowGamepadIndicator(false)
      const userAgent = navigator.userAgent || ''
      const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(userAgent)
      if (isMobile) state.setShowJoystick(true)
    },
  })
  refs.inputSystemRef.current = inputSystem
  inputSystem.registerEventListeners()

  const sceneSystem = new factories.createSceneSystem(engine)
  refs.sceneSystemRef.current = sceneSystem

  const chunkSystem = new factories.createChunkSystem(engine, {
    onLoadingProgress: (progress: number, message: string) => {
      state.setLoadingProgress(progress)
      state.setLoadingMessage(message)
    },
    onLoadingComplete: () => {
      state.setIsLoading(false)
      state.setIsReady(true)
      state.setMinimapData({
        playerX: engine.player.position.x,
        playerZ: engine.player.position.z,
        playerRotation: engine.player.rotation.y,
        worldGen: engine.worldGen,
      })
    },
  })
  refs.chunkSystemRef.current = chunkSystem

  const animationLoop = new factories.createAnimationLoop(engine, inputSystem, sceneSystem, chunkSystem, {
    onFpsUpdate: state.setFps,
    onDebugStatsUpdate: state.setDebugStats,
    onMinimapUpdate: state.setMinimapData,
    isDebugLoggingEnabled: () => showFpsRef.current,
  })
  refs.animationLoopRef.current = animationLoop

  if (isDevRuntime()) {
    ;(window as DawnlightDebugWindow).__dawnlight = {
      engine,
      inputSystem,
      sceneSystem,
      chunkSystem,
      animationLoop,
    }
  }

  animationLoop.start()

  chunkSystem.loadInitialChunks().catch((err: unknown) => {
    console.error('[Dawnlight] Failed to load initial chunks:', err)
    state.setLoadingMessage('Error loading world')
  })

  const userAgent = navigator.userAgent || ''
  const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(userAgent)
  if (isMobile) state.setShowJoystick(true)

  return () => {
    animationLoop.stop()
    inputSystem.dispose()
    engine.dispose()

    if (gamepadIndicatorTimeoutRef.current) {
      clearTimeout(gamepadIndicatorTimeoutRef.current)
    }

    refs.engineRef.current = null
    refs.inputSystemRef.current = null
    refs.sceneSystemRef.current = null
    refs.chunkSystemRef.current = null
    refs.animationLoopRef.current = null
    if (isDevRuntime()) {
      delete (window as DawnlightDebugWindow).__dawnlight
    }
  }
}

export function useEngineInitialization(args: EngineInitArgs): void {
  const { containerRef, refs, state, showFpsRef, gamepadIndicatorTimeoutRef, placeBlockRef, onCaptureScreenshot, showGamepadNotificationRef } = args

  // biome-ignore lint/correctness/useExhaustiveDependencies: Engine setup must not restart on loading progress renders; dependencies are intentionally narrow.
  useEffect(() => {
    return initializeEngineRuntime(args)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.setIsChatOpen,
    state.setIsLoading,
    state.setIsReady,
    state.setLoadingMessage,
    state.setLoadingProgress,
    state.setMinimapData,
    state.setSelectedSlot,
    state.setShowGamepadIndicator,
    state.setFps,
    state.setShowJoystick,
    state.setDebugStats,
    state.setChatInitialValue,
    showGamepadNotificationRef.current,
    showFpsRef.current,
    refs.sceneSystemRef,
    refs.chunkSystemRef,
    refs.inputSystemRef,
    refs.animationLoopRef,
    gamepadIndicatorTimeoutRef.current,
    refs.engineRef,
    placeBlockRef.current,
    onCaptureScreenshot,
    containerRef.current,
  ])
}

export function useInputSyncEffects(inputSystemRef: MutableRefObject<InputSystem | null>, isChatOpen: boolean, showJoystick: boolean): void {
  useEffect(() => {
    inputSystemRef.current?.setChatOpen(isChatOpen)
  }, [inputSystemRef, isChatOpen])

  useEffect(() => {
    inputSystemRef.current?.setShowJoystick(showJoystick)
  }, [inputSystemRef, showJoystick])
}

export function useAnimationDebugHotkeys(engineRef: MutableRefObject<GameEngine | null>, isChatOpenRef: MutableRefObject<boolean>, setChatMessages: React.Dispatch<React.SetStateAction<any[]>>): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isChatOpenRef.current) return
      const engine = engineRef.current
      if (!engine) return
      if (e.code !== 'BracketRight' && e.code !== 'BracketLeft') return

      const step = e.code === 'BracketRight' ? 1 : -1
      const name = engine.playerAvatar.debugCycleClip(step)
      if (!name) return

      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-anim-hotkey`,
          sender: 'System',
          content: `Animation: ${name}`,
          type: 'system',
          timestamp: Date.now(),
        },
      ])
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [engineRef, isChatOpenRef, setChatMessages])
}

export function useMobileUiStateSync(engineRef: MutableRefObject<GameEngine | null>, setIsCrouchingUi: React.Dispatch<React.SetStateAction<boolean>>, setIsSneakingUi: React.Dispatch<React.SetStateAction<boolean>>, setIsMovingUi: React.Dispatch<React.SetStateAction<boolean>>): void {
  useEffect(() => {
    let rafId = 0
    let lastCrouch = false
    let lastSneak = false
    let lastMoving = false

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const engine = engineRef.current
      const player = engine?.player
      const crouching = player?.isCrouching ?? false
      const sneaking = player?.isSneaking ?? false
      const moving = !!engine && (!!engine.keys.KeyW || !!engine.keys.KeyA || !!engine.keys.KeyS || !!engine.keys.KeyD || Math.hypot(player?.velocity.x ?? 0, player?.velocity.z ?? 0) > 0.08)

      if (moving && player?.isCrouching) {
        player.isCrouching = false
      }
      if (crouching !== lastCrouch) {
        lastCrouch = crouching
        setIsCrouchingUi(crouching)
      }
      if (sneaking !== lastSneak) {
        lastSneak = sneaking
        setIsSneakingUi(sneaking)
      }
      if (moving !== lastMoving) {
        lastMoving = moving
        setIsMovingUi(moving)
      }
    }

    tick()
    return () => cancelAnimationFrame(rafId)
  }, [engineRef, setIsCrouchingUi, setIsSneakingUi, setIsMovingUi])
}

export function useAvatarPreviewSync(engineRef: MutableRefObject<GameEngine | null>, setShowAvatarPreview: React.Dispatch<React.SetStateAction<boolean>>): void {
  useEffect(() => {
    let rafId = 0
    let lastVisible = true

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const engine = engineRef.current
      if (!engine || engine.cameraMode !== 'third-person') {
        if (lastVisible) {
          lastVisible = false
          setShowAvatarPreview(false)
        }
        return
      }

      const visible = engine.playerAvatar.shouldShowBackPreview(engine.camera.position)
      if (visible !== lastVisible) {
        lastVisible = visible
        setShowAvatarPreview(visible)
      }
    }

    tick()
    return () => cancelAnimationFrame(rafId)
  }, [engineRef, setShowAvatarPreview])
}
