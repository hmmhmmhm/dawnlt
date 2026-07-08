import { useCallback, useRef } from 'react'
import type { LodQuality } from '../constants'
import { EFFECT_NAMES, type EffectSettings } from '../constants/effects'
import { type LodBaselineTarget, listLodBaselineTargets, resolveLodBaselineTarget } from '../game/engine/lod/lod-baseline'
import type { ChatMessage, GameMode } from '../types'
import type { Season } from '../utils/textures'
import { setSeason } from '../utils/textures'

interface LodCommandSettings {
  enabled: boolean
  farDistance: number
  quality: LodQuality
  lodBudgetMs: number
}

export interface ChatCommandContext {
  gameTime: number
  setGameTime: (time: number) => void
  season: Season
  setSeason: (season: Season) => void
  weather: 'clear' | 'rain' | 'snow'
  setWeather: (weather: 'clear' | 'rain' | 'snow', duration?: number) => void
  gameMode: GameMode
  setGameMode: (mode: GameMode) => void
  setIsFlying: (flying: boolean) => void
  effects: EffectSettings
  setEffect: (name: keyof EffectSettings, value: boolean) => void
  setAllEffects: (value: boolean) => void
  toggleFps: () => boolean
  toggleJoystick: () => boolean
  toggleMinimap: () => boolean
  renderDistance: number
  setRenderDistance: (distance: number) => void
  lodSettings: LodCommandSettings
  setLodSettings: (settings: Partial<LodCommandSettings>) => LodCommandSettings
  lodDebugColorEnabled: boolean
  setLodDebugColorEnabled: (enabled: boolean) => boolean
  lodInternalFacesEnabled: boolean
  setLodInternalFacesEnabled: (enabled: boolean) => boolean
  lodBoundaryFacesEnabled: boolean
  setLodBoundaryFacesEnabled: (enabled: boolean) => boolean
  lodInternalFaceMinDrop: number
  setLodInternalFaceMinDrop: (value: number) => number
  logLodSnapshot: () => string
  moveToLodBaseline: (target: LodBaselineTarget) => void
  getLodBaselineSnapshot: (targetLabel: string) => string
  bgmEnabled: boolean
  setBgmEnabled: (enabled: boolean) => void
  sfxEnabled: boolean
  setSfxEnabled: (enabled: boolean) => void
}

export interface UseChatCommandsReturn {
  processCommand: (content: string, context: ChatCommandContext) => ChatMessage[]
}

