import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { MdOutlineSwitchCamera, MdPhotoCamera } from 'react-icons/md'
import { type BlockActionDeps, placeBlock as placeBlockAction } from '../game/block-actions'
import type { AnimationLoop, ChunkSystem, DebugStats, GameEngine, InputSystem, MinimapData, SceneSystem } from '../game/engine'
import { handleBlockSfx } from '../game/engine/sfx-triggers'
import { useBgm } from '../hooks/use-bgm'
import { useChatCommands } from '../hooks/use-chat-commands'
import { useInventoryUi } from '../hooks/use-inventory-ui'
import { useSfx } from '../hooks/use-sfx'
import type { ChatMessage } from '../types'
import { triggerHaptic } from '../utils/haptics'
import { Chat } from './chat'
import { Crosshair } from './crosshair'
import { buildChatMessages } from './dawnlight-chat'
import { DEFAULT_DEBUG_STATS } from './dawnlight-default-stats'
import { useAnimationDebugHotkeys, useEngineInitialization, useInputSyncEffects, useMobileUiStateSync } from './dawnlight-effects'
import { captureGameScreenshot } from './dawnlight-screenshot'
import { AvatarPreview, DebugOverlay, GamepadIndicator, LoadingScreen } from './dawnlight-ui'
import { Hud } from './hud'
import { InventoryPanel } from './inventory-panel'
import { Minimap } from './minimap'
import { type BlockTouchEvent, type JoystickInput, VirtualJoystick } from './virtual-joystick'
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
  const [isCrouchingUi, setIsCrouchingUi] = useState(false)
  const [isSneakingUi, setIsSneakingUi] = useState(false)
  const [isMovingUi, setIsMovingUi] = useState(false)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const captureInProgressRef = useRef(false)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

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
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      getIsRaining: () => engine.weather === 'rain',
      onSfx: (type, blockType) => {
        const engine = engineRef.current
        if (engine) handleBlockSfx(engine, type, blockType)
      },
    }

    placeBlockAction(deps)
  })

  const handleJoystickInput = useCallback((input: JoystickInput) => {
    if (inputSystemRef.current) {
      inputSystemRef.current.updateJoystickInput(input)
    }
  }, [])

  const handleMobileCrouchToggle = useCallback(() => {
    const engine = engineRef.current
    if (!engine || engine.player.isFlying) return

    engine.player.isCrouching = !engine.player.isCrouching
    if (engine.player.isCrouching) {
      engine.player.isSneaking = false
      engine.keys.KeyW = false
      engine.keys.KeyA = false
      engine.keys.KeyS = false
      engine.keys.KeyD = false
    }
    setIsCrouchingUi(engine.player.isCrouching)
  }, [])

  const handleMobileSneakToggle = useCallback(() => {
    const engine = engineRef.current
    if (!engine || engine.player.isFlying) return

    engine.player.isSneaking = !engine.player.isSneaking
    if (engine.player.isSneaking) {
      engine.player.isCrouching = false
    }
    setIsSneakingUi(engine.player.isSneaking)
    setIsCrouchingUi(engine.player.isCrouching)
  }, [])

  const handleMobileEmotion = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.playerAvatar.playGreetingForDuration(2000)
    engine.playerAvatar.playSmileExpressionForDuration(2000)
  }, [])

  const handleCaptureScreenshot = useCallback(async () => {
    const engine = engineRef.current
    if (!engine || captureInProgressRef.current) return

    captureInProgressRef.current = true
    setIsCapturingScreenshot(true)

    try {
      await captureGameScreenshot(engine)
      triggerHaptic('confirm')
    } catch {
      triggerHaptic('error')
    } finally {
      setIsCapturingScreenshot(false)
      captureInProgressRef.current = false
    }
  }, [])

  const handleSendMessage = useCallback(
    (content: string) => {
      const engine = engineRef.current
      if (!engine) return

      const prevGameTime = engine.gameTime

      setChatMessages((prev) => {
        return buildChatMessages(
          prev,
          content,
          engine,
          () => {
            void handleCaptureScreenshot()
          },
          processCommand,
          bgmManagerRef,
          sfxManagerRef,
          showFpsRef,
          showJoystickStateRef,
          showMinimapRef,
          setShowFps,
          setShowJoystick,
          setShowMinimap,
          fps,
          debugStats,
        )
      })

      if (engine.gameTime !== prevGameTime) {
        bgmManagerRef.current?.update(engine.gameTime / 1440)
      }
    },
    [processCommand, handleCaptureScreenshot, fps, debugStats, sfxManagerRef, bgmManagerRef.current?.update, bgmManagerRef],
  )

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

  const handleEngineCaptureScreenshot = useCallback(() => {
    void handleCaptureScreenshot()
  }, [handleCaptureScreenshot])

  useEngineInitialization({
    containerRef,
    refs: {
      engineRef,
      inputSystemRef,
      sceneSystemRef,
      chunkSystemRef,
      animationLoopRef,
    },
    state: {
      setLoadingProgress,
      setLoadingMessage,
      setIsLoading,
      setIsReady,
      setFps,
      setDebugStats,
      setMinimapData,
      setChatInitialValue,
      setIsChatOpen,
      setSelectedSlot,
      setShowGamepadIndicator,
      setShowJoystick,
    },
    showFpsRef,
    gamepadIndicatorTimeoutRef,
    placeBlockRef,
    onCaptureScreenshot: handleEngineCaptureScreenshot,
    showGamepadNotificationRef,
  })
  useInputSyncEffects(inputSystemRef, isChatOpen, showJoystick)
  useAnimationDebugHotkeys(engineRef, isChatOpenRef, setChatMessages)
  useMobileUiStateSync(engineRef, setIsCrouchingUi, setIsSneakingUi, setIsMovingUi)
  const inventoryUi = useInventoryUi(engineRef)
  const inventory = engineRef.current?.inventory
  const isThirdPerson = engineRef.current?.cameraMode === 'third-person'
  const isFirstPerson = !isThirdPerson
  const isUltraCompactUi = viewport.width <= 340 && viewport.height <= 400
  const shouldAvoidDebugTopLeft = isThirdPerson && isReady && !isLoading && !isUltraCompactUi && viewport.width > 270
  const floatingIconButtonStyle: CSSProperties = {
    borderColor: 'rgba(255,255,255,0.32)',
    background: 'linear-gradient(180deg, rgba(41,59,82,0.32) 0%, rgba(17,29,46,0.3) 55%, rgba(10,16,28,0.26) 100%)',
    boxShadow: '0 8px 18px rgba(2,7,18,0.32), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -6px 14px rgba(0,0,0,0.2)',
  }
  const overlayUiStyle: CSSProperties | undefined = isCapturingScreenshot ? { opacity: 0, visibility: 'hidden', pointerEvents: 'none' } : undefined

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Screen */}
      {isLoading && <LoadingScreen progress={loadingProgress} message={loadingMessage} />}

      <div style={overlayUiStyle}>
        {/* Debug Overlay */}
        {showFps && <DebugOverlay fps={fps} stats={debugStats} avoidTopLeftPreview={shouldAvoidDebugTopLeft} />}

        {/* Crosshair */}
        {!isThirdPerson && <Crosshair />}

        {/* Minimap */}
        {isReady && !isLoading && !isUltraCompactUi && showMinimap && minimapData.worldGen && <Minimap playerX={minimapData.playerX} playerZ={minimapData.playerZ} playerRotation={minimapData.playerRotation} worldGenerator={minimapData.worldGen} size={90} range={192} />}

        {/* Gamepad Indicator */}
        <GamepadIndicator visible={showGamepadIndicator} />

        {/* Avatar motion preview */}
        {isReady && !isLoading && !isUltraCompactUi && <AvatarPreview engineRef={engineRef} visible={isThirdPerson} />}

        {/* HUD */}
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

        {isReady && inventory && !isLoading && (
          <InventoryPanel
            inventory={inventory}
            selectedSlot={selectedSlot}
            isOpen={inventoryUi.isOpen}
            cursorItem={inventoryUi.cursorItem}
            craftingGrid={inventoryUi.craftingGrid}
            craftingResult={inventoryUi.craftingResult}
            onClose={inventoryUi.close}
            onDropCursor={inventoryUi.dropCursor}
            onSlotClick={inventoryUi.clickSlot}
            onSlotSecondaryClick={inventoryUi.secondaryClickSlot}
            onCraftingSlotClick={inventoryUi.clickCraftingSlot}
            onCraftingSlotSecondaryClick={inventoryUi.secondaryClickCraftingSlot}
            onCraftResultClick={inventoryUi.craftResult}
          />
        )}

        {isReady && !isLoading && showJoystick && (
          <div className="fixed top-4 right-4 z-70 md:hidden pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic()
                const engine = engineRef.current
                if (!engine) return
                engine.toggleCameraMode()
              }}
              aria-label={isFirstPerson ? 'switch to first person' : 'switch to third person'}
              title={isFirstPerson ? 'first person' : 'third person'}
              className="w-10 h-10 border rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition-transform"
              style={floatingIconButtonStyle}
            >
              <MdOutlineSwitchCamera
                size={20}
                style={{
                  color: 'rgba(230,246,255,0.95)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic()
                void handleCaptureScreenshot()
              }}
              aria-label="save screenshot"
              title="screenshot"
              className="w-10 h-10 border rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition-transform"
              style={floatingIconButtonStyle}
            >
              <MdPhotoCamera
                size={19}
                style={{
                  color: 'rgba(230,246,255,0.95)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
                }}
              />
            </button>
          </div>
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

        {isReady && !isLoading && !isChatOpen && (
          <VirtualJoystick
            visible={showJoystick}
            hideActionButtons={isUltraCompactUi}
            onInputChange={handleJoystickInput}
            onBlockTouch={handleBlockTouch}
            onToggleCrouch={handleMobileCrouchToggle}
            onToggleSneak={handleMobileSneakToggle}
            onTriggerEmotion={handleMobileEmotion}
            isCrouching={isCrouchingUi}
            isSneaking={isSneakingUi}
            isMoving={isMovingUi}
          />
        )}
      </div>
    </div>
  )
}

export default Dawnlight
