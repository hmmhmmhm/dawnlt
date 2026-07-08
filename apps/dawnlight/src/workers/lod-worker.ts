import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE } from '../constants'
import type { LodColumnSample, LodEdgeHeights, LodMipmapLevel, LodSectionBuildInput, LodSectionRenderData } from '../game/engine/lod/lod-data-types'
import { BlockType } from '../shared/block-types'
import { buildOccupancyLevels } from './lod-worker-occupancy'
import { getBlockColor, hasSolidSupportBelow, isDecorativeForLodSurface, isTerrainCandidate, isTreeLodBlock } from './lod-worker-surface-utils'
import { buildTreeLodSectionData } from './lod-worker-tree'
import { buildWaterLevels } from './lod-worker-water'

export interface LodWorkerBuildRequest {
  type: 'build'
  requestId: number
  sectionKey: string
  x: number
  z: number
  level: number
  version: number
  priority: number
  sectionData?: LodSectionBuildInput
}

export interface LodWorkerCancelRequest {
  type: 'cancel'
  requestId: number
  sectionKey: string
  version: number
}

export interface LodWorkerBuildResult {
  type: 'built'
  requestId: number
  sectionKey: string
  level: number
  version: number
  buildMs: number
  lodData: LodSectionRenderData
}

export interface LodWorkerFailedResult {
  type: 'failed'
  requestId: number
  sectionKey: string
  version: number
  error: string
}

export type LodWorkerRequestMessage = LodWorkerBuildRequest | LodWorkerCancelRequest
export type LodWorkerResponseMessage = LodWorkerBuildResult | LodWorkerFailedResult

const cancelledRequests = new Set<number>()

interface MutableLodGrid {
  size: number
  heights: Int16Array
  materials: Uint8Array
  colors: Uint32Array
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function buildColumnSample(worldX: number, worldZ: number, chunksByKey: Record<string, Uint8Array>, minCy: number, maxCy: number): LodColumnSample {
  const cappedMaxCy = Math.min(maxCy, CHUNK_Y_COUNT - 1)
  const cappedMinCy = Math.max(0, minCy)
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  // Pass 1: pick terrain-like surfaces first (skip decorative spikes).
  for (let cy = cappedMaxCy; cy >= cappedMinCy; cy--) {
    const chunk = chunksByKey[getChunkKey3D(Math.floor(worldX / CHUNK_SIZE), cy, Math.floor(worldZ / CHUNK_SIZE))]
    if (!chunk) continue

    for (let localY = CHUNK_Y_SIZE - 1; localY >= 0; localY--) {
      const worldY = cy * CHUNK_Y_SIZE + localY
      const block = chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
      if (!isTerrainCandidate(block)) continue
      return {
        height: worldY,
        material: block,
        color: getBlockColor(block),
      }
    }
  }

  // Pass 2: still require support below to avoid floating spikes/columns.
  for (let cy = cappedMaxCy; cy >= cappedMinCy; cy--) {
    const chunk = chunksByKey[getChunkKey3D(Math.floor(worldX / CHUNK_SIZE), cy, Math.floor(worldZ / CHUNK_SIZE))]
    if (!chunk) continue

    for (let localY = CHUNK_Y_SIZE - 1; localY >= 0; localY--) {
      const worldY = cy * CHUNK_Y_SIZE + localY
      const block = chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
      if (block === BlockType.AIR) continue
      if (isTreeLodBlock(block)) continue
      if (isDecorativeForLodSurface(block)) continue
      if (!hasSolidSupportBelow(worldX, worldY, worldZ, chunksByKey, cappedMinCy, cappedMaxCy)) continue
      return {
        height: worldY,
        material: block,
        color: getBlockColor(block),
      }
    }
  }

  return { height: -1, material: BlockType.AIR, color: 0x000000 }
}

function buildBaseGrid(input: LodSectionBuildInput): MutableLodGrid {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE
  const size = sectionScale * CHUNK_SIZE
  const total = size * size

  const heights = new Int16Array(total)
  const materials = new Uint8Array(total)
  const colors = new Uint32Array(total)

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const worldX = worldStartX + x
      const worldZ = worldStartZ + z
      const sample = buildColumnSample(worldX, worldZ, input.chunksByKey, input.minCy, input.maxCy)
      const index = x + z * size
      heights[index] = sample.height
      materials[index] = sample.material
      colors[index] = sample.color
    }
  }

  return { size, heights, materials, colors }
}

