import { getBlock3D, getBlockIndex3D, getChunkKey3D, worldToChunk3D } from '../engine/world'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../shared/constants'
import { BlockType, type InventoryItem } from '../types'

export interface FarmingPlacementContext {
  hasNearbyWater: boolean
  isRaining: boolean
}

export type FarmingPlacementAction =
  | {
      kind: 'till'
      blockType: BlockType.FARMLAND_DRY | BlockType.FARMLAND_WET
      consumeSelected: false
    }
  | {
      kind: 'plant'
      blockType: BlockType.WHEAT_CROP_1 | BlockType.RICE_CROP_1
      consumeSelected: true
    }
  | {
      kind: 'water'
      blockType: BlockType.FARMLAND_WET
      selectedType: BlockType.WOODEN_BUCKET
      consumeSelected: true
    }
  | {
      kind: 'transform-selected'
      selectedType: BlockType.WATER_BUCKET
      consumeSelected: true
    }
  | { kind: 'none' }

export interface HarvestDrop {
  type: BlockType
  count: number
}

export interface CropGrowthChange {
  x: number
  y: number
  z: number
  from: BlockType
  to: BlockType
}

export function isSeedItem(type: BlockType): boolean {
  return type === BlockType.WHEAT_SEEDS || type === BlockType.RICE_SEEDS
}

export function isFarmingItemOnly(type: BlockType): boolean {
  return (
    type === BlockType.WHEAT_SEEDS ||
    type === BlockType.RICE_SEEDS ||
    type === BlockType.WHEAT ||
    type === BlockType.RICE ||
    type === BlockType.WOODEN_HOE ||
    type === BlockType.WOODEN_BUCKET ||
    type === BlockType.WATER_BUCKET ||
    type === BlockType.BREAD ||
    type === BlockType.RICE_BOWL ||
    type === BlockType.FLOUR ||
    type === BlockType.DOUGH
  )
}

export function isFarmlandBlock(type: BlockType): boolean {
  return type === BlockType.FARMLAND_DRY || type === BlockType.FARMLAND_WET
}

export function isCropBlock(type: BlockType): boolean {
  return type === BlockType.WHEAT_CROP_1 || type === BlockType.WHEAT_CROP_2 || type === BlockType.WHEAT_CROP_3 || type === BlockType.WHEAT_CROP_4 || type === BlockType.RICE_CROP_1 || type === BlockType.RICE_CROP_2 || type === BlockType.RICE_CROP_3 || type === BlockType.RICE_CROP_4
}

export function isWildCropBlock(type: BlockType): boolean {
  return type === BlockType.WILD_WHEAT || type === BlockType.WILD_RICE
}

export function cropForSeed(type: BlockType): BlockType.WHEAT_CROP_1 | BlockType.RICE_CROP_1 | null {
  if (type === BlockType.WHEAT_SEEDS) return BlockType.WHEAT_CROP_1
  if (type === BlockType.RICE_SEEDS) return BlockType.RICE_CROP_1
  return null
}

export function resolveFarmingPlacement(targetBlock: BlockType, selectedItem: InventoryItem | null | undefined, blockAbove: BlockType, context: FarmingPlacementContext): FarmingPlacementAction {
  if (!selectedItem || selectedItem.count <= 0) return { kind: 'none' }

  if (selectedItem.type === BlockType.WOODEN_HOE) {
    if (targetBlock !== BlockType.GRASS && targetBlock !== BlockType.DIRT) return { kind: 'none' }
    return {
      kind: 'till',
      blockType: context.hasNearbyWater || context.isRaining ? BlockType.FARMLAND_WET : BlockType.FARMLAND_DRY,
      consumeSelected: false,
    }
  }

  if (selectedItem.type === BlockType.WOODEN_BUCKET) {
    if (targetBlock !== BlockType.WATER) return { kind: 'none' }
    return {
      kind: 'transform-selected',
      selectedType: BlockType.WATER_BUCKET,
      consumeSelected: true,
    }
  }

  if (selectedItem.type === BlockType.WATER_BUCKET) {
    if (targetBlock !== BlockType.FARMLAND_DRY) return { kind: 'none' }
    return {
      kind: 'water',
      blockType: BlockType.FARMLAND_WET,
      selectedType: BlockType.WOODEN_BUCKET,
      consumeSelected: true,
    }
  }

  const crop = cropForSeed(selectedItem.type)
  if (!crop || !isFarmlandBlock(targetBlock) || blockAbove !== BlockType.AIR) return { kind: 'none' }
  if (selectedItem.type === BlockType.RICE_SEEDS && targetBlock !== BlockType.FARMLAND_WET) return { kind: 'none' }
  return { kind: 'plant', blockType: crop, consumeSelected: true }
}