export function useChatCommands(): UseChatCommandsReturn {
  const systemMessageSeq = useRef(0)
  const createSystemMessage = useCallback(
    (content: string): ChatMessage => ({
      id: `${Date.now()}-sys-${systemMessageSeq.current++}`,
      sender: 'System',
      content,
      type: 'system',
      timestamp: Date.now(),
    }),
    [],
  )

  const processCommand = useCallback(
    (content: string, context: ChatCommandContext): ChatMessage[] => {
      const messages: ChatMessage[] = []
      const cmd = content.toLowerCase()

      if (cmd === '/help') {
        messages.push(
          createSystemMessage(
            'Available commands: /help, /version, /time, /season, /weather, /creative, /survival, /fps, /effect, /gamepad, /joystick, /minimap, /backmirror, /distance, /lod, /lodlog, /lodbaseline, /lod debugcolor on|off, /lod internalfaces on|off, /lod boundaryfaces on|off, /lod internaldrop <0.1-2.0>, /bgm, /sfx, /emotion smile, /hello, /capture',
          ),
        )
      } else if (cmd === '/joystick') {
        const newState = context.toggleJoystick()
        messages.push(createSystemMessage(newState ? '🕹️ Joystick enabled' : '🕹️ Joystick disabled'))
      } else if (cmd === '/minimap') {
        const newState = context.toggleMinimap()
        messages.push(createSystemMessage(newState ? '🗺️ Minimap enabled' : '🗺️ Minimap disabled'))
      } else if (cmd === '/gamepad') {
        messages.push(createSystemMessage('🎮 Gamepad controls: Left stick=Move, Right stick=Look, A=Jump/Start, B=Place block, X/RT=Break block, LT=Sprint, LB/RB=Hotbar change, Start=Chat'))
      } else if (cmd === '/creative') {
        context.setGameMode('creative')
        messages.push(createSystemMessage('Game mode changed to Creative. Double-tap Space to fly!'))
      } else if (cmd === '/survival') {
        context.setGameMode('survival')
        context.setIsFlying(false)
        messages.push(createSystemMessage('Game mode changed to Survival.'))
      } else if (cmd.startsWith('/time')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')

        if (args.length === 1) {
          const totalMinutes = context.gameTime
          const hours = Math.floor(totalMinutes / 60)
          const minutes = Math.floor(totalMinutes % 60)
          const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          messages.push(createSystemMessage(`Current time: ${timeStr}. Usage: /time <0-24> or /time <HH:MM>`))
        } else {
          const timeArg = args[1]
          let timeVal = -1

          if (timeArg.includes(':')) {
            const [hStr, mStr] = timeArg.split(':')
            const h = parseInt(hStr, 10)
            const m = parseInt(mStr, 10)
            if (!Number.isNaN(h) && !Number.isNaN(m)) {
              timeVal = h + m / 60
            }
          } else {
            timeVal = parseFloat(timeArg)
          }

          if (!Number.isNaN(timeVal) && timeVal >= 0 && timeVal <= 24) {
            context.setGameTime(timeVal * 60)
            const displayH = Math.floor(timeVal)
            const displayM = Math.round((timeVal - displayH) * 60)
            const displayStr = `${displayH.toString().padStart(2, '0')}:${displayM.toString().padStart(2, '0')}`
            messages.push(createSystemMessage(`Time set to ${displayStr}`))
          } else {
            messages.push(createSystemMessage('Usage: /time (shows current time) or /time <0-24> or /time <HH:MM>'))
          }
        }
      } else if (cmd.startsWith('/season')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          messages.push(createSystemMessage(`Current season: ${context.season}. Usage: /season [spring|summer|fall|winter]`))
        } else {
          const seasonArg = args[1].toLowerCase()
          if (['spring', 'summer', 'fall', 'winter'].includes(seasonArg)) {
            const newSeason = seasonArg as Season
            context.setSeason(newSeason)
            setSeason(newSeason)
            messages.push(createSystemMessage(`Season changed to ${newSeason}`))
          } else {
            messages.push(createSystemMessage('Usage: /season [spring|summer|fall|winter]'))
          }
        }
      } else if (cmd.startsWith('/weather')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          messages.push(createSystemMessage(`Current weather: ${context.weather}. Usage: /weather [clear|rain|snow]`))
        } else {
          const type = args[1].toLowerCase()
          if (['clear', 'rain', 'snow'].includes(type)) {
            context.setWeather(type as 'clear' | 'rain' | 'snow', 720)
            messages.push(createSystemMessage(`Weather changed to ${type}`))
          } else {
            messages.push(createSystemMessage('Usage: /weather [clear|rain|snow]'))
          }
        }
      } else if (cmd === '/version') {
        messages.push(createSystemMessage('Dawnlight v0.0.1'))
      } else if (cmd === '/fps') {
        const newState = context.toggleFps()
        messages.push(createSystemMessage(newState ? 'FPS display enabled' : 'FPS display disabled'))
      } else if (cmd.startsWith('/effect')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          const statusList = EFFECT_NAMES.map((name) => `${name}: ${context.effects[name] ? '✓' : '✗'}`).join(', ')
          messages.push(createSystemMessage(`Effects: ${statusList}`))
          messages.push(createSystemMessage('Usage: /effect <name> | /effect on | /effect off'))
        } else {
          const effectArg = args[1].toLowerCase()
          if (effectArg === 'on') {
            context.setAllEffects(true)
            messages.push(createSystemMessage('All effects enabled'))
          } else if (effectArg === 'off') {
            context.setAllEffects(false)
            messages.push(createSystemMessage('All effects disabled'))
          } else {
            const matchedEffect = EFFECT_NAMES.find((name) => name.toLowerCase() === effectArg)
            if (matchedEffect) {
              const newValue = !context.effects[matchedEffect]
              context.setEffect(matchedEffect, newValue)
              messages.push(createSystemMessage(`${matchedEffect}: ${newValue ? 'enabled' : 'disabled'}`))
            } else {
              messages.push(createSystemMessage(`Unknown effect: ${effectArg}. Available: ${EFFECT_NAMES.join(', ')}`))
            }
          }
        }
      } else if (cmd.startsWith('/distance')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          messages.push(createSystemMessage(`Current render distance: ${context.renderDistance} chunks. Usage: /distance <2-32>`))
        } else {
          const distVal = parseInt(args[1], 10)
          if (!Number.isNaN(distVal) && distVal >= 2 && distVal <= 32) {
            context.setRenderDistance(distVal)
            messages.push(createSystemMessage(`Render distance set to ${distVal} chunks (${distVal * 16} blocks)`))
          } else {
            messages.push(createSystemMessage('Usage: /distance <2-32> (in chunks, 1 chunk = 16 blocks)'))
          }
        }
      } else if (cmd === '/lod' || cmd.startsWith('/lod ')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          const lod = context.lodSettings
          messages.push(
            createSystemMessage(
              `Far LOD: ${lod.enabled ? 'enabled' : 'disabled'}, distance=${lod.farDistance}, quality=${lod.quality}, budget=${lod.lodBudgetMs}ms, debugcolor=${context.lodDebugColorEnabled ? 'on' : 'off'}, internalfaces=${context.lodInternalFacesEnabled ? 'on' : 'off'}, boundaryfaces=${context.lodBoundaryFacesEnabled ? 'on' : 'off'}, internaldrop=${context.lodInternalFaceMinDrop.toFixed(2)}`,
            ),
          )
          messages.push(createSystemMessage('Usage: /lod on|off | /lod distance <2-64> | /lod quality <low|medium|high> | /lod budget <0.1-16> | /lod preset <low|medium|high> | /lod debugcolor on|off | /lod internalfaces on|off | /lod boundaryfaces on|off | /lod internaldrop <0.1-2.0>'))
        } else {
          const sub = args[1]
          if (sub === 'on' || sub === 'off') {
            const next = context.setLodSettings({ enabled: sub === 'on' })
            messages.push(createSystemMessage(`Far LOD ${next.enabled ? 'enabled' : 'disabled'}`))
          } else if (sub === 'distance') {
            const value = Number(args[2])
            if (Number.isFinite(value) && value >= 2 && value <= 64) {
              const next = context.setLodSettings({ farDistance: value })
              messages.push(createSystemMessage(`Far LOD distance set to ${next.farDistance} chunks`))
            } else {
              messages.push(createSystemMessage('Usage: /lod distance <2-64>'))
            }
          } else if (sub === 'quality') {
            const quality = (args[2] ?? '').toLowerCase()
            if (quality === 'low' || quality === 'medium' || quality === 'high') {
              const next = context.setLodSettings({ quality })
              messages.push(createSystemMessage(`Far LOD quality set to ${next.quality}`))
            } else {
              messages.push(createSystemMessage('Usage: /lod quality <low|medium|high>'))
            }
          } else if (sub === 'budget') {
            const value = Number(args[2])
            if (Number.isFinite(value) && value >= 0.1 && value <= 16) {
              const next = context.setLodSettings({ lodBudgetMs: value })
              messages.push(createSystemMessage(`Far LOD budget set to ${next.lodBudgetMs}ms`))
            } else {
              messages.push(createSystemMessage('Usage: /lod budget <0.1-16>'))
            }
          } else if (sub === 'preset') {
            const preset = (args[2] ?? '').toLowerCase()
            if (preset === 'low') {
              context.setLodSettings({ quality: 'low', farDistance: 10, lodBudgetMs: 1.25 })
              messages.push(createSystemMessage('Far LOD preset: low (quality=low, distance=10, budget=1.25ms)'))
            } else if (preset === 'medium') {
              context.setLodSettings({ quality: 'medium', farDistance: 12, lodBudgetMs: 2 })
              messages.push(createSystemMessage('Far LOD preset: medium (quality=medium, distance=12, budget=2ms)'))
            } else if (preset === 'high') {
              context.setLodSettings({ quality: 'high', farDistance: 16, lodBudgetMs: 3.5 })
              messages.push(createSystemMessage('Far LOD preset: high (quality=high, distance=16, budget=3.5ms)'))
            } else {
              messages.push(createSystemMessage('Usage: /lod preset <low|medium|high>'))
            }
          } else if (sub === 'debugcolor') {
            const value = (args[2] ?? '').toLowerCase()
            if (value === 'on' || value === 'off') {
              const enabled = context.setLodDebugColorEnabled(value === 'on')
              messages.push(createSystemMessage(`Far LOD debug color ${enabled ? 'enabled' : 'disabled'} (top=yellow/red, boundary=magenta, internal=cyan)`))
            } else {
              messages.push(createSystemMessage('Usage: /lod debugcolor on|off'))
            }
          } else if (sub === 'internalfaces') {
            const value = (args[2] ?? '').toLowerCase()
            if (value === 'on' || value === 'off') {
              const enabled = context.setLodInternalFacesEnabled(value === 'on')
              messages.push(createSystemMessage(`Far LOD internal faces ${enabled ? 'enabled' : 'disabled'}`))
            } else {
              messages.push(createSystemMessage('Usage: /lod internalfaces on|off'))
            }
          } else if (sub === 'boundaryfaces') {
            const value = (args[2] ?? '').toLowerCase()
            if (value === 'on' || value === 'off') {
              const enabled = context.setLodBoundaryFacesEnabled(value === 'on')
              messages.push(createSystemMessage(`Far LOD boundary faces ${enabled ? 'enabled' : 'disabled'}`))
            } else {
              messages.push(createSystemMessage('Usage: /lod boundaryfaces on|off'))
            }
          } else if (sub === 'internaldrop') {
            const value = Number(args[2])
            if (Number.isFinite(value) && value >= 0.1 && value <= 2.0) {
              const applied = context.setLodInternalFaceMinDrop(value)
              messages.push(createSystemMessage(`Far LOD internal drop threshold set to ${applied.toFixed(2)}`))
            } else {
              messages.push(createSystemMessage('Usage: /lod internaldrop <0.1-2.0>'))
            }
          } else {
            messages.push(createSystemMessage('Unknown /lod option. Try /lod'))
          }
        }
      } else if (cmd === '/lodlog') {
        messages.push(createSystemMessage(context.logLodSnapshot()))
      } else if (cmd === '/lodbaseline' || cmd.startsWith('/lodbaseline ')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        const sub = args[1] ?? ''
        if (!sub) {
          messages.push(createSystemMessage(context.getLodBaselineSnapshot('Current position')))
        } else if (sub === 'list') {
          messages.push(createSystemMessage(`LOD baseline targets: ${listLodBaselineTargets()}`))
        } else {
          const target = resolveLodBaselineTarget(sub)
          if (!target) {
            messages.push(createSystemMessage(`Unknown LOD baseline target. Available: ${listLodBaselineTargets()}`))
          } else {
            context.moveToLodBaseline(target)
            messages.push(createSystemMessage(`Moved to LOD baseline target: ${target.label}`))
            messages.push(createSystemMessage(context.getLodBaselineSnapshot(target.label)))
          }
        }
      } else if (cmd.startsWith('/bgm')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          messages.push(createSystemMessage(`BGM: ${context.bgmEnabled ? 'enabled' : 'disabled'}. Usage: /bgm on | /bgm off`))
        } else if (args[1] === 'on') {
          context.setBgmEnabled(true)
          messages.push(createSystemMessage('🎵 BGM enabled'))
        } else if (args[1] === 'off') {
          context.setBgmEnabled(false)
          messages.push(createSystemMessage('🔇 BGM disabled'))
        } else {
          messages.push(createSystemMessage('Usage: /bgm on | /bgm off'))
        }
      } else if (cmd.startsWith('/sfx')) {
        const args = cmd.split(' ').filter((arg) => arg.trim() !== '')
        if (args.length === 1) {
          messages.push(createSystemMessage(`SFX: ${context.sfxEnabled ? 'enabled' : 'disabled'}. Usage: /sfx on | /sfx off`))
        } else if (args[1] === 'on') {
          context.setSfxEnabled(true)
          messages.push(createSystemMessage('🔊 SFX enabled'))
        } else if (args[1] === 'off') {
          context.setSfxEnabled(false)
          messages.push(createSystemMessage('🔇 SFX disabled'))
        } else {
          messages.push(createSystemMessage('Usage: /sfx on | /sfx off'))
        }
      } else {
        messages.push(createSystemMessage(`Unknown command: ${content}`))
      }

      return messages
    },
    [createSystemMessage],
  )

  return { processCommand }
}
