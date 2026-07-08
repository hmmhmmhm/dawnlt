import { type AnimationAction, type AnimationMixer, type Group, type Material, type Mesh, type Object3D, Quaternion, SRGBColorSpace, type Texture, TextureLoader, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Player } from '../../types'
import {
  applyHorizontalMotionCompensation,
  applyRootTransform,
  applyTemporaryTextureAnisotropy,
  applyTexturePreset,
  captureTextureSwapMaterials,
  clearSmileExpression,
  lerpAngle,
  shouldPlayJumpMotion,
  shouldShowBackPreview,
  switchAction,
  updateAirborneState,
  updateIdleCycle,
  updateNightBrightness,
  updateRandomSmile,
  updateVisualPosition,
} from './player-avatar-behavior'
import { debugClearAvatarClip, debugCycleAvatarClip, debugSetAvatarClipByName, playAvatarGreetingForDuration, shouldInterruptAvatarGreeting } from './player-avatar-debug'
import { prepareAvatarModel, setupAvatarAnimations } from './player-avatar-setup'

export type CameraMode = 'first-person' | 'third-person'

const MODEL_URL = 'https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-v2.glb'
const ANIMATION_URL = 'https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-anim.glb'
const SMILE_TEXTURE_URL = 'https://static.dawn.lt/glb/leafy-explorer/smile.webp'
const AVATAR_TURN_LERP_SPEED = 6.5

export class PlayerAvatar {
  private readonly scene: Group | Object3D
  private readonly loader = new GLTFLoader()
  private readonly textureLoader = new TextureLoader()
  private readonly modelForwardOffset = 0
  private readonly visualPosition = new Vector3()
  private hasVisualPosition = false
  private root: Group | null = null
  private mixer: AnimationMixer | null = null
  private idleAction: AnimationAction | null = null
  private clipActions: Map<string, AnimationAction> = new Map()
  private clipNames: string[] = []
  private debugClipIndex = -1
  private debugForcedAction: AnimationAction | null = null
  private debugForcedReason: 'debug' | 'greeting' | null = null
  private debugForcedReleaseAt = 0
  private textureSwapMaterials: Array<
    Material & {
      map?: Texture | null
      emissiveMap?: Texture | null
      needsUpdate?: boolean
    }
  > = []
  private baseTexturePreset: Array<{ map: Texture | null; emissiveMap: Texture | null }> = []
  private smileTexturePreset: Array<{ map: Texture | null; emissiveMap: Texture | null }> | null = null
  private smilePresetLoading: Promise<void> | null = null
  private smileActiveUntil = 0
  private nextRandomSmileAt = 0
  private isSmileActive = false
  private idleActions: AnimationAction[] = []
  private crouchAction: AnimationAction | null = null
  private sneakAction: AnimationAction | null = null
  private walkAction: AnimationAction | null = null
  private runAction: AnimationAction | null = null
  private jumpAction: AnimationAction | null = null
  private swimIdleAction: AnimationAction | null = null
  private swimForwardAction: AnimationAction | null = null
  private activeAction: AnimationAction | null = null
  private idleTimer = 0
  private nextIdleSwitchTime = 1.8
  private readonly emissiveMaterials: Array<{
    emissiveIntensity?: number
    emissive?: { set: (v: number) => void }
  }> = []
  private readonly worldPos = new Vector3()
  private readonly toCamera = new Vector3()
  private readonly avatarForward = new Vector3()
  private readonly worldQuat = new Quaternion()
  private hipBone: Object3D | null = null
  private motionAnchorHipWorld: Vector3 | null = null
  private readonly hipWorldPos = new Vector3()
  private shouldCompensateHorizontalMotion = false
  private avatarYaw = 0
  private hasAvatarYaw = false
  private wasAirborne = false
  private airborneStartY = 0
  private disposed = false

  constructor(scene: Group | Object3D) {
    this.scene = scene
    // Required for GLB files compressed with EXT_meshopt_compression.
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.textureLoader.setCrossOrigin('anonymous')
    this.keepHelperStateReferences()
  }

