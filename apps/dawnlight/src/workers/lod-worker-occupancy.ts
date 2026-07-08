import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE } from '../constants'
import type { LodOccupancyLevel, LodSectionBuildInput } from '../game/engine/lod/lod-data-types'
import { BlockType } from '../shared/block-types'

interface BaseGridLike {
  size: number
  heights: Int16Array
  materials: Uint8Array
  colors: Uint32Array
}

interface MutableOccupancyGrid {
  size: number
  topHeights: Int16Array
  bottomHeights: Int16Array
  materials: Uint8Array
  colors: Uint32Array
}

const MAX_FOLIAGE_OCCUPANCY_SPAN = 3

function isFoliageCanopyMaterial(block: BlockType): boolean {
  return block === BlockType.LEAVES || block === BlockType.PALM_LEAVES || block === BlockType.SNOW_LEAVES
}

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function getBlockAtWorld(worldX: number, worldY: number, worldZ: number, chunksByKey: Record<string, Uint8Array>): BlockType {
  if (worldY < 0 || worldY >= CHUNK_Y_COUNT * CHUNK_Y_SIZE) return BlockType.AIR
  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  const chunk = chunksByKey[getChunkKey3D(cx, cy, cz)]
  if (!chunk) return BlockType.AIR

  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = worldY - cy * CHUNK_Y_SIZE
  return chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
}

function isSolidForOccupancy(block: BlockType): boolean {
  return block !== BlockType.AIR
}

function findConnectedBottomY(worldX: number, worldZ: number, topY: number, chunksByKey: Record<string, Uint8Array>): number {
  let bottomY = topY
  for (let y = topY; y >= 0; y--) {
    const block = getBlockAtWorld(worldX, y, worldZ, chunksByKey)
    if (!isSolidForOccupancy(block)) break
    bottomY = y
  }
  return bottomY
}

function toOccupancyLevel(grid: MutableOccupancyGrid, scale: number): LodOccupancyLevel {
  return {
    scale,
    size: grid.size,
    topHeights: grid.topHeights,
    bottomHeights: grid.bottomHeights,
    materials: grid.materials,
    colors: grid.colors,
  }
}

function buildNextOccupancy(source: MutableOccupancyGrid): MutableOccupancyGrid | null {
  if (source.size <= 1) return null
  const nextSize = Math.ceil(source.size / 2)
  const total = nextSize * nextSize
  const topHeights = new Int16Array(total)
  const bottomHeights = new Int16Array(total)
  const materials = new Uint8Array(total)
  const colors = new Uint32Array(total)

  for (let z = 0; z < nextSize; z++) {
    for (let x = 0; x < nextSize; x++) {
      let bestTop = -1
      let bestBottom = -1
      let bestMaterial = BlockType.AIR
      let bestColor = 0

      for (let dz = 0; dz < 2; dz++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(source.size - 1, x * 2 + dx)
          const sz = Math.min(source.size - 1, z * 2 + dz)
          const sidx = sx + sz * source.size
          const top = source.topHeights[sidx]
          if (top < 0) continue
          const bottom = source.bottomHeights[sidx]
          if (bestTop < top || (bestTop === top && bottom > bestBottom)) {
            bestTop = top
            bestBottom = bottom
            bestMaterial = source.materials[sidx] as BlockType
            bestColor = source.colors[sidx]
          }
        }
      }

      const idx = x + z * nextSize
      topHeights[idx] = bestTop
      bottomHeights[idx] = bestBottom
      materials[idx] = bestMaterial
      colors[idx] = bestColor
    }
  }

  return { size: nextSize, topHeights, bottomHeights, materials, colors }
}

export function buildOccupancyLevels(input: LodSectionBuildInput, baseGrid: BaseGridLike): LodOccupancyLevel[] {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE
  const total = baseGrid.size * baseGrid.size
  const topHeights = new Int16Array(total)
  const bottomHeights = new Int16Array(total)
  const materials = new Uint8Array(total)
  const colors = new Uint32Array(total)

  for (let z = 0; z < baseGrid.size; z++) {
    for (let x = 0; x < baseGrid.size; x++) {
      const idx = x + z * baseGrid.size
      const topY = baseGrid.heights[idx]
      const material = baseGrid.materials[idx] as BlockType
      if (topY < 0 || material === BlockType.AIR) {
        topHeights[idx] = -1
        bottomHeights[idx] = -1
        continue
      }
      const worldX = worldStartX + x
      const worldZ = worldStartZ + z
      let bottomY = findConnectedBottomY(worldX, worldZ, topY, input.chunksByKey)
      if (isFoliageCanopyMaterial(material)) {
        bottomY = Math.max(bottomY, topY - MAX_FOLIAGE_OCCUPANCY_SPAN)
      }
      topHeights[idx] = topY
      bottomHeights[idx] = bottomY
      materials[idx] = material
      colors[idx] = baseGrid.colors[idx]
    }
  }

  const levels: LodOccupancyLevel[] = []
  let current: MutableOccupancyGrid | null = {
    size: baseGrid.size,
    topHeights,
    bottomHeights,
    materials,
    colors,
  }
  let scale = 1
  while (current) {
    levels.push(toOccupancyLevel(current, scale))
    current = buildNextOccupancy(current)
    scale *= 2
  }
  return levels
}
