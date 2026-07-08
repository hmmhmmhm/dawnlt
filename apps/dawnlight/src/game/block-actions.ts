import { type LineBasicMaterial, type LineSegments, type PerspectiveCamera, Vector3 } from 'three'
import { BlockHardness, CHUNK_SIZE } from '../constants'
import { buildChunkMesh3D, cleanupChunkMeshes, disposeMesh } from '../engine/mesh'
import { raycast, raycastFromScreenPosition } from '../engine/physics'
import { calculateChunkConnectivity, getChunkKey3D, setBlock, setBlock3D, worldToChunk3D } from '../engine/world'
import { CHUNK_Y_SIZE } from '../shared/constants'
import { BlockType } from '../types'
import { triggerHaptic } from '../utils/haptics'
import { isBasketWorldBlock } from './basket-utils'
import { type BlockActionDeps, getInteractionOrigin, getInteractionRotation } from './block-actions-interaction'
import { tryApplyFarmingAction } from './farming-block-actions'
import { getHarvestDrops } from './farming-utils'
import { resolvePlaceableBlockType } from './placement-rules'

export type { BlockActionDeps }

function getDroppedItemPosition(x: number, y: number, z: number): Vector3 {
  return new Vector3(x + 0.5, y + 0.55, z + 0.5)
}

/**
 * Rebuild a single 3D chunk section
 */
export function rebuildSingleChunk3D(cx: number, cy: number, cz: number, deps: BlockActionDeps): void {
  const { chunks3D, chunkMeshes3D, chunkConnectivity, chunkVersions, rebuildingChunks, scene, meshWorkerManager } = deps
  const key = getChunkKey3D(cx, cy, cz)

  // Skip if already rebuilding this chunk
  if (rebuildingChunks.has(key)) {
    return
  }

  const chunkData = chunks3D.get(key)
  if (!chunkData) {
    return
  }

  // Mark as rebuilding
  rebuildingChunks.add(key)

  // Increment version for this chunk
  const oldVersion = chunkVersions.get(key) ?? 0
  const newVersion = oldVersion + 1
  chunkVersions.set(key, newVersion)

  // Cancel any pending worker tasks for this chunk
  if (meshWorkerManager) {
    meshWorkerManager.cancelChunkMeshBuild(cx, cy, cz)
  }

  // Force cleanup of any stale meshes
  cleanupChunkMeshes(cx, cy, cz, scene)

  // Get old mesh reference
  const oldMeshData = chunkMeshes3D.get(key)

  // Update connectivity for this chunk
  const connectivity = calculateChunkConnectivity(chunkData)
  chunkConnectivity.set(key, connectivity)

  // Build mesh synchronously on main thread for immediate feedback
  const newMeshData = buildChunkMesh3D(cx, cy, cz, chunkData, chunks3D, scene)

  chunkMeshes3D.set(key, newMeshData)

  // Now dispose old mesh
  if (oldMeshData) {
    disposeMesh(oldMeshData, scene)
  }

  // Remove from rebuilding set
  rebuildingChunks.delete(key)
}

/**
 * Rebuild chunk and adjacent chunks if block is on boundary
 */
export function rebuildChunk3D(cx: number, cy: number, cz: number, deps: BlockActionDeps, worldX?: number, worldY?: number, worldZ?: number): void {
  // Rebuild the main chunk
  rebuildSingleChunk3D(cx, cy, cz, deps)

  // If world coordinates provided, check if we need to rebuild neighbors
  if (worldX !== undefined && worldY !== undefined && worldZ !== undefined) {
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
    const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

    // Check X boundaries
    if (localX === 0) rebuildSingleChunk3D(cx - 1, cy, cz, deps)
    if (localX === CHUNK_SIZE - 1) rebuildSingleChunk3D(cx + 1, cy, cz, deps)

    // Check Y boundaries
    if (localY === 0) rebuildSingleChunk3D(cx, cy - 1, cz, deps)
    if (localY === CHUNK_Y_SIZE - 1) rebuildSingleChunk3D(cx, cy + 1, cz, deps)

    // Check Z boundaries
    if (localZ === 0) rebuildSingleChunk3D(cx, cy, cz - 1, deps)
    if (localZ === CHUNK_SIZE - 1) rebuildSingleChunk3D(cx, cy, cz + 1, deps)
  }
}

