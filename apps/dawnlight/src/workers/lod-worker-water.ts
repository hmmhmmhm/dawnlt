import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../constants'
import type { LodSectionBuildInput, LodWaterLevel } from '../game/engine/lod/lod-data-types'
import { BlockType } from '../shared/block-types'

interface MutableWaterGrid {
  size: number
  surfaceHeights: Int16Array
}

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function findTopWaterY(worldX: number, worldZ: number, chunksByKey: Record<string, Uint8Array>, minCy: number, maxCy: number): number {
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE

  for (let cy = maxCy; cy >= minCy; cy--) {
    const chunk = chunksByKey[getChunkKey3D(Math.floor(worldX / CHUNK_SIZE), cy, Math.floor(worldZ / CHUNK_SIZE))]
    if (!chunk) continue
    for (let localY = CHUNK_Y_SIZE - 1; localY >= 0; localY--) {
      const block = chunk[getBlockIndex3D(localX, localY, localZ)] as BlockType
      if (block !== BlockType.WATER) continue
      return cy * CHUNK_Y_SIZE + localY
    }
  }

  return -1
}

function toWaterLevel(grid: MutableWaterGrid, scale: number): LodWaterLevel {
  return {
    scale,
    size: grid.size,
    surfaceHeights: grid.surfaceHeights,
  }
}

function buildNextWaterLevel(source: MutableWaterGrid): MutableWaterGrid | null {
  if (source.size <= 1) return null
  const nextSize = Math.ceil(source.size / 2)
  const total = nextSize * nextSize
  const surfaceHeights = new Int16Array(total)
  surfaceHeights.fill(-1)

  for (let z = 0; z < nextSize; z++) {
    for (let x = 0; x < nextSize; x++) {
      let picked = -1
      for (let dz = 0; dz < 2; dz++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(source.size - 1, x * 2 + dx)
          const sz = Math.min(source.size - 1, z * 2 + dz)
          const sidx = sx + sz * source.size
          const child = source.surfaceHeights[sidx]
          if (child > picked) picked = child
        }
      }
      surfaceHeights[x + z * nextSize] = picked
    }
  }

  return { size: nextSize, surfaceHeights }
}

export function buildWaterLevels(input: LodSectionBuildInput, baseSize: number): LodWaterLevel[] {
  const sectionScale = 1 << Math.max(0, input.level)
  const worldStartX = input.sectionX * sectionScale * CHUNK_SIZE
  const worldStartZ = input.sectionZ * sectionScale * CHUNK_SIZE
  const total = baseSize * baseSize
  const surfaceHeights = new Int16Array(total)
  surfaceHeights.fill(-1)

  for (let z = 0; z < baseSize; z++) {
    for (let x = 0; x < baseSize; x++) {
      const worldX = worldStartX + x
      const worldZ = worldStartZ + z
      surfaceHeights[x + z * baseSize] = findTopWaterY(worldX, worldZ, input.chunksByKey, input.minCy, input.maxCy)
    }
  }

  const levels: LodWaterLevel[] = []
  let current: MutableWaterGrid | null = { size: baseSize, surfaceHeights }
  let scale = 1
  while (current) {
    levels.push(toWaterLevel(current, scale))
    current = buildNextWaterLevel(current)
    scale *= 2
  }
  return levels
}
