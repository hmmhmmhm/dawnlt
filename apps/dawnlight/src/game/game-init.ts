import { ACESFilmicToneMapping, type AmbientLight, BoxGeometry, Color, type DirectionalLight, EdgesGeometry, Fog, LineBasicMaterial, LineSegments, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { CHUNK_HEIGHT, CHUNK_SIZE, PLAYER_HEIGHT, RENDER_DISTANCE, SPAWN_ROTATION_Y, SPAWN_X, SPAWN_Z } from '../constants'
import { DEFAULT_EFFECTS, USE_MESH_WORKERS } from '../constants/effects'
import { createLighting, createParticleSystems, createPostProcessing, createSkyObjects } from '../engine/scene'
import type { ChunkConnectivity } from '../engine/world'
import { getChunkKey, type WorldGenerator } from '../engine/world'
import { CHUNK_Y_SIZE } from '../shared/constants'
import { BlockType, type ChunkMeshData, type Inventory, type Player } from '../types'
import { initializeTextures } from '../utils/textures'
import { MeshWorkerManager } from '../workers/mesh-worker-manager'

// Constants
export const WORLD_SEED = 12345
export const CHUNK_CACHE_SIZE = 512
export const MESH_CACHE_SIZE = 256
export const MAX_RENDER_PIXEL_RATIO = 1.75

// Scene initialization result
export interface SceneInitResult {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
}

// Lighting initialization result
export interface LightingInitResult {
  ambientLight: AmbientLight
  directionalLight: DirectionalLight
}

// Sky objects initialization result (re-exported from scene module)
export type SkyObjectsInitResult = ReturnType<typeof createSkyObjects>

// Particle systems initialization result (re-exported from scene module)
export type ParticleSystemsInitResult = ReturnType<typeof createParticleSystems>

// Post-processing initialization result (re-exported from scene module)
export type PostProcessingInitResult = ReturnType<typeof createPostProcessing>

// Chunk management state
export interface ChunkManagementState {
  chunks: Map<string, Uint8Array>
  chunks3D: Map<string, Uint8Array>
  chunkMeshes: Map<string, ChunkMeshData>
  chunkMeshes3D: Map<string, ChunkMeshData>
  chunkDataCache: Map<string, Uint8Array>
  chunkCacheOrder: string[]
  meshCache: Map<string, ChunkMeshData>
  meshCacheOrder: string[]
  columnCache: Map<string, Uint8Array>
  chunkConnectivity: Map<string, ChunkConnectivity>
}

/**
 * Initialize Three.js scene, camera, and renderer
 */
export function initializeThreeJS(container: HTMLElement): SceneInitResult {
  const scene = new Scene()
  scene.background = new Color(0x87ceeb)
  scene.fog = new Fog(0x87ceeb, 30, RENDER_DISTANCE * CHUNK_SIZE - 20)

  const getFov = () => {
    return window.innerWidth < window.innerHeight ? 100 : 75
  }

  const camera = new PerspectiveCamera(getFov(), window.innerWidth / window.innerHeight, 0.1, 1000)

  const renderer = new WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.shadowMap.autoUpdate = true // Update every frame for consistent shadows
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  return { scene, camera, renderer }
}

/**
 * Initialize player state
 */
export function initializePlayer(): Player {
  return {
    position: new Vector3(SPAWN_X, 50, SPAWN_Z),
    velocity: new Vector3(0, 0, 0),
    rotation: { x: 0, y: SPAWN_ROTATION_Y },
    isGrounded: false,
    isFlying: false,
    isCrouching: false,
    isSneaking: false,
    selectedSlot: 0,
  }
}

/**
 * Initialize camera position based on player position
 */
export function initializeCameraPosition(camera: PerspectiveCamera, player: Player): void {
  camera.position.copy(player.position)
  camera.position.y += PLAYER_HEIGHT * 0.9
}

/**
 * Initialize default inventory
 */
export function initializeInventory(): Inventory {
  return {
    slots: new Array(36).fill(null),
    hotbar: [
      { type: BlockType.GRASS, count: 64 },
      { type: BlockType.DIRT, count: 64 },
      { type: BlockType.STONE, count: 64 },
      { type: BlockType.SAND, count: 64 },
      { type: BlockType.WOOD, count: 64 },
      { type: BlockType.LEAVES, count: 64 },
      { type: BlockType.COBBLESTONE, count: 64 },
      { type: BlockType.PLANKS, count: 64 },
      { type: BlockType.GLASS, count: 64 },
    ],
  }
}

/**
 * Initialize chunk management state
 */
export function initializeChunkManagement(): ChunkManagementState {
  return {
    chunks: new Map<string, Uint8Array>(),
    chunks3D: new Map<string, Uint8Array>(),
    chunkMeshes: new Map<string, ChunkMeshData>(),
    chunkMeshes3D: new Map<string, ChunkMeshData>(),
    chunkDataCache: new Map<string, Uint8Array>(),
    chunkCacheOrder: [],
    meshCache: new Map<string, ChunkMeshData>(),
    meshCacheOrder: [],
    columnCache: new Map<string, Uint8Array>(),
    chunkConnectivity: new Map<string, ChunkConnectivity>(),
  }
}

/**
 * Initialize mesh worker manager
 */
export function initializeMeshWorkerManager(scene: Scene): MeshWorkerManager | null {
  if (!USE_MESH_WORKERS) {
    console.log('[Dawnlight] Mesh Workers: DISABLED')
    return null
  }

  const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4)
  const manager = new MeshWorkerManager(scene, workerCount, WORLD_SEED)
  console.log(`[Dawnlight] Mesh Workers: ENABLED (${workerCount} workers)`)
  return manager
}

