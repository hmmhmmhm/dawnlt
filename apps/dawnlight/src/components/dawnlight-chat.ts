import type React from 'react'
import { EFFECT_NAMES } from '../constants/effects'
import type { GameEngine } from '../game/engine'
import { getLodInternalFaceMinDrop, isLodBoundaryFacesEnabled, isLodInternalFacesEnabled, setLodBoundaryFacesEnabled, setLodInternalFaceMinDrop, setLodInternalFacesEnabled } from '../game/engine/lod/far-renderer-debug'
import { createLodBaselineSnapshotForEngine, type LodBaselineTarget, moveEngineToLodBaseline } from '../game/engine/lod/lod-baseline'
import type { useBgm } from '../hooks/use-bgm'
import type { useChatCommands } from '../hooks/use-chat-commands'
import type { useSfx } from '../hooks/use-sfx'
import type { ChatMessage } from '../types'

export type ProcessCommandFn = ReturnType<typeof useChatCommands>['processCommand']
export type BgmRef = ReturnType<typeof useBgm>
export type SfxRef = ReturnType<typeof useSfx>

let backMirrorEnabled = false

export function isBackMirrorEnabled(): boolean {
  return backMirrorEnabled
}

function toggleBackMirror(): boolean {
  backMirrorEnabled = !backMirrorEnabled
  return backMirrorEnabled
}

export function buildChatMessages(
  prev: ChatMessage[],
  content: string,
  engine: GameEngine,
  onCaptureScreenshot: () => void,
  processCommand: ProcessCommandFn,
  bgmManagerRef: BgmRef,
  sfxManagerRef: SfxRef,
  showFpsRef: React.MutableRefObject<boolean>,
  showJoystickStateRef: React.MutableRefObject<boolean>,
  showMinimapRef: React.MutableRefObject<boolean>,
  setShowFps: React.Dispatch<React.SetStateAction<boolean>>,
  setShowJoystick: React.Dispatch<React.SetStateAction<boolean>>,
  setShowMinimap: React.Dispatch<React.SetStateAction<boolean>>,
  fps: number,
  debugStats: { frameTime: number },
): ChatMessage[] {
  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    sender: 'User',
    content,
    type: 'user',
    timestamp: Date.now(),
  }

  const newMessages = [...prev, newMessage]
  const raw = content.trim()
  const cmdLower = raw.toLowerCase()

  if (cmdLower === '/backmirror') {
    const enabled = toggleBackMirror()
    newMessages.push({
      id: `${Date.now()}-backmirror-${Math.random()}`,
      sender: 'System',
      content: enabled ? 'Back mirror enabled' : 'Back mirror disabled',
      type: 'system',
      timestamp: Date.now(),
    })
    return newMessages
  }

  if (cmdLower.startsWith('/anim')) {
    const parts = raw.split(/\s+/)
    const arg = (parts[1] || '').toLowerCase()
    const avatar = engine.playerAvatar

    const pushSystem = (text: string) => {
      newMessages.push({
        id: `${Date.now()}-anim-${Math.random()}`,
        sender: 'System',
        content: text,
        type: 'system',
        timestamp: Date.now(),
      })
    }

    if (arg === 'next' || arg === '') {
      const name = avatar.debugCycleClip(1)
      pushSystem(name ? `Animation: ${name}` : 'Animation test: no clips loaded')
    } else if (arg === 'prev') {
      const name = avatar.debugCycleClip(-1)
      pushSystem(name ? `Animation: ${name}` : 'Animation test: no clips loaded')
    } else if (arg === 'list') {
      const names = avatar.getClipNames()
      pushSystem(names.length > 0 ? `Animations (${names.length}): ${names.join(', ')}` : 'Animation list is empty')
    } else if (arg === 'current') {
      const name = avatar.getCurrentClipName()
      pushSystem(name ? `Current animation: ${name}` : 'Current animation: none')
    } else if (arg === 'off' || arg === 'clear') {
      avatar.debugClearClip()
      pushSystem('Animation test mode disabled')
    } else {
      const candidate = raw.slice(raw.indexOf(' ') + 1).trim()
      const name = avatar.debugSetClipByName(candidate)
      pushSystem(name ? `Animation: ${name}` : `Animation not found: ${candidate}`)
    }

    return newMessages
  }

  if (cmdLower.startsWith('/emotion')) {
    const parts = raw.split(/\s+/)
    const arg = (parts[1] || '').toLowerCase()
    if (arg === 'smile') {
      const ok = engine.playerAvatar.playSmileExpressionForDuration(2000)
      const visibilityHint = engine.cameraMode === 'first-person' ? ' (switch to 3rd-person to see it)' : ''
      newMessages.push({
        id: `${Date.now()}-emotion-${Math.random()}`,
        sender: 'System',
        content: ok ? `Emotion: smile (2s)${visibilityHint}` : 'Emotion failed: smile texture load failed (check CDN URL/CORS)',
        type: 'system',
        timestamp: Date.now(),
      })
    } else {
      newMessages.push({
        id: `${Date.now()}-emotion-help-${Math.random()}`,
        sender: 'System',
        content: 'Usage: /emotion smile',
        type: 'system',
        timestamp: Date.now(),
      })
    }
    return newMessages
  }

  if (cmdLower === '/hello') {
    const wave = engine.playerAvatar.playGreetingForDuration(2000)
    const smile = engine.playerAvatar.playSmileExpressionForDuration(2000)
    const visibilityHint = engine.cameraMode === 'first-person' ? ' (switch to 3rd-person to see it)' : ''
    newMessages.push({
      id: `${Date.now()}-hello-${Math.random()}`,
      sender: 'System',
      content: wave && smile ? `Emotion: hello (wave + smile, 2s)${visibilityHint}` : 'Emotion failed: wave animation or smile texture load failed',
      type: 'system',
      timestamp: Date.now(),
    })
    return newMessages
  }

  if (cmdLower === '/capture') {
    onCaptureScreenshot()
    newMessages.push({
      id: `${Date.now()}-capture-${Math.random()}`,
      sender: 'System',
      content: 'Screenshot capture started',
      type: 'system',
      timestamp: Date.now(),
    })
    return newMessages
  }

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
        setShowFps((prevValue) => !prevValue)
        return !showFpsRef.current
      },
      toggleJoystick: () => {
        setShowJoystick((prevValue) => !prevValue)
        return !showJoystickStateRef.current
      },
      toggleMinimap: () => {
        setShowMinimap((prevValue) => !prevValue)
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
      moveToLodBaseline: (target: LodBaselineTarget) => {
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
}