  private keepHelperStateReferences(): void {
    void this.visualPosition
    void this.hasVisualPosition
    void this.idleAction
    void this.debugClipIndex
    void this.nextRandomSmileAt
    void this.idleActions
    void this.idleTimer
    void this.nextIdleSwitchTime
    void this.worldPos
    void this.toCamera
    void this.avatarForward
    void this.worldQuat
    void this.hipBone
    void this.motionAnchorHipWorld
    void this.hipWorldPos
    void this.shouldCompensateHorizontalMotion
    void this.wasAirborne
    void this.airborneStartY
  }

  async load(): Promise<void> {
    try {
      const [modelGltf, animationGltf] = await Promise.all([this.loader.loadAsync(MODEL_URL), this.loader.loadAsync(ANIMATION_URL)])

      if (this.disposed) return

      const modelRoot = modelGltf.scene
      this.prepareModel(modelRoot)
      this.captureTextureSwapMaterials(modelRoot)
      this.setupAnimations(modelRoot, modelGltf, animationGltf)

      this.scene.add(modelRoot)
      this.root = modelRoot
      console.log('[PlayerAvatar] Loaded leafy explorer model and animations')
    } catch (error) {
      console.error('[PlayerAvatar] Failed to load avatar assets:', error)
    }
  }

  update(deltaTime: number, player: Player, _isMoving: boolean, isSprinting: boolean, cameraMode: CameraMode, sunIntensity: number, intendedMoveYaw: number | null, isSwimming: boolean, isSwimForwardBlocked: boolean): void {
    if (!this.root) return

    this.root.visible = cameraMode === 'third-person'
    this.updateVisualPosition(player, deltaTime)
    this.updateNightBrightness(sunIntensity)

    if (cameraMode === 'third-person' && intendedMoveYaw !== null) {
      const targetYaw = intendedMoveYaw + this.modelForwardOffset
      if (!this.hasAvatarYaw) {
        this.avatarYaw = targetYaw
        this.hasAvatarYaw = true
      } else {
        const blend = Math.min(AVATAR_TURN_LERP_SPEED * deltaTime, 1)
        this.avatarYaw = this.lerpAngle(this.avatarYaw, targetYaw, blend)
      }
    } else if (!this.hasAvatarYaw) {
      this.avatarYaw = player.rotation.y + this.modelForwardOffset
      this.hasAvatarYaw = true
    }
    this.applyRootTransform()

    if (this.isSmileActive && this.smileActiveUntil > 0 && Date.now() >= this.smileActiveUntil) {
      this.clearSmileExpression()
    }
    this.updateRandomSmile()
    this.updateAirborneState(player)

    if (this.debugForcedAction && this.debugForcedReleaseAt > 0 && Date.now() >= this.debugForcedReleaseAt) {
      this.debugForcedAction = null
      this.debugForcedReason = null
      this.debugForcedReleaseAt = 0
    }

    const greetingJumping = this.shouldPlayJumpMotion(player, isSwimming)
    if (this.debugForcedReason === 'greeting' && this.shouldInterruptGreeting(player, intendedMoveYaw, greetingJumping)) {
      this.debugForcedAction = null
      this.debugForcedReason = null
      this.debugForcedReleaseAt = 0
    }

    if (this.debugForcedAction) {
      this.shouldCompensateHorizontalMotion = false
      if (this.activeAction !== this.debugForcedAction) {
        this.switchAction(this.debugForcedAction)
      }
      this.mixer?.update(deltaTime)
      // Keep root transform fixed even if clip has root-motion tracks.
      this.applyRootTransform()
      this.applyHorizontalMotionCompensation()
      return
    }

    const isJumping = this.shouldPlayJumpMotion(player, isSwimming)
    const shouldMove = !player.isFlying && intendedMoveYaw !== null
    const shouldRun = shouldMove && isSprinting
    const sneakWalkOnly = player.isSneaking && !isSprinting
    this.shouldCompensateHorizontalMotion = !(isSwimming || isJumping || shouldMove)

    if (isSwimming) {
      const swimMove = !isSwimForwardBlocked && (shouldMove || Math.hypot(player.velocity.x, player.velocity.z) > 0.15)
      const swimAction = (swimMove ? this.swimForwardAction : this.swimIdleAction) ?? this.swimForwardAction ?? this.swimIdleAction
      if (swimAction && this.activeAction !== swimAction) {
        this.switchAction(swimAction)
      }
    } else if (player.isCrouching) {
      if (this.crouchAction && this.activeAction !== this.crouchAction) {
        this.switchAction(this.crouchAction)
      }
    } else if (isJumping) {
      if (this.jumpAction && this.activeAction !== this.jumpAction) {
        this.switchAction(this.jumpAction)
      }
    } else if (shouldMove) {
      const locomotionAction = (sneakWalkOnly ? this.sneakAction : shouldRun ? this.runAction : this.walkAction) ?? this.sneakAction ?? this.runAction ?? this.walkAction
      if (locomotionAction && this.activeAction !== locomotionAction) {
        this.switchAction(locomotionAction)
      }
    } else {
      this.updateIdleCycle(deltaTime)
    }

    this.mixer?.update(deltaTime)
    // Keep root transform fixed even if clip has root-motion tracks.
    this.applyRootTransform()
    this.applyHorizontalMotionCompensation()
  }

