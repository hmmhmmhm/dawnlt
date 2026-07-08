import { BufferAttribute, BufferGeometry, Color } from 'three'
import { BlockColors } from '../../../constants'
import { BlockType } from '../../../shared/block-types'
import { isLodDebugColorEnabled } from './far-renderer-debug'
import type { GeometryBuildResult } from './far-renderer-geometry'
import type { LodOccupancyLevel, LodSectionRenderData } from './lod-data-types'

const FAR_SURFACE_Y_BIAS = -0.05
const LOD_SATURATION_REDUCTION = 0.04
const LOD_TOP_BRIGHTNESS_SCALE = 1
const LOD_SIDE_BRIGHTNESS_SCALE = 0.9
const DEBUG_COLOR_TOP = 0x3be66f
const DEBUG_COLOR_SIDE = 0x2ca6ff

interface GeometryBuffers {
  positions: number[]
  colors: number[]
}

interface OccupancyColumn {
  top: number
  bottom: number
}

function writeVertex(buffers: GeometryBuffers, x: number, y: number, z: number, color: number, brightnessScale: number = LOD_TOP_BRIGHTNESS_SCALE): number {
  const index = buffers.positions.length / 3
  const linear = new Color(color)
  const luma = linear.r * 0.2126 + linear.g * 0.7152 + linear.b * 0.0722
  linear.r = (linear.r * (1 - LOD_SATURATION_REDUCTION) + luma * LOD_SATURATION_REDUCTION) * brightnessScale
  linear.g = (linear.g * (1 - LOD_SATURATION_REDUCTION) + luma * LOD_SATURATION_REDUCTION) * brightnessScale
  linear.b = (linear.b * (1 - LOD_SATURATION_REDUCTION) + luma * LOD_SATURATION_REDUCTION) * brightnessScale
  buffers.positions.push(x, y, z)
  buffers.colors.push(linear.r, linear.g, linear.b)
  return index
}

function writeHorizontalQuad(buffers: GeometryBuffers, indices: number[], x0: number, x1: number, z0: number, z1: number, y: number, color: number, brightnessScale: number = LOD_TOP_BRIGHTNESS_SCALE): void {
  const a = writeVertex(buffers, x0, y, z0, color, brightnessScale)
  const b = writeVertex(buffers, x1, y, z0, color, brightnessScale)
  const c = writeVertex(buffers, x0, y, z1, color, brightnessScale)
  const d = writeVertex(buffers, x1, y, z1, color, brightnessScale)
  indices.push(a, c, d, a, d, b)
}

function writeVerticalQuad(buffers: GeometryBuffers, indices: number[], x0: number, yBottom0: number, yTop0: number, z0: number, x1: number, yBottom1: number, yTop1: number, z1: number, color: number, brightnessScale: number = LOD_SIDE_BRIGHTNESS_SCALE): void {
  if (Math.abs(yTop0 - yBottom0) < 0.001 && Math.abs(yTop1 - yBottom1) < 0.001) return
  const a = writeVertex(buffers, x0, yBottom0, z0, color, brightnessScale)
  const b = writeVertex(buffers, x1, yBottom1, z1, color, brightnessScale)
  const c = writeVertex(buffers, x0, yTop0, z0, color, brightnessScale)
  const d = writeVertex(buffers, x1, yTop1, z1, color, brightnessScale)
  indices.push(a, b, c, c, b, d)
}

function pickRenderableOccupancyLevel(data: LodSectionRenderData): LodOccupancyLevel | null {
  if (!data.occupancyLevels || data.occupancyLevels.length === 0) return null
  const preferredIndex = Math.min(data.occupancyLevels.length - 1, Math.max(0, data.level - 1))
  return data.occupancyLevels[preferredIndex]
}

function readColumn(level: LodOccupancyLevel, x: number, z: number): OccupancyColumn | null {
  if (x < 0 || z < 0 || x >= level.size || z >= level.size) return null
  const idx = x + z * level.size
  const top = level.topHeights[idx]
  const bottom = level.bottomHeights[idx]
  if (top < 0 || bottom < 0 || bottom > top) return null
  return { top, bottom }
}