function mergeCell(source: MutableLodGrid, baseX: number, baseZ: number): LodColumnSample {
  const childSize = source.size
  const childSamples: LodColumnSample[] = []
  let pickedHeight = -1

  for (let dz = 0; dz < 2; dz++) {
    for (let dx = 0; dx < 2; dx++) {
      const sourceX = Math.min(childSize - 1, baseX + dx)
      const sourceZ = Math.min(childSize - 1, baseZ + dz)
      const sourceIndex = sourceX + sourceZ * childSize
      const height = source.heights[sourceIndex]
      const material = source.materials[sourceIndex] as BlockType
      const color = source.colors[sourceIndex]
      childSamples.push({ height, material, color })
      if (height > pickedHeight) {
        pickedHeight = height
      }
    }
  }

  const pickedMaterial = pickMergedMaterial(childSamples)
  const pickedColor = blendMergedColor(childSamples, pickedMaterial)

  return {
    height: pickedHeight,
    material: pickedMaterial,
    color: pickedColor,
  }
}

function pickMergedMaterial(samples: readonly LodColumnSample[]): BlockType {
  const byMaterial = new Map<BlockType, { count: number; maxHeight: number }>()
  let hasSolid = false

  for (const sample of samples) {
    if (sample.material === BlockType.AIR || sample.height < 0) continue
    hasSolid = true
    const previous = byMaterial.get(sample.material)
    if (!previous) {
      byMaterial.set(sample.material, { count: 1, maxHeight: sample.height })
      continue
    }
    previous.count += 1
    if (sample.height > previous.maxHeight) previous.maxHeight = sample.height
  }

  if (!hasSolid) return BlockType.AIR

  let winner = BlockType.AIR
  let winnerCount = -1
  let winnerHeight = -1
  for (const [material, stat] of byMaterial) {
    if (stat.count > winnerCount) {
      winner = material
      winnerCount = stat.count
      winnerHeight = stat.maxHeight
      continue
    }
    if (stat.count === winnerCount && stat.maxHeight > winnerHeight) {
      winner = material
      winnerHeight = stat.maxHeight
      continue
    }
    if (stat.count === winnerCount && stat.maxHeight === winnerHeight && material < winner) {
      winner = material
    }
  }

  return winner
}

function blendMergedColor(samples: readonly LodColumnSample[], fallbackMaterial: BlockType): number {
  let weightSum = 0
  let red = 0
  let green = 0
  let blue = 0

  for (const sample of samples) {
    if (sample.material === BlockType.AIR || sample.height < 0) continue
    const weight = Math.max(1, sample.height + 1)
    const color = sample.color
    red += ((color >> 16) & 0xff) * weight
    green += ((color >> 8) & 0xff) * weight
    blue += (color & 0xff) * weight
    weightSum += weight
  }

  if (weightSum === 0) {
    return fallbackMaterial === BlockType.AIR ? 0x000000 : getBlockColor(fallbackMaterial)
  }

  const mergedRed = Math.round(red / weightSum) & 0xff
  const mergedGreen = Math.round(green / weightSum) & 0xff
  const mergedBlue = Math.round(blue / weightSum) & 0xff
  return (mergedRed << 16) | (mergedGreen << 8) | mergedBlue
}

function buildNextMipmap(source: MutableLodGrid): MutableLodGrid | null {
  if (source.size <= 1) return null
  const nextSize = Math.ceil(source.size / 2)
  const total = nextSize * nextSize
  const heights = new Int16Array(total)
  const materials = new Uint8Array(total)
  const colors = new Uint32Array(total)

  for (let z = 0; z < nextSize; z++) {
    for (let x = 0; x < nextSize; x++) {
      const merged = mergeCell(source, x * 2, z * 2)
      const index = x + z * nextSize
      heights[index] = merged.height
      materials[index] = merged.material
      colors[index] = merged.color
    }
  }

  return { size: nextSize, heights, materials, colors }
}

