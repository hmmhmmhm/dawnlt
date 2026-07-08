import type { Player } from '../../types'
import { shouldInterruptGreeting, switchAction } from './player-avatar-behavior'
import { findClipNameByAlias, findClipNameByPattern } from './player-avatar-setup'

export function debugCycleAvatarClip(avatar: any, step: number): string | null {
  if (avatar.clipNames.length === 0) return null
  if (avatar.debugClipIndex < 0) avatar.debugClipIndex = 0
  avatar.debugClipIndex = (avatar.debugClipIndex + step + avatar.clipNames.length) % avatar.clipNames.length
  return debugSetAvatarClipByName(avatar, avatar.clipNames[avatar.debugClipIndex])
}

export function debugSetAvatarClipByName(avatar: any, name: string): string | null {
  const action = avatar.clipActions.get(name)
  if (!action) return null
  avatar.debugForcedAction = action
  avatar.debugForcedReason = 'debug'
  avatar.debugForcedReleaseAt = 0
  if (avatar.activeAction !== action) switchAction(avatar, action)
  return action.getClip().name
}

export function debugClearAvatarClip(avatar: any): void {
  avatar.debugForcedAction = null
  avatar.debugForcedReason = null
  avatar.debugForcedReleaseAt = 0
  avatar.debugClipIndex = -1
}

export function playAvatarGreetingForDuration(avatar: any, durationMs: number = 2000): string | null {
  const target = findClipNameByAlias(avatar.clipNames, ['wave_for_help_1']) ?? findClipNameByPattern(avatar.clipNames, /(wave|greet|hello|hand)/i)
  if (!target) return null

  const action = avatar.clipActions.get(target)
  if (!action) return null

  avatar.debugForcedAction = action
  avatar.debugForcedReason = 'greeting'
  avatar.debugForcedReleaseAt = Date.now() + Math.max(200, durationMs)
  if (avatar.activeAction !== action) switchAction(avatar, action)
  return action.getClip().name
}

export function shouldInterruptAvatarGreeting(player: Player, intendedMoveYaw: number | null, isJumping: boolean): boolean {
  return shouldInterruptGreeting(player, intendedMoveYaw, isJumping)
}
