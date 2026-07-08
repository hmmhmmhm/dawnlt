import { Euler, type LineBasicMaterial, Vector3 } from 'three'
import { BlockHardness } from '../../constants'
import { raycast, updatePlayerPhysics } from '../../engine/physics'
import { setBlock, setBlock3D, worldToChunk3D } from '../../engine/world'
import { BlockType } from '../../types'
import { triggerFootstepVibration, triggerHaptic } from '../../utils/haptics'
import { isBasketWorldBlock } from '../basket-utils'
import { type BlockActionDeps, rebuildChunk3D } from '../block-actions'
import { getHarvestDrops } from '../farming-utils'
import { getLoopInteractionOrigin, isLoopUnderwater, updateLoopCamera, updateLoopPlayerAvatar } from './animation-loop-camera'
import type { ChunkSystem } from './chunk-system'
import { collectDebugStats } from './debug-stats'
import { type FarmingGrowthState, updateFarmingGrowth } from './farming-growth'
import type { GameEngine } from './game-engine'
import type { InputSystem } from './input-system'
import { PerfTelemetryClient } from './perf-telemetry'
import type { SceneSystem } from './scene'
import { playBreakSfx, playFootstepSfx, updateSeasideSfx, updateSwimmingSfx } from './sfx-triggers'
import type { AnimationLoopCallbacks } from './types'

export type { AnimationLoopCallbacks }

export class AnimationLoop {
  private engine: GameEngine
  private inputSystem: InputSystem
  private sceneSystem: SceneSystem
  private chunkSystem: ChunkSystem
  private callbacks: AnimationLoopCallbacks
  private animFrameId: number | null = null
  private isRunning = false
  private lastFpsTime = 0
  private fpsFrameCount = 0
  private lastFpsLogTime = 0
  private lastCullTime = 0
  private lastKnownFps = 0

  // Head bobbing state
  private bobTimer = 0
  private bobIntensity = 0 // 0~1, smoothly transitions

  // Swimming state for ambient SFX
  private wasSwimming = false
  private lastSeasideCheck = 0
  private readonly interactionOrigin = new Vector3()
  private readonly cameraTarget = new Vector3()
  private readonly desiredCameraPosition = new Vector3()
  private readonly lookDirection = new Vector3()
  private readonly cameraStep = new Vector3()
  private readonly lookEuler = new Euler(0, 0, 0, 'YXZ')
  private readonly intendedMoveDirection = new Vector3()
  private readonly cameraProbePosition = new Vector3()
  private thirdPersonDistance = 3.6
  private thirdPersonTargetY: number | null = null
  private swimAnimGraceTimer = 0
  private autoThirdPersonFallback = false
  private thirdPersonBlockedTimer = 0
  private thirdPersonRestoreTimer = 0
  private readonly perfTelemetry = new PerfTelemetryClient()
  private farmingGrowth: FarmingGrowthState = { timer: 0, tick: 0 }

  constructor(engine: GameEngine, inputSystem: InputSystem, sceneSystem: SceneSystem, chunkSystem: ChunkSystem, callbacks: AnimationLoopCallbacks = {}) {
    this.engine = engine
    this.inputSystem = inputSystem
    this.sceneSystem = sceneSystem
    this.chunkSystem = chunkSystem
    this.callbacks = callbacks
    this.keepHelperStateReferences()
    this.lastFpsTime = performance.now()
  }

  private keepHelperStateReferences(): void {
    void this.bobTimer
    void this.bobIntensity
    void this.interactionOrigin
    void this.cameraTarget
    void this.desiredCameraPosition
    void this.lookDirection
    void this.cameraStep
    void this.lookEuler
    void this.intendedMoveDirection
    void this.cameraProbePosition
    void this.thirdPersonDistance
    void this.thirdPersonTargetY
    void this.swimAnimGraceTimer
    void this.autoThirdPersonFallback
    void this.thirdPersonBlockedTimer
    void this.thirdPersonRestoreTimer
    void this.farmingGrowth
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.engine.clock.reset()
    this.tick()
  }