function buildEdgeHeights(input: LodSectionBuildInput, baseGrid: MutableLodGrid): LodEdgeHeights {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE
  const size = baseGrid.size

  const north = new Int16Array(size)
  const south = new Int16Array(size)
  const west = new Int16Array(size)
  const east = new Int16Array(size)

  for (let i = 0; i < size; i++) {
    const northInside = baseGrid.heights[i]
    const southInside = baseGrid.heights[i + (size - 1) * size]
    const westInside = baseGrid.heights[i * size]
    const eastInside = baseGrid.heights[size - 1 + i * size]

    const northOutside = buildColumnSample(worldStartX + i, worldStartZ - 1, input.chunksByKey, input.minCy, input.maxCy).height
    const southOutside = buildColumnSample(worldStartX + i, worldStartZ + size, input.chunksByKey, input.minCy, input.maxCy).height
    const westOutside = buildColumnSample(worldStartX - 1, worldStartZ + i, input.chunksByKey, input.minCy, input.maxCy).height
    const eastOutside = buildColumnSample(worldStartX + size, worldStartZ + i, input.chunksByKey, input.minCy, input.maxCy).height

    north[i] = northOutside < 0 ? northInside : Math.round((northInside + northOutside) * 0.5)
    south[i] = southOutside < 0 ? southInside : Math.round((southInside + southOutside) * 0.5)
    west[i] = westOutside < 0 ? westInside : Math.round((westInside + westOutside) * 0.5)
    east[i] = eastOutside < 0 ? eastInside : Math.round((eastInside + eastOutside) * 0.5)
  }

  return { north, south, west, east }
}

function toMipmapLevel(grid: MutableLodGrid, scale: number): LodMipmapLevel {
  return {
    scale,
    size: grid.size,
    heights: grid.heights,
    materials: grid.materials,
    colors: grid.colors,
  }
}

function createEmptyLodData(sectionKey: string, level: number, x: number, z: number): LodSectionRenderData {
  return {
    sectionKey,
    level,
    worldStartX: x * CHUNK_SIZE,
    worldStartZ: z * CHUNK_SIZE,
    baseSize: CHUNK_SIZE,
    levels: [
      {
        scale: 1,
        size: CHUNK_SIZE,
        heights: new Int16Array(CHUNK_SIZE * CHUNK_SIZE),
        materials: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE),
        colors: new Uint32Array(CHUNK_SIZE * CHUNK_SIZE),
      },
    ],
    treeData: {
      sectionKey,
      worldStartX: x * CHUNK_SIZE,
      worldStartZ: z * CHUNK_SIZE,
      voxels: [],
    },
    edgeHeights: {
      north: new Int16Array(CHUNK_SIZE),
      south: new Int16Array(CHUNK_SIZE),
      west: new Int16Array(CHUNK_SIZE),
      east: new Int16Array(CHUNK_SIZE),
    },
  }
}

export function buildLodSectionData(input: LodSectionBuildInput): LodSectionRenderData {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE

  const baseGrid = buildBaseGrid(input)
  const edgeHeights = buildEdgeHeights(input, baseGrid)
  const occupancyLevels = buildOccupancyLevels(input, baseGrid)
  const waterLevels = buildWaterLevels(input, baseGrid.size)
  const treeData = buildTreeLodSectionData(input, baseGrid.size)
  const levels: LodMipmapLevel[] = []
  let grid: MutableLodGrid | null = baseGrid
  let scale = 1

  while (grid) {
    levels.push(toMipmapLevel(grid, scale))
    grid = buildNextMipmap(grid)
    scale *= 2
  }

  return {
    sectionKey: input.sectionKey,
    level: input.level,
    worldStartX,
    worldStartZ,
    baseSize: baseGrid.size,
    levels,
    occupancyLevels,
    waterLevels,
    treeData,
    edgeHeights,
  }
}

function isWorkerRuntime(): boolean {
  return typeof self !== 'undefined' && 'onmessage' in self
}

if (isWorkerRuntime()) {
  const workerScope = self as unknown as Worker

  workerScope.onmessage = (event: MessageEvent<LodWorkerRequestMessage>) => {
    const message = event.data

    if (message.type === 'cancel') {
      cancelledRequests.add(message.requestId)
      return
    }

    const startedAt = performance.now()
    if (cancelledRequests.has(message.requestId)) {
      cancelledRequests.delete(message.requestId)
      return
    }

    try {
      const lodData = message.sectionData ? buildLodSectionData(message.sectionData) : createEmptyLodData(message.sectionKey, message.level, message.x, message.z)
      const response: LodWorkerBuildResult = {
        type: 'built',
        requestId: message.requestId,
        sectionKey: message.sectionKey,
        level: message.level,
        version: message.version,
        buildMs: performance.now() - startedAt,
        lodData,
      }
      workerScope.postMessage(response)
    } catch (error) {
      const failed: LodWorkerFailedResult = {
        type: 'failed',
        requestId: message.requestId,
        sectionKey: message.sectionKey,
        version: message.version,
        error: error instanceof Error ? error.message : String(error),
      }
      workerScope.postMessage(failed)
    }
  }
}