/**
 * Create block highlight mesh
 */
export function createHighlightMesh(scene: Scene): LineSegments {
  const highlightGeometry = new BoxGeometry(1.002, 1.002, 1.002)
  const highlightEdges = new EdgesGeometry(highlightGeometry)
  const highlightMaterial = new LineBasicMaterial({ color: 0x000000, linewidth: 2 })
  const highlightMesh = new LineSegments(highlightEdges, highlightMaterial)
  scene.add(highlightMesh)
  highlightMesh.visible = false
  return highlightMesh
}

/**
 * Generate full column chunk data (for legacy compatibility)
 */
export function createChunkDataGenerator(worldGen: WorldGenerator, columnCache: Map<string, Uint8Array>, chunks: Map<string, Uint8Array>) {
  const generateChunkDataSync = (chunkX: number, chunkZ: number): Uint8Array => {
    const columnKey = getChunkKey(chunkX, chunkZ)
    let fullColumn = columnCache.get(columnKey)
    if (!fullColumn) {
      fullColumn = worldGen.generateChunk(chunkX, chunkZ)
      columnCache.set(columnKey, fullColumn)
    }
    return fullColumn
  }

  const generateChunk3DSync = (chunkX: number, chunkY: number, chunkZ: number): Uint8Array => {
    const columnKey = getChunkKey(chunkX, chunkZ)
    let fullColumn = columnCache.get(columnKey)
    if (!fullColumn) {
      fullColumn = worldGen.generateChunk(chunkX, chunkZ)
      columnCache.set(columnKey, fullColumn)
      chunks.set(columnKey, fullColumn)
    }

    const sectionData = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
    const startY = chunkY * CHUNK_Y_SIZE

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
          const worldY = startY + localY
          if (worldY >= CHUNK_HEIGHT) {
            sectionData[x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE] = BlockType.AIR
          } else {
            const fullIndex = x + worldY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
            const sectionIndex = x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
            sectionData[sectionIndex] = fullColumn[fullIndex]
          }
        }
      }
    }

    return sectionData
  }

  return { generateChunkDataSync, generateChunk3DSync }
}

/**
 * Get time string for logging
 */
export function getTimeStr(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

// Re-export scene module functions for convenience
export { createLighting, createParticleSystems, createPostProcessing, createSkyObjects, DEFAULT_EFFECTS, initializeTextures }