export function getHarvestDrops(block: BlockType): HarvestDrop[] {
  switch (block) {
    case BlockType.WILD_WHEAT:
      return [
        { type: BlockType.WHEAT, count: 1 },
        { type: BlockType.WHEAT_SEEDS, count: 1 },
      ]
    case BlockType.WILD_RICE:
      return [
        { type: BlockType.RICE, count: 1 },
        { type: BlockType.RICE_SEEDS, count: 1 },
      ]
    case BlockType.WHEAT_CROP_1:
    case BlockType.WHEAT_CROP_2:
    case BlockType.WHEAT_CROP_3:
      return [{ type: BlockType.WHEAT_SEEDS, count: 1 }]
    case BlockType.WHEAT_CROP_4:
      return [
        { type: BlockType.WHEAT, count: 2 },
        { type: BlockType.WHEAT_SEEDS, count: 2 },
      ]
    case BlockType.RICE_CROP_1:
    case BlockType.RICE_CROP_2:
    case BlockType.RICE_CROP_3:
      return [{ type: BlockType.RICE_SEEDS, count: 1 }]
    case BlockType.RICE_CROP_4:
      return [
        { type: BlockType.RICE, count: 2 },
        { type: BlockType.RICE_SEEDS, count: 2 },
      ]
    default:
      return block === BlockType.AIR ? [] : [{ type: block, count: 1 }]
  }
}

export function advanceCropGrowth(block: BlockType): BlockType {
  switch (block) {
    case BlockType.WHEAT_CROP_1:
      return BlockType.WHEAT_CROP_2
    case BlockType.WHEAT_CROP_2:
      return BlockType.WHEAT_CROP_3
    case BlockType.WHEAT_CROP_3:
      return BlockType.WHEAT_CROP_4
    case BlockType.RICE_CROP_1:
      return BlockType.RICE_CROP_2
    case BlockType.RICE_CROP_2:
      return BlockType.RICE_CROP_3
    case BlockType.RICE_CROP_3:
      return BlockType.RICE_CROP_4
    default:
      return block
  }
}

function seededUnit(x: number, y: number, z: number, tick: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + tick * 19.19) * 43758.5453
  return n - Math.floor(n)
}

export function hasWaterNear(chunks3D: Map<string, Uint8Array>, x: number, y: number, z: number, radius = 4): boolean {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (getBlock3D(x + dx, y + dy, z + dz, chunks3D) === BlockType.WATER) return true
      }
    }
  }
  return false
}

export function advanceLoadedCrops(chunks3D: Map<string, Uint8Array>, options: { tick: number; isRaining: boolean }): CropGrowthChange[] {
  const changes: CropGrowthChange[] = []

  for (const [key, chunkData] of chunks3D) {
    const [cx, cy, cz] = key.split(',').map(Number)
    const yBase = cy * CHUNK_Y_SIZE

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const index = getBlockIndex3D(x, localY, z)
          const block = chunkData[index] as BlockType
          const worldX = cx * CHUNK_SIZE + x
          const worldY = yBase + localY
          const worldZ = cz * CHUNK_SIZE + z

          if (isFarmlandBlock(block)) {
            const next = options.isRaining || hasWaterNear(chunks3D, worldX, worldY, worldZ) ? BlockType.FARMLAND_WET : BlockType.FARMLAND_DRY
            if (next !== block) {
              chunkData[index] = next
              changes.push({
                x: worldX,
                y: worldY,
                z: worldZ,
                from: block,
                to: next,
              })
            }
            continue
          }

          if (!isCropBlock(block)) continue
          const below = getBlock3D(worldX, worldY - 1, worldZ, chunks3D)
          const growthChance = below === BlockType.FARMLAND_WET || options.isRaining ? 0.72 : 0.36
          if (seededUnit(worldX, worldY, worldZ, options.tick) > growthChance) continue

          const next = advanceCropGrowth(block)
          if (next === block) continue
          chunkData[index] = next
          changes.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            from: block,
            to: next,
          })
        }
      }
    }
  }

  return changes
}

export function uniqueChunkPositionsForChanges(changes: CropGrowthChange[]): Array<{
  cx: number
  cy: number
  cz: number
  x: number
  y: number
  z: number
}> {
  const seen = new Set<string>()
  const chunks: Array<{
    cx: number
    cy: number
    cz: number
    x: number
    y: number
    z: number
  }> = []
  for (const change of changes) {
    const { cx, cy, cz } = worldToChunk3D(change.x, change.y, change.z)
    const key = getChunkKey3D(cx, cy, cz)
    if (seen.has(key)) continue
    seen.add(key)
    chunks.push({ cx, cy, cz, x: change.x, y: change.y, z: change.z })
  }
  return chunks
}
