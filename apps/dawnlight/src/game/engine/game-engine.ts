/**
 * GameEngine - Main class managing core game state and lifecycle
 */
import { type AmbientLight, type DirectionalLight, type Fog, type LineSegments, type Mesh, type PerspectiveCamera, type PointLight, type Points, type Scene, type ShaderMaterial, Timer, type WebGLRenderer } from 'three'
import { CHUNK_SIZE, PLAYER_HEIGHT, RENDER_DISTANCE } from '../../constants'
import { DEFAULT_EFFECTS, type EffectSettings, USE_MESH_WORKERS } from '../../constants/effects'
import type { ShootingStarSystem } from '../../engine/scene'
import { createLighting, createParticleSystems, createPostProcessing, createShootingStars, createSkyObjects } from '../../engine/scene'
import { getRandomStartingGameTime } from '../../engine/systems/day-night-cycle'
import { type ChunkConnectivity, WorldGenerator } from '../../engine/world'
import type { ChunkMeshData, GameMode, Inventory, Player } from '../../types'
import type { Weather } from '../../types/game-state'
import type { Season } from '../../utils/textures'
import { initializeTextures } from '../../utils/textures'
import { MeshWorkerManager } from '../../workers/mesh-worker-manager'
import { installAgentQaHooks } from './agent-qa-hooks'
import { BasketModelSystem } from './basket-model-system'
import { DEFAULT_CAMERA_MODE } from './camera-mode'
import { DroppedItemSystem } from './dropped-items'
import { FarmingModelSystem } from './farming-model-system'
import { createInitialInventory, createInitialPlayer } from './game-engine-factories'
import { createHighlightMesh, initializeThreeJS } from './game-engine-rendering'
import { GeneratedModelPreview } from './generated-model-preview'
import { resolveGeneratedModelPreviewConfig } from './generated-model-preview-config'
import { LodRuntime } from './lod/lod-runtime'
import { type CameraMode, PlayerAvatar } from './player-avatar'
import type { SfxManager } from './sfx-manager'
import { TreeFruitModelSystem } from './tree-fruit-model-system'
import type { ChunkLoadTask, DebugStats, GameEngineCallbacks, GameEngineState, MinimapData } from './types'

export type { CameraMode, ChunkLoadTask, DebugStats, GameEngineCallbacks, GameEngineState, MinimapData }

const WORLD_SEED = 12345

export class GameEngine {
  // Core Three.js objects
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer

  // Lighting
  ambientLight: AmbientLight
  directionalLight: DirectionalLight

  // Sky objects
  sunSprite: Mesh | null
  moonSprite: Mesh | null
  stars: Points
  constellations: Points
  sky: Mesh
  skyMaterial: ShaderMaterial

  // Particle systems
  fireflies: Points
  fireflyData: {
    positions: Float32Array
    basePositions: Float32Array
    phases: Float32Array
  }
  fireflyLights: PointLight[]
  rainSystem: Points
  rainVelocities: Float32Array
  snowSystem: Points
  snowVelocities: Float32Array
  shootingStarSystem: ShootingStarSystem

  // Post-processing
  postProcessing: ReturnType<typeof createPostProcessing>

  // Game objects
  player: Player
  inventory: Inventory
  worldGen: WorldGenerator
  droppedItemSystem: DroppedItemSystem

  // Chunk data
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes: Map<string, ChunkMeshData>
  chunkMeshes3D: Map<string, ChunkMeshData>

  // Chunk cache (LRU)
  chunkDataCache: Map<string, Uint8Array>
  chunkCacheOrder: string[]
  meshCache: Map<string, ChunkMeshData>
  meshCacheOrder: string[]
  columnCache: Map<string, Uint8Array>
  chunkConnectivity: Map<string, ChunkConnectivity>
  chunkVersions: Map<string, number>
  rebuildingChunks: Set<string>

  // Mesh worker
  meshWorkerManager: MeshWorkerManager | null
  lodRuntime: LodRuntime

  // Game state
  gameTime: number = getRandomStartingGameTime()
  weather: Weather = 'clear'
  weatherTime: number = 600
  season: Season = 'spring'
  gameMode: GameMode = 'survival'
  effects: EffectSettings
  renderDistance: number = RENDER_DISTANCE // Dynamic render distance (default: 8)

  // Input state
  keys: Record<string, boolean> = {}
  isPointerLocked: boolean = false
  mouseHeld: boolean = false

  // Block interaction
  isBreaking: boolean = false
  breakProgress: number = 0
  targetBlock: string | null = null
  highlightMesh: LineSegments | null = null
  cameraMode: CameraMode = DEFAULT_CAMERA_MODE
  thirdPersonZoomPreset: 1 | 2 | 3 = 3
  readonly thirdPersonDistancePresets = [3.6, 4.8, 6.2] as const
  playerAvatar: PlayerAvatar
  generatedModelPreview: GeneratedModelPreview | null = null
  treeFruitModelSystem: TreeFruitModelSystem
  basketModelSystem: BasketModelSystem
  farmingModelSystem: FarmingModelSystem

