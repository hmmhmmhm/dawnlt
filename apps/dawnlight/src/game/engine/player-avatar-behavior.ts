import type { AnimationAction, Group, Material, Mesh, Texture, Vector3 } from 'three'
import type { Player } from '../../types'

const RANDOM_SMILE_DURATION_MS = 1000
const RANDOM_SMILE_INTERVAL_MIN_MS = 5000
const RANDOM_SMILE_INTERVAL_MAX_MS = 15000
const SMALL_DROP_JUMP_SUPPRESS_HEIGHT = 1.15
const LARGE_FALL_JUMP_TRIGGER_SPEED = -2.2

export function clearSmileExpression(avatar: any): void {
  if (!avatar.isSmileActive) return
  applyTexturePreset(avatar, avatar.baseTexturePreset)
  avatar.isSmileActive = false
  avatar.smileActiveUntil = 0
}

export function updateRandomSmile(avatar: any): void {
  const now = Date.now()
  if (avatar.nextRandomSmileAt <= 0) {
    avatar.nextRandomSmileAt = now + randomSmileIntervalMs()
    return
  }
  if (avatar.isSmileActive || now < avatar.nextRandomSmileAt) return

  avatar.playSmileExpressionForDuration(RANDOM_SMILE_DURATION_MS)
  avatar.nextRandomSmileAt = now + randomSmileIntervalMs()
}

export function applyTexturePreset(avatar: any, preset: Array<{ map: Texture | null; emissiveMap: Texture | null }>): void {
  const count = Math.min(avatar.textureSwapMaterials.length, preset.length)
  for (let i = 0; i < count; i += 1) {
    const material = avatar.textureSwapMaterials[i]
    const item = preset[i]
    material.map = item.map
    material.emissiveMap = item.emissiveMap
    material.needsUpdate = true
  }
}

export function captureTextureSwapMaterials(avatar: any, modelRoot: Group): void {
  avatar.textureSwapMaterials = collectTextureSwapMaterials(modelRoot)
  avatar.baseTexturePreset = avatar.textureSwapMaterials.map((material: any) => ({
    map: material.map ?? null,
    emissiveMap: material.emissiveMap ?? null,
  }))
}

export function applyTemporaryTextureAnisotropy(avatar: any, targetAnisotropy: number): () => void {
  if (!Number.isFinite(targetAnisotropy) || targetAnisotropy <= 0) {
    return () => undefined
  }

  const textures = new Map<Texture, number>()
  for (const material of avatar.textureSwapMaterials) {
    const candidates = [material.map, material.emissiveMap]
    for (const texture of candidates) {
      if (!texture) continue
      if (!textures.has(texture)) textures.set(texture, texture.anisotropy ?? 1)
      texture.anisotropy = targetAnisotropy
      texture.needsUpdate = true
    }
  }

  return () => {
    textures.forEach((anisotropy, texture) => {
      texture.anisotropy = anisotropy
      texture.needsUpdate = true
    })
  }
}

export function collectTextureSwapMaterials(modelRoot: Group): Array<
  Material & {
    map?: Texture | null
    emissiveMap?: Texture | null
    needsUpdate?: boolean
  }
> {
  const list: Array<Material & { map?: Texture | null; emissiveMap?: Texture | null; needsUpdate?: boolean }> = []
  modelRoot.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const target = material as Material & {
        map?: Texture | null
        emissiveMap?: Texture | null
        needsUpdate?: boolean
      }
      if (!('map' in target) && !('emissiveMap' in target)) continue
      list.push(target)
    }
  })
  return list
}

export function applyRootTransform(avatar: any): void {
  if (!avatar.root) return
  avatar.root.position.copy(avatar.visualPosition)
  avatar.root.rotation.set(0, avatar.avatarYaw, 0)
}

export function switchAction(avatar: any, nextAction: AnimationAction): void {
  if (avatar.activeAction === nextAction) return
  const previous = avatar.activeAction
  avatar.activeAction = nextAction
  if (previous) {
    nextAction.reset().fadeIn(0.18).play()
    previous.fadeOut(0.15)
  } else {
    // First action should snap in to avoid exposing bind/T-pose during spawn.
    nextAction.reset().setEffectiveWeight(1).play()
  }
  avatar.motionAnchorHipWorld = null
  avatar.idleTimer = 0
  avatar.nextIdleSwitchTime = getIdleSwitchTime(nextAction)
}

export function applyHorizontalMotionCompensation(avatar: any): void {
  if (!avatar.root || !avatar.hipBone) return
  if (!avatar.shouldCompensateHorizontalMotion) {
    avatar.motionAnchorHipWorld = null
    return
  }

  const motionInfluencing = avatar.activeAction !== null || avatar.debugForcedAction !== null
  if (!motionInfluencing) {
    avatar.motionAnchorHipWorld = null
    return
  }

  avatar.hipBone.getWorldPosition(avatar.hipWorldPos)
  if (!avatar.motionAnchorHipWorld) {
    avatar.motionAnchorHipWorld = avatar.hipWorldPos.clone()
    return
  }

  const dx = avatar.hipWorldPos.x - avatar.motionAnchorHipWorld.x
  const dz = avatar.hipWorldPos.z - avatar.motionAnchorHipWorld.z
  if (Math.abs(dx) < 0.00001 && Math.abs(dz) < 0.00001) return

  avatar.root.position.x -= dx
  avatar.root.position.z -= dz
}

