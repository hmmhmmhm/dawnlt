import type { AmbientLight, Color, DirectionalLight, HemisphereLight, LineSegments, Mesh, PerspectiveCamera, PointLight, Points, Scene, Timer, WebGLRenderer } from 'three'
import type { EffectSettings } from '../constants/effects'
import type { WorldGenerator } from '../engine/world'
import type { Season } from '../utils/textures'
import type { ChunkMeshData, Inventory, Player } from './index'

export type Weather = 'clear' | 'rain' | 'snow'

// Extended GameState for dawnlight.tsx (includes all runtime fields)
export interface DawnlightGameState {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  player: Player
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes: Map<string, ChunkMeshData>
  inventory: Inventory
  worldGen: WorldGenerator
  clock: Timer
  keys: Record<string, boolean>
  isPointerLocked: boolean
  lastSpacePress: number
  highlightMesh: LineSegments | null
  breakProgress: number
  isBreaking: boolean
  targetBlock: string | null
  mouseHeld: boolean
  frameCount: number
  lastFpsUpdate: number
  gameStarted: boolean
  gameTime: number // 0 to 1440 minutes (24 hours)
  weather: Weather
  weatherTime: number
  season: Season
  gameMode: 'survival' | 'creative'
  lastWPress: number
  isFlySprinting: boolean
  effects: EffectSettings
  // Internal state
  lastChunkX: number
  lastChunkZ: number
  chunkUpdateTimer: number
  chunkLoadQueue: ChunkLoadTask[]
  // Footstep vibration
  footstepTimer: number
  footstepInterval: number
  footstepSprintInterval: number
}

export interface ChunkLoadTask {
  cx: number
  cy: number
  cz: number
  dist: number
  priority: 'data' | 'mesh' | 'edge' | 'cache' | 'mesh-cache'
}

export interface DebugStats {
  loadedChunks: number
  activeChunks: number
  culledChunks: number
  cachedChunks: number
  cachedMeshes: number
  queueLength: number
  meshQueueSize: number
  lodEnabled?: boolean
  lodActiveSections?: number
  lodQueueSize?: number
  lodProcessingCount?: number
  lodDroppedTasks?: number
  lodUpdateMs?: number
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

// Scene objects references
export interface SceneObjects {
  sunSprite: Mesh | null
  moonSprite: Mesh | null
  stars: Points
  constellations: Points
  fireflies: Points
  fireflyLights: PointLight[]
  rainSystem: Points
  snowSystem: Points
  sky: Mesh
  highlightMesh: LineSegments
}

// Lighting references
export interface LightingRefs {
  ambientLight: AmbientLight
  directionalLight: DirectionalLight
  hemiLight: HemisphereLight
}

// Day/Night cycle colors
export interface SkyColors {
  NightTop: Color
  NightBottom: Color
  NightFog: Color
  Sunrise: Color
  DayTop: Color
  DayBottom: Color
  Sunset: Color
  SunsetBottom: Color
  SunsetTop: Color
}

export interface WaterColors {
  Night: Color
  Sunrise: Color
  Day: Color
  Evening: Color
  Sunset: Color
}
