// Event handlers

// Block actions
export {
  type BlockActionDeps,
  type BlockBreakingState,
  type BlockHighlightState,
  handleTouchPlaceBlock,
  placeBlock,
  rebuildChunk3D,
  rebuildSingleChunk3D,
  type TouchBlockBreakingState,
  updateBlockBreaking,
  updateBlockHighlight,
  updateTouchBlockBreaking,
} from './block-actions'
export {
  createKeyboardHandlers,
  createMouseHandlers,
  createPointerLockHandler,
  createResizeHandler,
  createWheelHandler,
  type KeyboardHandlerDeps,
  type MouseHandlerDeps,
  type ResizeHandlerDeps,
  type WheelHandlerDeps,
} from './event-handlers'

// Game initialization
export {
  CHUNK_CACHE_SIZE,
  type ChunkManagementState,
  createChunkDataGenerator,
  createHighlightMesh,
  createLighting,
  createParticleSystems,
  createPostProcessing,
  createSkyObjects,
  DEFAULT_EFFECTS,
  getTimeStr,
  initializeCameraPosition,
  initializeChunkManagement,
  initializeInventory,
  initializeMeshWorkerManager,
  initializePlayer,
  initializeTextures,
  initializeThreeJS,
  type LightingInitResult,
  MESH_CACHE_SIZE,
  type ParticleSystemsInitResult,
  type PostProcessingInitResult,
  type SceneInitResult,
  type SkyObjectsInitResult,
  WORLD_SEED,
} from './game-init'

// Game loop updates
export {
  type FootstepState,
  type GamepadInputDeps,
  type JoystickInputDeps,
  preventCameraClipping,
  processGamepadInputFrame,
  processJoystickInputFrame,
  updateCamera,
  updateFootstepVibration,
} from './game-loop-updates'