  stop(): void {
    this.isRunning = false
    this.perfTelemetry.dispose()
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  private tick = (timestamp?: number): void => {
    if (!this.isRunning) return

    this.animFrameId = requestAnimationFrame(this.tick)

    // EffectComposer uses multiple passes, so reset stats manually once per frame.
    this.engine.renderer.info.reset()

    // Process incremental mesh building
    if (this.engine.meshWorkerManager) {
      this.engine.meshWorkerManager.processIncrementalMeshes()
    }

    // Skip if game not started
    if (!this.engine.gameStarted) {
      this.engine.renderer.render(this.engine.scene, this.engine.camera)
      return
    }

    // Initialize firefly positions once after game starts (terrain is loaded)
    this.sceneSystem.initializeFireflyPositions()

    this.engine.clock.update(timestamp)
    const deltaTime = Math.min(this.engine.clock.getDelta(), 0.1)
    const frameStartMs = performance.now()
    const markMs = () => performance.now()

    // Process input
    this.inputSystem.processGamepadFrame()
    this.inputSystem.processJoystickFrame()
    const afterInputMs = markMs()

    // Update scene (time, weather, particles, etc.)
    const dayNightState = this.sceneSystem.update({
      deltaTime,
      camera: this.engine.camera,
      playerPosition: this.engine.player.position,
    })
    const afterSceneMs = markMs()

    // Update physics
    if (this.engine.gameStarted) {
      updatePlayerPhysics(this.engine.player, deltaTime, this.engine.keys, this.engine.chunks, this.engine.gameMode, this.engine.isFlySprinting, this.engine.chunks3D)

      // Footstep vibration & SFX
      this.updateFootstepVibration(deltaTime)

      // Swimming ambient SFX
      this.wasSwimming = updateSwimmingSfx(this.engine, this.wasSwimming)

      // Seaside ambient SFX (throttled to ~1Hz — water scan is expensive)
      const now = performance.now()
      if (now - this.lastSeasideCheck > 1000) {
        this.lastSeasideCheck = now
        updateSeasideSfx(this.engine)
      }
    }
    const afterPhysicsMs = markMs()

    // Update chunks (near first, then far LOD)
    this.chunkSystem.updateChunks(deltaTime)
    this.chunkSystem.processLoadQueue()
    const afterChunkMs = markMs()
    this.engine.lodRuntime.tick(frameStartMs)
    const afterLodMs = markMs()
    const lodApplyMs = this.engine.lodRuntime.getLastApplyResultsMs()
    const lodOtherMs = Math.max(0, afterLodMs - afterChunkMs - lodApplyMs)

    // Update block breaking
    this.updateBlockBreaking(deltaTime)
    updateFarmingGrowth(this.engine, this.farmingGrowth, deltaTime, this.rebuildChunk.bind(this))
    this.engine.droppedItemSystem.update(deltaTime, this.engine.player, this.engine.inventory)
    this.engine.treeFruitModelSystem.update(deltaTime, this.engine.chunks3D)
    this.engine.basketModelSystem.update(deltaTime, this.engine.chunks3D)
    this.engine.farmingModelSystem.update(deltaTime, this.engine.chunks3D, this.engine.player.position)

    // Update block highlight
    this.updateBlockHighlight()
    const afterInteractionMs = markMs()

    // Update camera
    updateLoopCamera(this, deltaTime)
    updateLoopPlayerAvatar(this, deltaTime, dayNightState.sunIntensity)
    const afterCameraMs = markMs()

    // Check underwater effect
    const isUnderwater = isLoopUnderwater(this)

    // Apply post-processing effects
    this.sceneSystem.applyPostProcessingEffects(this.engine.effects, dayNightState.sunIntensity, isUnderwater, this.engine.gameTime)

    // Throttled chunk visibility culling
    this.updateChunkCulling()
    const afterCullingMs = markMs()

    // Render
    this.sceneSystem.render()
    const afterRenderMs = markMs()
    this.perfTelemetry.recordFrame({
      inputMs: afterInputMs - frameStartMs,
      sceneMs: afterSceneMs - afterInputMs,
      physicsMs: afterPhysicsMs - afterSceneMs,
      chunkMs: afterChunkMs - afterPhysicsMs,
      lodMs: afterLodMs - afterChunkMs,
      lodApplyMs,
      lodOtherMs,
      interactionMs: afterInteractionMs - afterLodMs,
      cameraMs: afterCameraMs - afterInteractionMs,
      cullingMs: afterCullingMs - afterCameraMs,
      renderMs: afterRenderMs - afterCullingMs,
      totalMs: afterRenderMs - frameStartMs,
    })

    // Update FPS/debug after render so renderer.info draw-call stats are current
    this.updateFps(deltaTime)
  }

  private updateFps(deltaTime: number): void {
    this.fpsFrameCount++
    const now = performance.now()

    if (now - this.lastFpsTime >= 1000) {
      const fps = this.fpsFrameCount
      this.lastKnownFps = fps
      this.callbacks.onFpsUpdate?.(fps)

      // Update debug stats
      this.updateDebugStats(deltaTime)

      // Update minimap
      this.callbacks.onMinimapUpdate?.({
        playerX: this.engine.player.position.x,
        playerZ: this.engine.player.position.z,
        playerRotation: this.engine.player.rotation.y,
        worldGen: this.engine.worldGen,
      })

      this.fpsFrameCount = 0
      this.lastFpsTime = now
    }

    // Log FPS every 5 seconds
    if (now - this.lastFpsLogTime >= 5000 && this.callbacks.isDebugLoggingEnabled?.()) {
      this.lastFpsLogTime = now
      const stats = collectDebugStats(this.engine, deltaTime)
      const fps = this.lastKnownFps > 0 ? this.lastKnownFps : this.fpsFrameCount
      console.log(`DEBUG CHUNK distance=${this.engine.renderDistance} chunks loaded=${stats.loadedChunks} active=${stats.activeChunks} meshes=${stats.visibleMeshes} fps=${fps}`)
    }
  }

  private updateDebugStats(deltaTime: number): void {
    this.callbacks.onDebugStatsUpdate?.(collectDebugStats(this.engine, deltaTime))
  }

  private updateFootstepVibration(deltaTime: number): void {
    const isMoving = this.engine.keys.KeyW || this.engine.keys.KeyS || this.engine.keys.KeyA || this.engine.keys.KeyD
    const isSprinting = this.engine.keys.ShiftLeft && isMoving
    const isSilentSneak = this.engine.player.isSneaking && !this.engine.keys.ShiftLeft
    const canTriggerFootstep = this.engine.player.isGrounded && isMoving && !this.engine.player.isFlying && !isSilentSneak

    if (canTriggerFootstep) {
      this.engine.footstepTimer += deltaTime
      const interval = isSprinting ? this.engine.footstepSprintInterval : this.engine.footstepInterval

      if (this.engine.footstepTimer >= interval) {
        this.engine.footstepTimer = 0
        triggerFootstepVibration(isSprinting)
        // Play footstep SFX based on block under player
        playFootstepSfx(this.engine)
      }
    } else if (!isMoving || this.engine.player.isFlying || isSilentSneak) {
      // Only reset timer when truly stopped or flying.
      // Keep timer alive when moving but briefly airborne (e.g. going down stairs).
      this.engine.footstepTimer = 0
    }
  }

  private updateBlockBreaking(deltaTime: number): void {
    const { camera, chunks, chunks3D, renderer } = this.engine

    if (!this.engine.isBreaking || !this.engine.mouseHeld) {
      this.engine.targetBlock = null
      this.engine.breakProgress = 0
      return
    }

    const interactionRotation = this.getInteractionRotation()
    const hit = raycast(camera, interactionRotation, chunks, 5, chunks3D, getLoopInteractionOrigin(this))
    if (!hit) {
      this.engine.targetBlock = null
      this.engine.breakProgress = 0
      return
    }

    const currentTarget = `${hit.block.x},${hit.block.y},${hit.block.z}`
    if (this.engine.targetBlock !== currentTarget) {
      this.engine.targetBlock = currentTarget
      this.engine.breakProgress = 0
    }

    const hardness = BlockHardness[hit.block.type] || 1
    if (hardness < 0) return // Unbreakable

    if (this.engine.gameMode === 'creative') {
      // Instant break in creative
      const brokenType = hit.block.type
      const { cx, cy, cz } = worldToChunk3D(hit.block.x, hit.block.y, hit.block.z)

      setBlock(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks)
      setBlock3D(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks3D)

      this.engine.breakProgress = 0
      this.engine.targetBlock = null

      this.rebuildChunk(cx, cy, cz, hit.block.x, hit.block.y, hit.block.z)
      playBreakSfx(this.engine, brokenType)
      triggerHaptic('confirm')

      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
    } else {
      // Survival mode: gradual breaking
      this.engine.breakProgress += deltaTime / hardness

      if (this.engine.breakProgress >= 1) {
        const brokenType = hit.block.type
        setBlock(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks)
        setBlock3D(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks3D)

        const dropPosition = new Vector3(hit.block.x + 0.5, hit.block.y + 0.55, hit.block.z + 0.5)
        for (const drop of getHarvestDrops(hit.block.type)) {
          this.engine.droppedItemSystem.spawn(drop.type, dropPosition, drop.count)
        }

        this.engine.breakProgress = 0
        this.engine.targetBlock = null

        const { cx, cy, cz } = worldToChunk3D(hit.block.x, hit.block.y, hit.block.z)
        this.rebuildChunk(cx, cy, cz, hit.block.x, hit.block.y, hit.block.z)
        playBreakSfx(this.engine, brokenType)
        triggerHaptic('confirm')

        renderer.shadowMap.autoUpdate = false
        renderer.shadowMap.needsUpdate = true
      }
    }
  }

  private rebuildChunk(cx: number, cy: number, cz: number, worldX?: number, worldY?: number, worldZ?: number): void {
    const deps: BlockActionDeps = {
      camera: this.engine.camera,
      player: this.engine.player,
      inventory: this.engine.inventory,
      chunks: this.engine.chunks,
      chunks3D: this.engine.chunks3D,
      chunkMeshes3D: this.engine.chunkMeshes3D,
      chunkConnectivity: this.engine.chunkConnectivity,
      chunkVersions: this.engine.chunkVersions,
      rebuildingChunks: this.engine.rebuildingChunks,
      scene: this.engine.scene,
      renderer: this.engine.renderer,
      meshWorkerManager: this.engine.meshWorkerManager,
      getGameMode: () => this.engine.gameMode,
    }

    // Use synchronous rebuild for immediate feedback
    rebuildChunk3D(cx, cy, cz, deps, worldX, worldY, worldZ)
    this.engine.lodRuntime.invalidateChunk(cx, cz)
  }

  private updateBlockHighlight(): void {
    const { camera, chunks, chunks3D, highlightMesh } = this.engine

    if (!highlightMesh) return

    const interactionRotation = this.getInteractionRotation()
    const hit = raycast(camera, interactionRotation, chunks, 5, chunks3D, getLoopInteractionOrigin(this))

    if (hit) {
      highlightMesh.visible = true
      if (isBasketWorldBlock(hit.block.type)) {
        highlightMesh.position.set(hit.block.x + 0.5, hit.block.y + 0.42, hit.block.z + 0.5)
        highlightMesh.scale.set(0.72, 0.82, 0.72)
      } else {
        highlightMesh.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5)
        highlightMesh.scale.setScalar(1)
      }

      if (this.engine.isBreaking && this.engine.breakProgress > 0) {
        const scale = 1 + this.engine.breakProgress * 0.05
        highlightMesh.scale.multiplyScalar(scale)
        ;(highlightMesh.material as LineBasicMaterial).color.setHex(this.engine.breakProgress > 0.7 ? 0xff0000 : this.engine.breakProgress > 0.4 ? 0xffff00 : 0x000000)
      } else {
        ;(highlightMesh.material as LineBasicMaterial).color.setHex(0x000000)
      }
    } else {
      highlightMesh.visible = false
    }
  }

  private updateChunkCulling(): void {
    const now = performance.now()
    if (now - this.lastCullTime < 33) return // Throttle to ~30Hz for faster visibility recovery
    this.lastCullTime = now

    this.chunkSystem.updateAllChunksVisibility(this.engine.camera)
  }

  private getInteractionRotation(): { x: number; y: number } {
    if (this.engine.cameraMode === 'third-person') {
      const avatarYaw = this.engine.playerAvatar.getFacingYaw()
      if (avatarYaw !== undefined) {
        return { x: this.engine.player.rotation.x, y: avatarYaw + Math.PI }
      }
    }
    return this.engine.player.rotation
  }
}

export default AnimationLoop