/**
 * Place a block in the world
 */
export function placeBlock(deps: BlockActionDeps): void {
  const { camera, player, inventory, chunks, chunks3D, renderer, getGameMode } = deps
  const selectedItem = inventory.hotbar[player.selectedSlot]
  const isCreative = getGameMode() === 'creative'
  if (!isCreative && (!selectedItem || selectedItem.count <= 0)) return

  const includeWater = selectedItem?.type === BlockType.WOODEN_BUCKET
  const hit = raycast(camera, getInteractionRotation(deps), chunks, 5, chunks3D, getInteractionOrigin(deps), includeWater)
  if (!hit) return

  if (tryApplyFarmingAction(deps, hit, selectedItem ?? null, isCreative, rebuildChunk3D)) return

  const blockTypeToPlace = resolvePlaceableBlockType(selectedItem, BlockType.STONE)
  if (blockTypeToPlace === null) return

  let px: number, py: number, pz: number

  if (hit.block.type === BlockType.BUSH || hit.block.type === BlockType.RED_FLOWER || hit.block.type === BlockType.YELLOW_FLOWER || hit.block.type === BlockType.DEAD_BUSH) {
    // Replace Bush/Flowers
    px = hit.block.x
    py = hit.block.y
    pz = hit.block.z
  } else {
    // Normal placement against face
    if (!hit.previous) return
    px = hit.previous.x
    py = hit.previous.y
    pz = hit.previous.z
  }

  const playerBlockX = Math.floor(player.position.x)
  const playerBlockY = Math.floor(player.position.y)
  const playerBlockZ = Math.floor(player.position.z)

  // Check if trying to place block inside player
  if (px === playerBlockX && pz === playerBlockZ && (py === playerBlockY || py === playerBlockY + 1)) {
    return
  }

  setBlock(px, py, pz, blockTypeToPlace, chunks)
  setBlock3D(px, py, pz, blockTypeToPlace, chunks3D)

  // Only consume items in survival mode
  if (!isCreative && selectedItem) {
    selectedItem.count--
    if (selectedItem.count <= 0) {
      inventory.hotbar[player.selectedSlot] = null
    }
  }

  // Rebuild mesh for the specific 3D chunk (and neighbors if on boundary)
  const { cx, cy, cz } = worldToChunk3D(px, py, pz)
  rebuildChunk3D(cx, cy, cz, deps, px, py, pz)

  triggerHaptic()

  // Play placement SFX
  deps.onSfx?.('place', blockTypeToPlace)

  // Trigger manual shadow update for one frame
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
}

/**
 * Handle touch-based block placement event
 */
export function handleTouchPlaceBlock(event: Event, deps: BlockActionDeps): void {
  const { player, inventory, chunks, chunks3D, renderer, getGameMode } = deps
  const customEvent = event as CustomEvent<{
    x: number
    y: number
    z: number
    type: BlockType
  }>
  const { x: px, y: py, z: pz } = customEvent.detail

  const selectedItem = inventory.hotbar[player.selectedSlot]
  if (tryApplyFarmingAction(deps, { block: { x: px, y: py, z: pz, type: customEvent.detail.type }, previous: null, distance: 0 }, selectedItem ?? null, getGameMode() === 'creative', rebuildChunk3D)) return

  const blockTypeToPlace = resolvePlaceableBlockType(selectedItem, customEvent.detail.type)
  if (blockTypeToPlace === null) return
  const isCreative = getGameMode() === 'creative'

  setBlock(px, py, pz, blockTypeToPlace, chunks)
  setBlock3D(px, py, pz, blockTypeToPlace, chunks3D)

  // Only consume items in survival mode
  if (!isCreative && selectedItem) {
    selectedItem.count--
    if (selectedItem.count <= 0) {
      inventory.hotbar[player.selectedSlot] = null
    }
  }

  // Rebuild mesh for the specific 3D chunk
  const { cx, cy, cz } = worldToChunk3D(px, py, pz)
  rebuildChunk3D(cx, cy, cz, deps, px, py, pz)

  triggerHaptic()

  // Play placement SFX
  deps.onSfx?.('place', blockTypeToPlace)

  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
}