  // Flying state
  lastSpacePress: number = 0
  lastWPress: number = 0
  isFlySprinting: boolean = false

  // Timing
  clock: Timer
  gameStarted: boolean = false

  // Chunk management state
  lastChunkX: number = 0
  lastChunkY: number = 0
  lastChunkZ: number = 0
  chunkUpdateTimer: number = 0
  chunkLoadQueue: ChunkLoadTask[] = []

  // Footstep state
  footstepTimer: number = 0
  footstepInterval: number = 0.48
  footstepSprintInterval: number = 0.288
  /** SFX manager (assigned by useSfx hook) */
  sfxManager: SfxManager | null = null

  // Animation
  private animFrameId: number | null = null
  private isDisposed: boolean = false

  // Callbacks
  private callbacks: GameEngineCallbacks

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks = {}) {
    this.callbacks = callbacks
    this.effects = { ...DEFAULT_EFFECTS }
    this.clock = new Timer()
    this.clock.connect(document)

    // Initialize Three.js
    const { scene, camera, renderer } = initializeThreeJS(container, this.renderDistance)
    this.scene = scene
    this.camera = camera
    this.renderer = renderer

    // Initialize lighting
    const { ambientLight, directionalLight } = createLighting(scene)
    this.ambientLight = ambientLight
    this.directionalLight = directionalLight

    // Initialize sky objects
    const skyObjects = createSkyObjects(scene)
    this.sunSprite = skyObjects.sunSprite
    this.moonSprite = skyObjects.moonSprite
    this.stars = skyObjects.stars
    this.constellations = skyObjects.constellations
    this.sky = skyObjects.sky
    this.skyMaterial = skyObjects.skyMaterial

    // Initialize particle systems
    const particles = createParticleSystems(scene)
    this.fireflies = particles.fireflies
    this.fireflyData = particles.fireflyData
    this.fireflyLights = particles.fireflyLights
    this.rainSystem = particles.rainSystem
    this.rainVelocities = particles.rainVelocities
    this.snowSystem = particles.snowSystem
    this.snowVelocities = particles.snowVelocities

    // Initialize shooting star system
    this.shootingStarSystem = createShootingStars(scene)

    // Initialize post-processing
    this.postProcessing = createPostProcessing(renderer, scene, camera)

    // Initialize textures
    initializeTextures()

    // Initialize player
    this.player = createInitialPlayer()
    camera.position.copy(this.player.position)
    camera.position.y += PLAYER_HEIGHT * 0.9

    // Initialize camera rotation to match player rotation
    camera.rotation.order = 'YXZ'
    camera.rotation.y = this.player.rotation.y
    camera.rotation.x = this.player.rotation.x

    // Initialize inventory
    this.inventory = createInitialInventory()
    this.droppedItemSystem = new DroppedItemSystem(this.scene)

    // Initialize world generator
    this.worldGen = new WorldGenerator(WORLD_SEED)

    // Initialize chunk storage
    this.chunks = new Map()
    this.chunks3D = new Map()
    this.chunkMeshes = new Map()
    this.chunkMeshes3D = new Map()
    this.chunkDataCache = new Map()
    this.chunkCacheOrder = []
    this.meshCache = new Map()
    this.meshCacheOrder = []
    this.columnCache = new Map()
    this.chunkConnectivity = new Map()
    this.chunkVersions = new Map()
    this.rebuildingChunks = new Set()

    // Initialize mesh worker manager
    this.meshWorkerManager = this.initializeMeshWorkerManager()
    this.lodRuntime = new LodRuntime(this)

    // Create highlight mesh
    this.highlightMesh = createHighlightMesh(this.scene)
    this.playerAvatar = new PlayerAvatar(this.scene)
    void this.playerAvatar.load()
    this.treeFruitModelSystem = new TreeFruitModelSystem(this.scene)
    void this.treeFruitModelSystem.load()
    this.basketModelSystem = new BasketModelSystem(this.scene)
    void this.basketModelSystem.load()
    this.farmingModelSystem = new FarmingModelSystem(this.scene)
    void this.farmingModelSystem.load()
    installAgentQaHooks(this)
    const previewConfig = resolveGeneratedModelPreviewConfig(globalThis.location?.search ?? '')
    if (previewConfig) {
      this.generatedModelPreview = new GeneratedModelPreview(this.scene, previewConfig)
      void this.generatedModelPreview.load()
    }

    console.log(`[GameEngine] Initialized with ${this.meshWorkerManager ? 'WORKERS' : 'CPU'} mode`)
  }

  private initializeMeshWorkerManager(): MeshWorkerManager | null {
    if (!USE_MESH_WORKERS) {
      console.log('[GameEngine] Mesh Workers: DISABLED')
      return null
    }
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('agentQa')) {
      console.log('[GameEngine] Mesh Workers: DISABLED for agent QA')
      return null
    }

    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4)
    const manager = new MeshWorkerManager(this.scene, workerCount, WORLD_SEED)
    console.log(`[GameEngine] Mesh Workers: ENABLED (${workerCount} workers)`)
    return manager
  }
  /**
   * Set render distance and update fog accordingly
   */
  setRenderDistance(distance: number): void {
    this.renderDistance = distance
    // Update fog distance
    if (this.scene.fog) {
      const fog = this.scene.fog as Fog
      fog.far = distance * CHUNK_SIZE - 20
    }
    // Force chunk re-evaluation by resetting last chunk position
    this.lastChunkX = -999
    this.lastChunkY = -999
    this.lastChunkZ = -999
  }

  toggleCameraMode(): void {
    this.cameraMode = this.cameraMode === 'first-person' ? 'third-person' : 'first-person'
    if (this.cameraMode === 'third-person') {
      this.thirdPersonZoomPreset = 3
    }
    console.log(`[Camera] Mode: ${this.cameraMode}`)
  }

  getThirdPersonDesiredDistance(): number {
    return this.thirdPersonDistancePresets[2]
  }

  /**
   * Load initial chunks
   */
  async loadInitialChunks(): Promise<void> {
    // This will be implemented in ChunkSystem
    this.callbacks.onLoadingProgress?.(100, 'Done!')
    this.callbacks.onLoadingComplete?.()
    this.gameStarted = true
  }

  /** Start the game */
  start(): void {
    if (this.animFrameId !== null) return
    this.clock.reset()
  }

  /** Stop the game */
  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true

    console.log('[GameEngine] Disposing...')

    this.stop()

    // Cleanup mesh worker manager
    if (this.meshWorkerManager) {
      this.meshWorkerManager.dispose()
    }
    this.lodRuntime.dispose()
    this.droppedItemSystem.dispose()
    this.playerAvatar.dispose()
    this.generatedModelPreview?.dispose()
    this.treeFruitModelSystem.dispose()
    this.basketModelSystem.dispose()
    this.farmingModelSystem.dispose()
    this.clock.dispose()

    // Dispose chunk meshes
    this.chunkMeshes3D.forEach((meshData) => {
      if (meshData.solid) {
        this.scene.remove(meshData.solid)
        meshData.solid.geometry.dispose()
      }
      if (meshData.transparent) {
        this.scene.remove(meshData.transparent)
        meshData.transparent.geometry.dispose()
      }
      if (meshData.foliage) {
        this.scene.remove(meshData.foliage)
        meshData.foliage.geometry.dispose()
      }
      if (meshData.fluid) {
        this.scene.remove(meshData.fluid)
        meshData.fluid.geometry.dispose()
      }
    })

    // Dispose cached meshes
    this.meshCache.forEach((meshData) => {
      if (meshData.solid) meshData.solid.geometry.dispose()
      if (meshData.transparent) meshData.transparent.geometry.dispose()
      if (meshData.foliage) meshData.foliage.geometry.dispose()
      if (meshData.fluid) meshData.fluid.geometry.dispose()
    })

    // Dispose renderer
    this.renderer.dispose()
    this.renderer.domElement.parentElement?.removeChild(this.renderer.domElement)

    console.log('[GameEngine] Disposed')
  }

  /**
   * Return game state in externally accessible form
   */
  getState(): GameEngineState {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      player: this.player,
      inventory: this.inventory,
      worldGen: this.worldGen,
      gameTime: this.gameTime,
      weather: this.weather,
      weatherTime: this.weatherTime,
      season: this.season,
      gameMode: this.gameMode,
      effects: this.effects,
      keys: this.keys,
      isPointerLocked: this.isPointerLocked,
      mouseHeld: this.mouseHeld,
      isBreaking: this.isBreaking,
      breakProgress: this.breakProgress,
      targetBlock: this.targetBlock,
      highlightMesh: this.highlightMesh,
      cameraMode: this.cameraMode,
      thirdPersonZoomPreset: this.thirdPersonZoomPreset,
      lastSpacePress: this.lastSpacePress,
      lastWPress: this.lastWPress,
      isFlySprinting: this.isFlySprinting,
      clock: this.clock,
      gameStarted: this.gameStarted,
      lastChunkX: this.lastChunkX,
      lastChunkY: this.lastChunkY,
      lastChunkZ: this.lastChunkZ,
      chunkUpdateTimer: this.chunkUpdateTimer,
      chunkLoadQueue: this.chunkLoadQueue,
      footstepTimer: this.footstepTimer,
      footstepInterval: this.footstepInterval,
      footstepSprintInterval: this.footstepSprintInterval,
    }
  }
}

export default GameEngine
