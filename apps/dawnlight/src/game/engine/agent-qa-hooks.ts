import { Vector3 } from 'three'
import { CHUNK_SIZE, CHUNK_Y_SIZE, PLAYER_HEIGHT } from '../../constants'
import { raycast } from '../../engine/physics'
import { getBlock3D, getBlockIndex3D, setBlock, setBlock3D, worldToChunk3D } from '../../engine/world'
import { BlockType } from '../../types'
import { type BlockActionDeps, placeBlock, rebuildChunk3D } from '../block-actions'
import { getInteractionOrigin, getInteractionRotation } from '../block-actions-interaction'
import { FARMING_DEMO_CLEAR_HEIGHT, FARMING_DEMO_CLEAR_MARGIN, FARMING_DEMO_GROUND_MARGIN } from './agent-qa-config'
import type { GameEngine } from './game-engine'

declare global {
  interface Window {
    __DAWNLIGHT_QA__?: {
      BlockType: typeof BlockType
      setupFarmingDemo: () => { baseX: number; baseY: number; baseZ: number }
      giveFarmingItems: () => void
      getFarmingDebug: () => { rootChildren: number; modelNames: string[] }
      getBlock: (x: number, y: number, z: number) => BlockType
      getInventory: () => { selectedSlot: number; hotbar: Array<{ type: string; count: number } | null> }
      setSelectedSlot: (slot: number) => void
      setView: (pitch: number, yaw: number) => void
      setPose: (x: number, y: number, z: number, pitch: number, yaw: number) => void
      lookAt: (x: number, y: number, z: number) => void
      getRaycast: (includeWater?: boolean) => Record<string, unknown> | null
      scanNearbyFarming: (radius?: number) => Record<string, unknown>
      placeSelected: () => void
      runFarmingPlaytest: () => Record<string, unknown>
    }
  }
}

function actionDeps(engine: GameEngine): BlockActionDeps {
  return {
    camera: engine.camera,
    player: engine.player,
    inventory: engine.inventory,
    chunks: engine.chunks,
    chunks3D: engine.chunks3D,
    chunkMeshes3D: engine.chunkMeshes3D,
    chunkConnectivity: engine.chunkConnectivity,
    chunkVersions: engine.chunkVersions,
    rebuildingChunks: engine.rebuildingChunks,
    scene: engine.scene,
    renderer: engine.renderer,
    meshWorkerManager: engine.meshWorkerManager,
    getGameMode: () => engine.gameMode,
    getIsRaining: () => engine.weather === 'rain',
    spawnDroppedItem: (blockType, position, count) => engine.droppedItemSystem.spawn(blockType, position, count),
  }
}

function rebuildAt(engine: GameEngine, x: number, y: number, z: number): void {
  const { cx, cy, cz } = worldToChunk3D(x, y, z)
  rebuildChunk3D(cx, cy, cz, actionDeps(engine), x, y, z)
  engine.lodRuntime.invalidateChunk(cx, cz)
}

function put(engine: GameEngine, x: number, y: number, z: number, type: BlockType): void {
  setBlock(x, y, z, type, engine.chunks)
  setBlock3D(x, y, z, type, engine.chunks3D)
}

function rebuildRegion(engine: GameEngine, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): void {
  const min = worldToChunk3D(minX, minY, minZ)
  const max = worldToChunk3D(maxX, maxY, maxZ)
  for (let cx = min.cx; cx <= max.cx; cx++) {
    for (let cy = min.cy; cy <= max.cy; cy++) {
      for (let cz = min.cz; cz <= max.cz; cz++) {
        rebuildAt(engine, cx * CHUNK_SIZE, cy * CHUNK_Y_SIZE, cz * CHUNK_SIZE)
      }
    }
  }
}

function giveFarmingItems(engine: GameEngine): void {
  engine.inventory.hotbar[0] = { type: BlockType.WOODEN_HOE, count: 1 }
  engine.inventory.hotbar[1] = { type: BlockType.WHEAT_SEEDS, count: 16 }
  engine.inventory.hotbar[2] = { type: BlockType.RICE_SEEDS, count: 16 }
  engine.inventory.hotbar[3] = { type: BlockType.WHEAT, count: 8 }
  engine.inventory.hotbar[4] = { type: BlockType.RICE, count: 8 }
  engine.inventory.hotbar[5] = { type: BlockType.WOODEN_BUCKET, count: 2 }
  engine.inventory.hotbar[6] = { type: BlockType.WATER_BUCKET, count: 2 }
  engine.inventory.hotbar[7] = { type: BlockType.FLOUR, count: 4 }
  engine.inventory.hotbar[8] = { type: BlockType.DOUGH, count: 2 }
}