export interface BlockBreakingState {
  isBreaking: boolean
  breakProgress: number
  targetBlock: string | null
  mouseHeld: boolean
}

/**
 * Update block breaking progress
 */
export function updateBlockBreaking(state: BlockBreakingState, deps: BlockActionDeps, deltaTime: number): void {
  const { camera, chunks, chunks3D, renderer, getGameMode } = deps

  if (!state.isBreaking || !state.mouseHeld) {
    state.targetBlock = null
    state.breakProgress = 0
    return
  }

  const hit = raycast(camera, getInteractionRotation(deps), chunks, 5, chunks3D, getInteractionOrigin(deps))
  if (!hit) {
    state.targetBlock = null
    state.breakProgress = 0
    return
  }

  const currentTarget = `${hit.block.x},${hit.block.y},${hit.block.z}`
  if (state.targetBlock !== currentTarget) {
    state.targetBlock = currentTarget
    state.breakProgress = 0
  }

  const hardness = BlockHardness[hit.block.type] || 1
  if (hardness < 0) return

  const isCreative = getGameMode() === 'creative'

  // Creative mode: instant break
  if (isCreative) {
    const blockPos = { x: hit.block.x, y: hit.block.y, z: hit.block.z }

    setBlock(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR, chunks)
    setBlock3D(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR, chunks3D)

    state.breakProgress = 0
    state.targetBlock = null

    const { cx, cy, cz } = worldToChunk3D(blockPos.x, blockPos.y, blockPos.z)
    rebuildChunk3D(cx, cy, cz, deps, blockPos.x, blockPos.y, blockPos.z)
    triggerHaptic('confirm')

    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
  } else {
    // Survival mode: normal breaking with delay
    state.breakProgress += deltaTime / hardness
    if (state.breakProgress >= 1) {
      setBlock(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks)
      setBlock3D(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks3D)

      for (const drop of getHarvestDrops(hit.block.type)) {
        deps.spawnDroppedItem?.(drop.type, getDroppedItemPosition(hit.block.x, hit.block.y, hit.block.z), drop.count)
      }

      state.breakProgress = 0
      state.targetBlock = null

      const { cx, cy, cz } = worldToChunk3D(hit.block.x, hit.block.y, hit.block.z)
      rebuildChunk3D(cx, cy, cz, deps, hit.block.x, hit.block.y, hit.block.z)
      triggerHaptic('confirm')

      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
    }
  }
}

export interface BlockHighlightState {
  highlightMesh: LineSegments
  breakProgress: number
  isBreaking: boolean
}

/**
 * Update block highlight mesh
 */
export function updateBlockHighlight(state: BlockHighlightState, camera: PerspectiveCamera, playerRotation: { x: number; y: number }, chunks: Map<string, Uint8Array>, chunks3D: Map<string, Uint8Array>): void {
  const hit = raycast(camera, playerRotation, chunks, 5, chunks3D)

  if (hit) {
    state.highlightMesh.visible = true
    if (isBasketWorldBlock(hit.block.type)) {
      state.highlightMesh.position.set(hit.block.x + 0.5, hit.block.y + 0.42, hit.block.z + 0.5)
      state.highlightMesh.scale.set(0.72, 0.82, 0.72)
    } else {
      state.highlightMesh.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5)
      state.highlightMesh.scale.setScalar(1)
    }

    if (state.isBreaking && state.breakProgress > 0) {
      const scale = 1 + state.breakProgress * 0.05
      state.highlightMesh.scale.multiplyScalar(scale)
      ;(state.highlightMesh.material as LineBasicMaterial).color.setHex(state.breakProgress > 0.7 ? 0xff0000 : state.breakProgress > 0.4 ? 0xffff00 : 0x000000)
    } else {
      ;(state.highlightMesh.material as LineBasicMaterial).color.setHex(0x000000)
    }
  } else {
    state.highlightMesh.visible = false
  }
}

