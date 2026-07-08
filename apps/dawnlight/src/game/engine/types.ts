/**
 * Game Engine Types - Common type definitions
 */
import type { LineSegments, PerspectiveCamera, Scene, Timer, Vector3, WebGLRenderer } from 'three'
import type { EffectSettings } from '../../constants/effects'
import type { WorldGenerator } from '../../engine/world'
import type { GameMode, Inventory, Player } from '../../types'
import type { Weather } from '../../types/game-state'
import type { Season } from '../../utils/textures'
import type { CameraMode } from './player-avatar'

export interface GameEngineCallbacks {
  onLoadingProgress?: (progress: number, message: string) => void
  onLoadingComplete?: () => void
  onFpsUpdate?: (fps: number) => void
  onDebugStatsUpdate?: (stats: DebugStats) => void
  onMinimapUpdate?: (data: MinimapData) => void
  onGameStateChange?: () => void
}

export interface DebugStats {
  loadedChunks: number
  activeChunks: number
  culledChunks: number
  cachedChunks: number
  cachedMeshes: number
  queueLength: number
  meshQueueSize: number
  lodEnabled: boolean
  lodActiveSections: number
  lodQueueSize: number
  lodProcessingCount: number
  lodDroppedTasks: number
  lodUpdateMs: number
  lodLoadedSections?: number
  visibleMeshes: number
  totalFaces: number
  isLoading: boolean
  playerChunkX: number
  playerChunkZ: number
  frameTime: number
  drawCalls: number
  triangles: number
  workerCount: number
  busyWorkers: number
  pendingTasks: number
  chunkMemory: number
  meshMemory: number
  totalMemory: number
}

export interface MinimapData {
  playerX: number
  playerZ: number
  playerRotation: number
  worldGen: WorldGenerator | null
}

export interface ChunkLoadTask {
  cx: number
  cy: number
  cz: number
  dist: number
  priority: 'data' | 'mesh' | 'edge' | 'cache' | 'mesh-cache'
}

export interface GameEngineState {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  player: Player
  inventory: Inventory
  worldGen: WorldGenerator
  gameTime: number
  weather: Weather
  weatherTime: number
  season: Season
  gameMode: GameMode
  effects: EffectSettings
  keys: Record<string, boolean>
  isPointerLocked: boolean
  mouseHeld: boolean
  isBreaking: boolean
  breakProgress: number
  targetBlock: string | null
  highlightMesh: LineSegments | null
  cameraMode: CameraMode
  thirdPersonZoomPreset: 1 | 2 | 3
  lastSpacePress: number
  lastWPress: number
  isFlySprinting: boolean
  clock: Timer
  gameStarted: boolean
  lastChunkX: number
  lastChunkY: number
  lastChunkZ: number
  chunkUpdateTimer: number
  chunkLoadQueue: ChunkLoadTask[]
  footstepTimer: number
  footstepInterval: number
  footstepSprintInterval: number
}

export interface ChunkLoadingCallbacks {
  onLoadingProgress?: (progress: number, message: string) => void
  onLoadingComplete?: () => void
}

export interface InputCallbacks {
  onSelectedSlotChange?: (slot: number) => void
  onChatOpen?: (initialValue: string) => void
  onPlaceBlock?: () => void
  onCaptureScreenshot?: () => void
  onGamepadConnected?: () => void
  onGamepadDisconnected?: () => void
}

export interface SceneUpdateContext {
  deltaTime: number
  camera: PerspectiveCamera
  playerPosition: Vector3
}

export interface AnimationLoopCallbacks {
  onFpsUpdate?: (fps: number) => void
  onDebugStatsUpdate?: (stats: DebugStats) => void
  onMinimapUpdate?: (data: MinimapData) => void
  isDebugLoggingEnabled?: () => boolean
}