function syncCameraToPlayer(engine: GameEngine): void {
  engine.camera.position.copy(engine.player.position)
  engine.camera.position.y += PLAYER_HEIGHT * 0.9
  engine.camera.rotation.order = 'YXZ'
  engine.camera.rotation.x = engine.player.rotation.x
  engine.camera.rotation.y = engine.player.rotation.y
}

function lookAt(engine: GameEngine, x: number, y: number, z: number): void {
  syncCameraToPlayer(engine)
  const dx = x - engine.camera.position.x
  const dy = y - engine.camera.position.y
  const dz = z - engine.camera.position.z
  const distance = Math.max(0.001, Math.hypot(dx, dy, dz))
  engine.player.rotation.x = Math.asin(dy / distance)
  engine.player.rotation.y = Math.atan2(-dx, -dz)
  syncCameraToPlayer(engine)
}

export function installAgentQaHooks(engine: GameEngine): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (!params.has('agentQa')) return
  let farmingDemoOrigin: { baseX: number; baseY: number; baseZ: number } | null = null

  const setupFarmingDemo = () => {
    farmingDemoOrigin ??= {
      baseX: Math.floor(engine.player.position.x) + 6,
      baseY: Math.max(6, Math.floor(engine.player.position.y) - 1),
      baseZ: Math.floor(engine.player.position.z) - 8,
    }
    const { baseX, baseY, baseZ } = farmingDemoOrigin
    const width = 9
    const depth = 8

    for (let z = -FARMING_DEMO_CLEAR_MARGIN; z <= depth + 16; z++) {
      for (let x = -FARMING_DEMO_CLEAR_MARGIN; x <= width + FARMING_DEMO_CLEAR_MARGIN; x++) {
        for (let y = 0; y <= FARMING_DEMO_CLEAR_HEIGHT; y++) {
          put(engine, baseX + x, baseY + y, baseZ + z, BlockType.AIR)
        }
        if (x >= -FARMING_DEMO_GROUND_MARGIN && x <= width + FARMING_DEMO_GROUND_MARGIN) {
          put(engine, baseX + x, baseY - 1, baseZ + z, BlockType.STONE)
        }
      }
    }

    const rows = [
      [BlockType.GRASS, BlockType.FARMLAND_DRY, BlockType.FARMLAND_DRY, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_DRY, BlockType.FARMLAND_DRY, BlockType.GRASS, BlockType.GRASS],
      [BlockType.GRASS, BlockType.FARMLAND_DRY, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_DRY, BlockType.FARMLAND_DRY, BlockType.GRASS, BlockType.GRASS],
      [BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER],
      [BlockType.GRASS, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.WATER, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.GRASS],
      [BlockType.GRASS, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.WATER, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.GRASS],
      [BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER, BlockType.WATER],
      [BlockType.GRASS, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.FARMLAND_WET, BlockType.GRASS],
      [BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS, BlockType.GRASS],
    ]
    const plants = [
      [BlockType.WILD_WHEAT, BlockType.WHEAT_CROP_1, BlockType.WHEAT_CROP_2, BlockType.WHEAT_CROP_3, BlockType.WHEAT_CROP_4, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR],
      [BlockType.AIR, BlockType.WHEAT_CROP_1, BlockType.WHEAT_CROP_2, BlockType.WHEAT_CROP_3, BlockType.WHEAT_CROP_4, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR],
      [BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR],
      [BlockType.AIR, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.AIR, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4, BlockType.WILD_RICE],
      [BlockType.AIR, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.AIR, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4, BlockType.AIR],
      [BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR],
      [BlockType.AIR, BlockType.RICE_CROP_1, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4, BlockType.RICE_CROP_4, BlockType.WILD_RICE, BlockType.AIR],
      [BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR, BlockType.AIR],
    ]

    for (let z = 0; z < rows.length; z++) {
      for (let x = 0; x < rows[z].length; x++) {
        if (rows[z][x] === BlockType.WATER) {
          put(engine, baseX + x, baseY - 1, baseZ + z, BlockType.WATER)
          put(engine, baseX + x, baseY, baseZ + z, BlockType.AIR)
        } else {
          put(engine, baseX + x, baseY, baseZ + z, rows[z][x])
        }
        put(engine, baseX + x, baseY + 1, baseZ + z, plants[z][x])
      }
    }

    engine.droppedItemSystem.spawn(BlockType.WHEAT, new Vector3(baseX + 2.5, baseY + 1.25, baseZ + depth + 0.6), 2)
    engine.droppedItemSystem.spawn(BlockType.RICE_SEEDS, new Vector3(baseX + 5.5, baseY + 1.25, baseZ + depth + 0.6), 2)
    engine.droppedItemSystem.spawn(BlockType.WOODEN_BUCKET, new Vector3(baseX + 0.8, baseY + 1.25, baseZ + depth + 1.6), 1)
    engine.droppedItemSystem.spawn(BlockType.WATER_BUCKET, new Vector3(baseX + 2.2, baseY + 1.25, baseZ + depth + 1.6), 1)
    engine.droppedItemSystem.spawn(BlockType.FLOUR, new Vector3(baseX + 3.6, baseY + 1.25, baseZ + depth + 1.6), 1)
    engine.droppedItemSystem.spawn(BlockType.DOUGH, new Vector3(baseX + 5.0, baseY + 1.25, baseZ + depth + 1.6), 1)
    giveFarmingItems(engine)
    engine.gameMode = 'creative'
    engine.weather = 'clear'
    engine.season = 'spring'
    engine.gameTime = 600
    engine.cameraMode = 'first-person'
    engine.player.isFlying = true
    engine.player.isGrounded = false
    engine.player.position.set(baseX + 4.5, baseY + 5.8, baseZ + 10.5)
    engine.player.rotation.x = -0.72
    engine.player.rotation.y = 0
    syncCameraToPlayer(engine)
    rebuildRegion(engine, baseX - FARMING_DEMO_CLEAR_MARGIN, baseX + width + FARMING_DEMO_CLEAR_MARGIN, baseY - 1, baseY + FARMING_DEMO_CLEAR_HEIGHT, baseZ - FARMING_DEMO_CLEAR_MARGIN, baseZ + depth + 16)
    return { baseX, baseY, baseZ }
  }

  window.__DAWNLIGHT_QA__ = {
    BlockType,
    giveFarmingItems: () => giveFarmingItems(engine),
    getBlock: (x, y, z) => getBlock3D(x, y, z, engine.chunks3D),
    getInventory: () => ({
      selectedSlot: engine.player.selectedSlot,
      hotbar: engine.inventory.hotbar.map((item) => (item ? { type: BlockType[item.type], count: item.count } : null)),
    }),
    getFarmingDebug: () => {
      const root = engine.scene.getObjectByName('farming-glb-models')
      return {
        rootChildren: root?.children.length ?? -1,
        modelNames: root?.children.slice(0, 24).map((child) => child.name || child.type) ?? [],
      }
    },
    setView: (pitch, yaw) => {
      engine.player.rotation.x = pitch
      engine.player.rotation.y = yaw
    },
    setSelectedSlot: (slot) => {
      engine.player.selectedSlot = Math.max(0, Math.min(8, Math.floor(slot)))
    },
    setPose: (x, y, z, pitch, yaw) => {
      engine.gameMode = 'creative'
      engine.player.isFlying = true
      engine.player.isGrounded = false
      engine.player.position.set(x, y, z)
      engine.player.rotation.x = pitch
      engine.player.rotation.y = yaw
      syncCameraToPlayer(engine)
    },
    lookAt: (x, y, z) => lookAt(engine, x, y, z),
    getRaycast: (includeWater = false) => {
      const deps = actionDeps(engine)
      const hit = raycast(engine.camera, getInteractionRotation(deps), engine.chunks, 5, engine.chunks3D, getInteractionOrigin(deps), includeWater)
      if (!hit) return null
      return {
        block: { ...hit.block, type: BlockType[hit.block.type] },
        previous: hit.previous,
        distance: hit.distance,
      }
    },
    scanNearbyFarming: (radius = 48) => {
      const watched = new Set<BlockType>([
        BlockType.WILD_WHEAT,
        BlockType.WILD_RICE,
        BlockType.WATER,
        BlockType.FARMLAND_DRY,
        BlockType.FARMLAND_WET,
        BlockType.WHEAT_CROP_1,
        BlockType.WHEAT_CROP_2,
        BlockType.WHEAT_CROP_3,
        BlockType.WHEAT_CROP_4,
        BlockType.RICE_CROP_1,
        BlockType.RICE_CROP_2,
        BlockType.RICE_CROP_3,
        BlockType.RICE_CROP_4,
      ])
      const px = engine.player.position.x
      const py = engine.player.position.y
      const pz = engine.player.position.z
      const counts: Record<string, number> = {}
      const nearest: Record<string, { x: number; y: number; z: number; distance: number }> = {}

      for (const [key, chunk] of engine.chunks3D) {
        const [cx, cy, cz] = key.split(',').map(Number)
        for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
          const y = cy * CHUNK_Y_SIZE + localY
          if (Math.abs(y - py) > radius) continue
          for (let z = 0; z < CHUNK_SIZE; z++) {
            const worldZ = cz * CHUNK_SIZE + z
            if (Math.abs(worldZ - pz) > radius) continue
            for (let x = 0; x < CHUNK_SIZE; x++) {
              const worldX = cx * CHUNK_SIZE + x
              if (Math.abs(worldX - px) > radius) continue
              const index = getBlockIndex3D(x, localY, z)
              const type = chunk[index] as BlockType
              if (!watched.has(type)) continue
              const name = BlockType[type]
              counts[name] = (counts[name] ?? 0) + 1
              const distance = Math.hypot(worldX + 0.5 - px, y + 0.5 - py, worldZ + 0.5 - pz)
              if (!nearest[name] || distance < nearest[name].distance) {
                nearest[name] = { x: worldX, y, z: worldZ, distance: Number(distance.toFixed(2)) }
              }
            }
          }
        }
      }

      return {
        player: { x: Number(px.toFixed(2)), y: Number(py.toFixed(2)), z: Number(pz.toFixed(2)) },
        radius,
        counts,
        nearest,
      }
    },
    placeSelected: () => placeBlock(actionDeps(engine)),
    runFarmingPlaytest: () => {
      const origin = setupFarmingDemo()
      const { baseX, baseY, baseZ } = origin
      const dryX = baseX + 6
      const dryY = baseY
      const dryZ = baseZ
      const waterX = baseX + 6
      const waterY = baseY - 1
      const waterZ = baseZ + 2

      engine.gameMode = 'survival'
      engine.player.isFlying = true
      engine.player.isGrounded = false

      engine.player.position.set(baseX + 7.8, baseY + 0.45, baseZ + 2.5)
      syncCameraToPlayer(engine)

      engine.player.selectedSlot = 5
      lookAt(engine, waterX + 0.5, waterY + 0.5, waterZ + 0.5)
      const fillRay = window.__DAWNLIGHT_QA__?.getRaycast(true)
      placeBlock(actionDeps(engine))
      const afterFill = engine.inventory.hotbar.map((item) => (item ? { type: BlockType[item.type], count: item.count } : null))

      engine.player.position.set(baseX + 7.8, baseY + 0.45, baseZ + 0.5)
      syncCameraToPlayer(engine)
      engine.player.selectedSlot = 6
      lookAt(engine, dryX + 0.5, dryY + 0.5, dryZ + 0.5)
      const waterRay = window.__DAWNLIGHT_QA__?.getRaycast(true)
      placeBlock(actionDeps(engine))
      const afterWater = {
        target: BlockType[getBlock3D(dryX, dryY, dryZ, engine.chunks3D)],
        above: BlockType[getBlock3D(dryX, dryY + 1, dryZ, engine.chunks3D)],
        hotbar: engine.inventory.hotbar.map((item) => (item ? { type: BlockType[item.type], count: item.count } : null)),
      }

      engine.player.selectedSlot = 1
      lookAt(engine, dryX + 0.5, dryY + 0.5, dryZ + 0.5)
      const plantRay = window.__DAWNLIGHT_QA__?.getRaycast(true)
      placeBlock(actionDeps(engine))
      const afterPlant = {
        target: BlockType[getBlock3D(dryX, dryY, dryZ, engine.chunks3D)],
        above: BlockType[getBlock3D(dryX, dryY + 1, dryZ, engine.chunks3D)],
        hotbar: engine.inventory.hotbar.map((item) => (item ? { type: BlockType[item.type], count: item.count } : null)),
      }

      return {
        origin,
        target: { x: dryX, y: dryY, z: dryZ },
        water: { x: waterX, y: waterY, z: waterZ },
        beforeTarget: 'FARMLAND_DRY',
        fillRay,
        afterFill,
        waterRay,
        afterWater,
        plantRay,
        afterPlant,
      }
    },
    setupFarmingDemo,
  }

  if (params.get('agentQa') === 'farming') {
    const timer = window.setInterval(() => {
      if (engine.chunks3D.size <= 0) return
      setupFarmingDemo()
      window.clearInterval(timer)
    }, 300)
  }
}