function isSideVisible(current: OccupancyColumn, neighbor: OccupancyColumn | null): boolean {
  if (!neighbor) return true
  if (neighbor.top < current.bottom) return true
  if (neighbor.bottom > current.top) return true
  return neighbor.top < current.top || neighbor.bottom > current.bottom
}

function getExposedBottom(current: OccupancyColumn, neighbor: OccupancyColumn | null): number {
  if (!neighbor) return current.bottom
  return Math.max(current.bottom, neighbor.top + 1)
}

function getLodTopColor(material: BlockType, fallbackColor: number): number {
  const palette = BlockColors[material]
  return palette?.top ?? palette?.all ?? fallbackColor
}

function getLodSideColor(material: BlockType, topColor: number): number {
  if (material === BlockType.DIRT) return 0x7a5c12
  if (material === BlockType.SNOW) {
    const dirtPalette = BlockColors[BlockType.DIRT]
    return dirtPalette?.side ?? dirtPalette?.all ?? 0x8b6914
  }
  const palette = BlockColors[material]
  return palette?.side ?? palette?.all ?? topColor
}

export function buildOccupancySectionGeometry(data: LodSectionRenderData): GeometryBuildResult | null {
  const level = pickRenderableOccupancyLevel(data)
  if (!level) return null
  const debugColor = isLodDebugColorEnabled()
  const buffers: GeometryBuffers = { positions: [], colors: [] }
  const topIndices: number[] = []
  const sideIndices: number[] = []

  for (let z = 0; z < level.size; z++) {
    for (let x = 0; x < level.size; x++) {
      const column = readColumn(level, x, z)
      if (!column) continue

      const idx = x + z * level.size
      const x0 = data.worldStartX + x * level.scale
      const z0 = data.worldStartZ + z * level.scale
      const x1 = x0 + level.scale
      const z1 = z0 + level.scale
      const topY = column.top + 1 + FAR_SURFACE_Y_BIAS
      const material = level.materials[idx] as BlockType
      const topColor = debugColor ? DEBUG_COLOR_TOP : getLodTopColor(material, level.colors[idx])
      const sideColor = debugColor ? DEBUG_COLOR_SIDE : getLodSideColor(material, topColor)

      writeHorizontalQuad(buffers, topIndices, x0, x1, z0, z1, topY, topColor)

      const north = readColumn(level, x, z - 1)
      if (isSideVisible(column, north)) {
        const bottomY = getExposedBottom(column, north) + FAR_SURFACE_Y_BIAS
        writeVerticalQuad(buffers, sideIndices, x0, bottomY, topY, z0, x1, bottomY, topY, z0, sideColor)
      }
      const south = readColumn(level, x, z + 1)
      if (isSideVisible(column, south)) {
        const bottomY = getExposedBottom(column, south) + FAR_SURFACE_Y_BIAS
        writeVerticalQuad(buffers, sideIndices, x1, bottomY, topY, z1, x0, bottomY, topY, z1, sideColor)
      }
      const west = readColumn(level, x - 1, z)
      if (isSideVisible(column, west)) {
        const bottomY = getExposedBottom(column, west) + FAR_SURFACE_Y_BIAS
        writeVerticalQuad(buffers, sideIndices, x0, bottomY, topY, z1, x0, bottomY, topY, z0, sideColor)
      }
      const east = readColumn(level, x + 1, z)
      if (isSideVisible(column, east)) {
        const bottomY = getExposedBottom(column, east) + FAR_SURFACE_Y_BIAS
        writeVerticalQuad(buffers, sideIndices, x1, bottomY, topY, z0, x1, bottomY, topY, z1, sideColor)
      }
    }
  }

  const geometry = new BufferGeometry()
  const combinedIndices = topIndices.concat(sideIndices)
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(buffers.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(buffers.colors), 3))
  geometry.setIndex(combinedIndices)
  geometry.clearGroups()
  geometry.addGroup(0, topIndices.length, 0)
  if (sideIndices.length > 0) {
    geometry.addGroup(topIndices.length, sideIndices.length, 1)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return {
    geometry,
    topTriangleCount: Math.floor(topIndices.length / 3),
    boundaryTriangleCount: Math.floor(sideIndices.length / 3),
    internalTriangleCount: 0,
  }
}
