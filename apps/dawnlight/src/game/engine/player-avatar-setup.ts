import { type AnimationClip, AnimationMixer, Box3, type Group, LoopRepeat, type Material, type Mesh, MeshBasicMaterial, MeshStandardMaterial, type Object3D } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLAYER_HEIGHT } from '../../constants'
import { pickNextIdleAction, playIdleAction } from './player-avatar-behavior'

const CLIP_ACTUAL_MOTION_BY_LABEL: Record<string, string> = {
  chair_sit_idle_f: 'chair_sit_idle_f',
  dead: 'jump_with_arms_and_legs_open',
  face_punch_reaction: 'swim_forward',
  female_crouch_pick_throw_forward: 'dead',
  female_crouch_pick_up_place_side: 'hip_hop_dance',
  hip_hop_dance: 'idle_11',
  idle_11: 'idle_4',
  idle_4: 'lie_down_hands_spread',
  idle_9: 'right_hand_sword_slash',
  jump_with_arms_and_legs_open: 'swim_idle',
  lie_down_hands_spread: 'walking',
  right_hand_sword_slash: 'face_punch_reaction',
  rope_hang_idle: 'female_crouch_pick_up_place_side',
  running: 'idle_9',
  sneaky_walk_inplace: 'rope_hang_idle',
  swim_forward: 'sneaky_walk_inplace',
  swim_idle: 'wave_for_help_1',
  walking: 'walking_2_inplace',
  wave_for_help_1: 'female_crouch_pick_throw_forward',
  walking_2_inplace: 'running',
}

export function prepareAvatarModel(avatar: any, modelRoot: Group): void {
  modelRoot.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const converted = materials.map((material) => normalizeMaterial(avatar, material))
    mesh.material = Array.isArray(mesh.material) ? converted : converted[0]
    mesh.castShadow = false
    mesh.receiveShadow = false
  })

  const bounds = new Box3().setFromObject(modelRoot)
  const modelHeight = bounds.max.y - bounds.min.y
  if (modelHeight > 0) {
    const targetHeight = PLAYER_HEIGHT * 1.02
    const scale = targetHeight / modelHeight
    modelRoot.scale.setScalar(scale)
  }

  const scaledBounds = new Box3().setFromObject(modelRoot)
  modelRoot.position.y -= scaledBounds.min.y
  avatar.hipBone = findHipBone(modelRoot)
}

export function setupAvatarAnimations(avatar: any, modelRoot: Group, modelGltf: GLTF, animationGltf: GLTF): void {
  const clips = animationGltf.animations.length > 0 ? animationGltf.animations : modelGltf.animations
  if (clips.length === 0) return
  console.log('[PlayerAvatar] Loaded clips:', clips.map((clip) => clip.name).join(', '))

  avatar.mixer = new AnimationMixer(modelRoot)
  avatar.clipActions.clear()
  avatar.clipNames = clips.map((clip: AnimationClip) => clip.name)
  for (const clip of clips) {
    const action = avatar.mixer.clipAction(clip)
    action.setLoop(LoopRepeat, Infinity)
    avatar.clipActions.set(clip.name, action)
  }

  const idleClips = pickIdleClips(avatar, clips)
  const idleClip = idleClips[0] ?? clips[0]
  const crouchClip = findClipByAlias(clips, ['chair_sit_idle_f'])
  const crouchClipLocked = crouchClip ? createHorizontalRootLockedClip(crouchClip) : undefined
  const walkClip = findClipByAlias(clips, ['walking_2_inplace']) ?? findClipByAlias(clips, ['walking']) ?? findClip(clips, /(walking|walk)/i, /(sneaky|rope|swim|chair)/i)
  const sneakClip = findClipByAlias(clips, ['sneaky_walk_inplace']) ?? findClip(clips, /(sneaky_walk|sneak)/i)
  const runClip = findClipByAlias(clips, ['running']) ?? findClip(clips, /(running|run|jog)/i, /(rope|swim|chair)/i)
  const jumpClip = findClip(clips, /^Jump_with_Arms_and_Legs_Open$/i) ?? findClipByAlias(clips, ['jump_with_arms_and_legs_open']) ?? findClip(clips, /(jump)/i)
  const swimForwardClip = findClipByAlias(clips, ['swim_forward']) ?? findClip(clips, /(swim.*forward|swim_forward)/i)
  const swimIdleClip = findClipByAlias(clips, ['swim_idle']) ?? findClip(clips, /(swim.*idle|swim_idle)/i)

  avatar.idleAction = avatar.clipActions.get(idleClip.name) ?? avatar.mixer.clipAction(idleClip)
  avatar.idleActions = idleClips.map((clip: AnimationClip) => {
    const action = avatar.clipActions.get(clip.name) ?? avatar.mixer.clipAction(clip)
    action.setLoop(LoopRepeat, Infinity)
    return action
  })
  avatar.crouchAction = crouchClipLocked ? avatar.mixer.clipAction(crouchClipLocked) : crouchClip ? (avatar.clipActions.get(crouchClip.name) ?? avatar.mixer.clipAction(crouchClip)) : null
  avatar.sneakAction = sneakClip ? (avatar.clipActions.get(sneakClip.name) ?? avatar.mixer.clipAction(sneakClip)) : null
  avatar.walkAction = walkClip ? (avatar.clipActions.get(walkClip.name) ?? avatar.mixer.clipAction(walkClip)) : null
  avatar.runAction = runClip ? (avatar.clipActions.get(runClip.name) ?? avatar.mixer.clipAction(runClip)) : null
  avatar.jumpAction = jumpClip ? (avatar.clipActions.get(jumpClip.name) ?? avatar.mixer.clipAction(jumpClip)) : null
  avatar.swimForwardAction = swimForwardClip ? (avatar.clipActions.get(swimForwardClip.name) ?? avatar.mixer.clipAction(swimForwardClip)) : null
  avatar.swimIdleAction = swimIdleClip ? (avatar.clipActions.get(swimIdleClip.name) ?? avatar.mixer.clipAction(swimIdleClip)) : null
  avatar.crouchAction?.setLoop(LoopRepeat, Infinity)
  avatar.sneakAction?.setLoop(LoopRepeat, Infinity)
  avatar.swimForwardAction?.setLoop(LoopRepeat, Infinity)
  avatar.swimIdleAction?.setLoop(LoopRepeat, Infinity)
  if (avatar.runAction) avatar.runAction.setEffectiveTimeScale(1.08)
  playIdleAction(avatar, pickNextIdleAction(avatar))
}