  dispose(): void {
    this.disposed = true
    if (this.root) {
      this.scene.remove(this.root)
      this.root.traverse((node) => {
        const mesh = node as Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          materials.forEach((material) => {
            material.dispose()
          })
        }
      })
    }
    this.root = null
    this.emissiveMaterials.length = 0
    this.hasVisualPosition = false
    this.mixer = null
    this.clipActions.clear()
    this.clipNames = []
    this.debugClipIndex = -1
    this.debugForcedAction = null
    this.debugForcedReason = null
    this.debugForcedReleaseAt = 0
    this.textureSwapMaterials = []
    this.baseTexturePreset = []
    this.smileTexturePreset = null
    this.smilePresetLoading = null
    this.smileActiveUntil = 0
    this.nextRandomSmileAt = 0
    this.isSmileActive = false
    this.idleAction = null
    this.idleActions = []
    this.crouchAction = null
    this.sneakAction = null
    this.walkAction = null
    this.runAction = null
    this.jumpAction = null
    this.swimIdleAction = null
    this.swimForwardAction = null
    this.activeAction = null
    this.hipBone = null
    this.motionAnchorHipWorld = null
    this.shouldCompensateHorizontalMotion = false
    this.idleTimer = 0
    this.nextIdleSwitchTime = 1.8
    this.wasAirborne = false
    this.airborneStartY = 0
  }

  private prepareModel(modelRoot: Group): void {
    prepareAvatarModel(this, modelRoot)
  }

  private setupAnimations(modelRoot: Group, modelGltf: GLTF, animationGltf: GLTF): void {
    setupAvatarAnimations(this, modelRoot, modelGltf, animationGltf)
  }

  getClipNames(): string[] {
    return [...this.clipNames]
  }

  getCurrentClipName(): string | null {
    return this.activeAction?.getClip().name ?? null
  }

  getFacingYaw(): number | undefined {
    return this.hasAvatarYaw ? this.avatarYaw : undefined
  }

  debugCycleClip(step: number): string | null {
    return debugCycleAvatarClip(this, step)
  }

  debugSetClipByName(name: string): string | null {
    return debugSetAvatarClipByName(this, name)
  }

  debugClearClip(): void {
    debugClearAvatarClip(this)
  }

  playGreetingForDuration(durationMs: number = 2000): string | null {
    return playAvatarGreetingForDuration(this, durationMs)
  }

  playSmileExpressionForDuration(durationMs: number = 2000): boolean {
    const duration = Math.max(200, durationMs)

    if (this.smileTexturePreset) {
      this.applyTexturePreset(this.smileTexturePreset)
      this.isSmileActive = true
      this.smileActiveUntil = Date.now() + duration
      return true
    }

    void this.preloadSmileTexturePreset().then(() => {
      if (this.disposed || !this.smileTexturePreset) return
      this.applyTexturePreset(this.smileTexturePreset)
      this.isSmileActive = true
      // Guarantee full smile duration from the moment texture is actually applied.
      this.smileActiveUntil = Date.now() + duration
    })
    return true
  }

  applyTemporaryTextureAnisotropy(targetAnisotropy: number): () => void {
    return applyTemporaryTextureAnisotropy(this, targetAnisotropy)
  }

  /**
   * Returns true when camera is mostly behind avatar (back view on screen).
   */
  shouldShowBackPreview(cameraPosition: Vector3): boolean {
    return shouldShowBackPreview(this, cameraPosition)
  }

  getPreviewForwardDirection(out: Vector3): boolean {
    if (!this.root) return false
    this.root.getWorldQuaternion(this.worldQuat)
    out.set(0, 0, 1).applyQuaternion(this.worldQuat).normalize()
    return true
  }

  private clearSmileExpression(): void {
    clearSmileExpression(this)
  }
  private updateRandomSmile(): void {
    updateRandomSmile(this)
  }
  private applyTexturePreset(preset: Array<{ map: Texture | null; emissiveMap: Texture | null }>): void {
    applyTexturePreset(this, preset)
  }
  private captureTextureSwapMaterials(modelRoot: Group): void {
    captureTextureSwapMaterials(this, modelRoot)
  }

  private async preloadSmileTexturePreset(): Promise<void> {
    if (this.smileTexturePreset || this.smilePresetLoading) {
      await this.smilePresetLoading
      return
    }

    this.smilePresetLoading = (async () => {
      try {
        const smileTexture = await this.textureLoader.loadAsync(SMILE_TEXTURE_URL)
        if (this.disposed) return
        smileTexture.flipY = false
        smileTexture.colorSpace = SRGBColorSpace
        smileTexture.needsUpdate = true
        this.smileTexturePreset = this.baseTexturePreset.map((base) => ({
          map: base.map ? smileTexture : null,
          emissiveMap: base.emissiveMap ? smileTexture : base.emissiveMap,
        }))

        if (this.smileTexturePreset.length === 0) {
          console.warn('[PlayerAvatar] Smile texture preset is empty')
        } else if (this.textureSwapMaterials.length !== this.smileTexturePreset.length) {
          console.warn('[PlayerAvatar] Smile texture material count mismatch:', this.textureSwapMaterials.length, this.smileTexturePreset.length)
        }
      } catch (error) {
        console.error('[PlayerAvatar] Failed to preload smile texture preset:', error)
      } finally {
        this.smilePresetLoading = null
      }
    })()

    await this.smilePresetLoading
  }

  private applyRootTransform(): void {
    applyRootTransform(this)
  }
  private switchAction(nextAction: AnimationAction): void {
    switchAction(this, nextAction)
  }
  private applyHorizontalMotionCompensation(): void {
    applyHorizontalMotionCompensation(this)
  }
  private updateIdleCycle(deltaTime: number): void {
    updateIdleCycle(this, deltaTime)
  }
  private shouldInterruptGreeting(player: Player, intendedMoveYaw: number | null, isJumping: boolean): boolean {
    return shouldInterruptAvatarGreeting(player, intendedMoveYaw, isJumping)
  }
  private updateAirborneState(player: Player): void {
    updateAirborneState(this, player)
  }
  private shouldPlayJumpMotion(player: Player, isSwimming: boolean): boolean {
    return shouldPlayJumpMotion(this, player, isSwimming)
  }
  private updateNightBrightness(sunIntensity: number): void {
    updateNightBrightness(this, sunIntensity)
  }
  private updateVisualPosition(player: Player, deltaTime: number): void {
    updateVisualPosition(this, player, deltaTime)
  }
  private lerpAngle(current: number, target: number, t: number): number {
    return lerpAngle(current, target, t)
  }
}

export default PlayerAvatar