export interface TouchBlockBreakingState {
  blockTouchStartTimeRef: React.MutableRefObject<number>
  blockTouchPosRef: React.MutableRefObject<{ x: number; y: number } | null>
  blockTouchBreakingRef: React.MutableRefObject<boolean>
  blockTouchTargetRef: React.MutableRefObject<string | null>
  blockTouchProgressRef: React.MutableRefObject<number>
  BLOCK_TOUCH_LONG_PRESS_THRESHOLD: number
}

/**
 * Update touch-based block breaking
 */
export function updateTouchBlockBreaking(touchState: TouchBlockBreakingState, deps: BlockActionDeps, deltaTime: number): void {
  const { camera, chunks, chunks3D, renderer, getGameMode } = deps

  const touchPos = touchState.blockTouchPosRef.current
  if (!touchPos) return

  const touchDuration = Date.now() - touchState.blockTouchStartTimeRef.current

  // Only start breaking after long press threshold
  if (touchDuration < touchState.BLOCK_TOUCH_LONG_PRESS_THRESHOLD) return

  const hit = raycastFromScreenPosition(touchPos.x, touchPos.y, camera, window.innerWidth, window.innerHeight, chunks, 5, chunks3D)

  if (!hit) return

  const currentTarget = `${hit.block.x},${hit.block.y},${hit.block.z}`

  if (touchState.blockTouchTargetRef.current !== currentTarget) {
    touchState.blockTouchTargetRef.current = currentTarget
    touchState.blockTouchProgressRef.current = 0
  }

  const hardness = BlockHardness[hit.block.type] || 1
  if (hardness < 0) return

  touchState.blockTouchBreakingRef.current = true
  const isCreative = getGameMode() === 'creative'

  if (isCreative) {
    const blockPos = { x: hit.block.x, y: hit.block.y, z: hit.block.z }

    setBlock(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR, chunks)
    setBlock3D(blockPos.x, blockPos.y, blockPos.z, BlockType.AIR, chunks3D)

    touchState.blockTouchProgressRef.current = 0
    touchState.blockTouchTargetRef.current = null

    const { cx, cy, cz } = worldToChunk3D(blockPos.x, blockPos.y, blockPos.z)
    rebuildChunk3D(cx, cy, cz, deps, blockPos.x, blockPos.y, blockPos.z)
    triggerHaptic('confirm')

    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
  } else {
    touchState.blockTouchProgressRef.current += deltaTime / hardness

    if (touchState.blockTouchProgressRef.current >= 1) {
      setBlock(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks)
      setBlock3D(hit.block.x, hit.block.y, hit.block.z, BlockType.AIR, chunks3D)

      for (const drop of getHarvestDrops(hit.block.type)) {
        deps.spawnDroppedItem?.(drop.type, getDroppedItemPosition(hit.block.x, hit.block.y, hit.block.z), drop.count)
      }

      touchState.blockTouchProgressRef.current = 0
      touchState.blockTouchTargetRef.current = null

      const { cx, cy, cz } = worldToChunk3D(hit.block.x, hit.block.y, hit.block.z)
      rebuildChunk3D(cx, cy, cz, deps, hit.block.x, hit.block.y, hit.block.z)
      triggerHaptic('confirm')

      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
    }
  }
}