export function findClip(clips: AnimationClip[], pattern: RegExp, exclude?: RegExp): AnimationClip | undefined {
  return clips.find((clip) => pattern.test(clip.name) && !(exclude?.test(clip.name) ?? false))
}

export function pickIdleClips(_avatar: any, clips: AnimationClip[]): AnimationClip[] {
  const named = ['idle_11', 'idle_4', 'idle_9'].map((name) => findClipByAlias(clips, [name])).filter((clip): clip is AnimationClip => !!clip)
  if (named.length === 3) return named
  if (named.length > 0) {
    console.warn('[PlayerAvatar] Idle set incomplete. Using available clips:', named.map((c) => c.name).join(', '))
    return named
  }
  console.warn('[PlayerAvatar] Requested idle clips not found. Falling back to generic idle.')
  return [findClip(clips, /(^|_| )idle(_| |$)|stand|breathe|rest/i, /(chair|sit|rope|swim|dead|lie|dance)/i) ?? clips[0]]
}

export function findClipByAlias(clips: AnimationClip[], aliases: string[]): AnimationClip | undefined {
  const wanted = aliases.map((name) => toCanonical(name))
  return clips.find((clip) => {
    const parts = splitClipName(clip.name)
    return parts.some((part) => {
      const label = toCanonical(part)
      const actual = toCanonical(CLIP_ACTUAL_MOTION_BY_LABEL[label] ?? label)
      return wanted.includes(actual)
    })
  })
}

export function findClipNameByAlias(clipNames: string[], aliases: string[]): string | null {
  const wanted = aliases.map((name) => toCanonical(name))
  for (const clipName of clipNames) {
    const parts = splitClipName(clipName)
    const matched = parts.some((part) => {
      const label = toCanonical(part)
      const actual = toCanonical(CLIP_ACTUAL_MOTION_BY_LABEL[label] ?? label)
      return wanted.includes(actual)
    })
    if (matched) return clipName
  }
  return null
}

export function findClipNameByPattern(clipNames: string[], pattern: RegExp): string | null {
  for (const clipName of clipNames) {
    if (pattern.test(clipName)) return clipName
  }
  return null
}

export function createHorizontalRootLockedClip(source: AnimationClip): AnimationClip {
  const clip = source.clone()
  for (const track of clip.tracks) {
    if (!track.name.toLowerCase().endsWith('.position')) continue
    const values = (track as unknown as { values?: number[] | Float32Array }).values
    if (!values || values.length < 3) continue

    const baseX = values[0]
    const baseZ = values[2]
    for (let i = 0; i + 2 < values.length; i += 3) {
      values[i] = baseX
      values[i + 2] = baseZ
    }
  }
  return clip
}

function splitClipName(name: string): string[] {
  return name
    .split(/[|:/]/g)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
}

function toCanonical(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function findHipBone(modelRoot: Group): Object3D | null {
  const candidates = ['hips', 'hip', 'pelvis', 'mixamorighips']
  let found: Object3D | null = null
  modelRoot.traverse((node) => {
    if (found) return
    const lower = node.name.toLowerCase()
    if (candidates.some((name) => lower.includes(name))) {
      found = node
    }
  })
  return found
}

function normalizeMaterial(avatar: any, material: Material): Material {
  let result = material

  if (material instanceof MeshBasicMaterial) {
    const standard = new MeshStandardMaterial({
      color: material.color,
      map: material.map,
      alphaMap: material.alphaMap,
      transparent: material.transparent,
      opacity: material.opacity,
      alphaTest: material.alphaTest,
      side: material.side,
    })
    ;(standard as unknown as { skinning?: boolean }).skinning = (material as unknown as { skinning?: boolean }).skinning
    material.dispose()
    result = standard
  }

  const withDepth = result as Material & {
    depthTest?: boolean
    depthWrite?: boolean
    transparent?: boolean
    alphaTest?: number
    map?: unknown
    alphaMap?: unknown
    needsUpdate?: boolean
  }
  withDepth.depthTest = true
  withDepth.depthWrite = true

  if (withDepth.transparent && (withDepth.alphaTest ?? 0) <= 0 && (withDepth.map || withDepth.alphaMap)) {
    withDepth.alphaTest = 0.5
    withDepth.transparent = false
  }

  const emissiveHolder = result as Material & {
    emissive?: { set: (value: number) => void }
    emissiveIntensity?: number
  }
  if (emissiveHolder.emissive) emissiveHolder.emissive.set(0x000000)
  if (typeof emissiveHolder.emissiveIntensity === 'number') emissiveHolder.emissiveIntensity = 0
  avatar.emissiveMaterials.push(emissiveHolder)
  withDepth.needsUpdate = true
  return result
}