export function updateIdleCycle(avatar: any, deltaTime: number): void {
  if (avatar.idleActions.length === 0) {
    if (avatar.idleAction && avatar.activeAction !== avatar.idleAction) switchAction(avatar, avatar.idleAction)
    return
  }

  if (!avatar.activeAction || !avatar.idleActions.includes(avatar.activeAction)) {
    playIdleAction(avatar, pickNextIdleAction(avatar))
    return
  }

  avatar.idleTimer += deltaTime
  if (avatar.idleTimer >= avatar.nextIdleSwitchTime) {
    playIdleAction(avatar, pickNextIdleAction(avatar))
  }
}

export function playIdleAction(avatar: any, action: AnimationAction | null): void {
  if (!action) return
  console.log('[PlayerAvatar] now playing idle:', action.getClip().name)
  switchAction(avatar, action)
  avatar.idleTimer = 0
  avatar.nextIdleSwitchTime = getIdleSwitchTime(action)
}

export function pickNextIdleAction(avatar: any): AnimationAction | null {
  if (avatar.idleActions.length === 0) return avatar.idleAction
  if (avatar.idleActions.length === 1) return avatar.idleActions[0]
  const current = avatar.activeAction
  const candidates = avatar.idleActions.filter((action: AnimationAction) => action !== current)
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex] ?? avatar.idleActions[0]
}

export function shouldInterruptGreeting(player: Player, intendedMoveYaw: number | null, isJumping: boolean): boolean {
  if (isJumping) return true
  if (player.isCrouching || player.isSneaking) return true
  if (intendedMoveYaw !== null) return true
  if (Math.hypot(player.velocity.x, player.velocity.z) > 0.08) return true
  if (!player.isGrounded && Math.abs(player.velocity.y) > 0.45) return true
  return false
}

export function updateAirborneState(avatar: any, player: Player): void {
  if (player.isGrounded || player.isFlying) {
    avatar.wasAirborne = false
    avatar.airborneStartY = player.position.y
    return
  }

  if (!avatar.wasAirborne) {
    avatar.wasAirborne = true
    avatar.airborneStartY = player.position.y
  }
}

export function shouldPlayJumpMotion(avatar: any, player: Player, isSwimming: boolean): boolean {
  if (isSwimming || player.isGrounded || player.isFlying) return false
  if (player.velocity.y > 1.0) return true

  const dropDistance = avatar.airborneStartY - player.position.y
  if (dropDistance <= SMALL_DROP_JUMP_SUPPRESS_HEIGHT) return false
  return player.velocity.y <= LARGE_FALL_JUMP_TRIGGER_SPEED
}

export function updateNightBrightness(avatar: any, sunIntensity: number): void {
  const t = Math.max(0, Math.min(1, sunIntensity))
  const fill = 0.62 + (1 - t) * 0.08
  for (const material of avatar.emissiveMaterials) {
    if (material.emissive) material.emissive.set(0xd8d8d8)
    if (typeof material.emissiveIntensity === 'number') {
      material.emissiveIntensity = fill
    }
  }
}

export function updateVisualPosition(avatar: any, player: Player, deltaTime: number): void {
  const target = player.position
  if (!avatar.hasVisualPosition) {
    avatar.visualPosition.copy(target)
    avatar.hasVisualPosition = true
    return
  }

  if (avatar.visualPosition.distanceToSquared(target) > 16) {
    avatar.visualPosition.copy(target)
    return
  }

  const horizontalLerp = Math.min(14 * deltaTime, 1)
  avatar.visualPosition.x += (target.x - avatar.visualPosition.x) * horizontalLerp
  avatar.visualPosition.z += (target.z - avatar.visualPosition.z) * horizontalLerp

  const yDelta = target.y - avatar.visualPosition.y
  const verticalSpeed = Math.abs(player.velocity.y)
  let yLerp: number
  if (player.isFlying || verticalSpeed > 1.5) {
    yLerp = Math.min(30 * deltaTime, 1)
  } else if (player.isGrounded && yDelta > 0 && yDelta <= 1.15) {
    yLerp = Math.min(5.5 * deltaTime, 1)
  } else if (yDelta > 0) {
    yLerp = Math.min(10 * deltaTime, 1)
  } else {
    yLerp = Math.min(20 * deltaTime, 1)
  }
  avatar.visualPosition.y += yDelta * yLerp
}

export function lerpAngle(current: number, target: number, t: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + delta * t
}

export function shouldShowBackPreview(avatar: any, cameraPosition: Vector3): boolean {
  if (!avatar.root) return false

  avatar.root.getWorldPosition(avatar.worldPos)
  avatar.toCamera.copy(cameraPosition).sub(avatar.worldPos)
  if (avatar.toCamera.lengthSq() < 0.0001) return false
  avatar.toCamera.normalize()

  avatar.root.getWorldQuaternion(avatar.worldQuat)
  avatar.avatarForward.set(0, 0, 1).applyQuaternion(avatar.worldQuat).normalize()
  const alignment = avatar.avatarForward.dot(avatar.toCamera)
  return alignment < -0.12
}

function randomSmileIntervalMs(): number {
  const spread = RANDOM_SMILE_INTERVAL_MAX_MS - RANDOM_SMILE_INTERVAL_MIN_MS
  return RANDOM_SMILE_INTERVAL_MIN_MS + Math.floor(Math.random() * (spread + 1))
}

function getIdleSwitchTime(action: AnimationAction): number {
  const clipDuration = Math.max(0.4, action.getClip().duration)
  return clipDuration * 4
}
