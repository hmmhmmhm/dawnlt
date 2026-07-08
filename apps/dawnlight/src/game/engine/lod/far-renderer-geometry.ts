import { BufferAttribute, BufferGeometry, Color } from 'three'
import { BlockColors } from '../../../constants'
import { BlockType } from '../../../shared/block-types'
import { isBlockTransparent, isFluidBlock } from '../../../shared/block-utils'
import { DEBUG_DISABLE_SIDE_FACES, GENERATE_INTERNAL_SIDE_FACES, getLodInternalFaceMinDrop, isLodBoundaryFacesEnabled, isLodDebugColorEnabled, isLodInternalFacesEnabled, logDebugLod } from './far-renderer-debug'
import { buildOccupancySectionGeometry } from './far-renderer-occupancy-geometry'
import type { LodMipmapLevel, LodSectionRenderData } from './lod-data-types'

const EDGE_BLEND_WEIGHT = 0.75
const LOD_SATURATION_REDUCTION = 0.04
const LOD_TOP_BRIGHTNESS_SCALE = 1
const LOD_SIDE_BRIGHTNESS_SCALE = 0.9
const MAX_SIDE_FACE_DEPTH = 4
const FIXED_SIDE_FACE_DEPTH = 2
const MIN_INTERNAL_FACE_DEPTH = 0.75
const MIN_INTERNAL_FACE_HEIGHT_DELTA = 0.35
const FAR_SURFACE_Y_BIAS = -0.05
const DEBUG_COLOR_TOP = 0xf2d13b
const DEBUG_COLOR_TOP_STEEP = 0xff3f3f
const DEBUG_COLOR_BOUNDARY = 0xd34bff
const DEBUG_COLOR_INTERNAL = 0x33e0ff
const DEBUG_STEEP_SLOPE_DELTA = 1.5

interface GeometryBuffers {
  positions: number[]
  colors: number[]
}

export interface GeometryBuildResult {
  geometry: BufferGeometry
  topTriangleCount: number
  boundaryTriangleCount: number
  internalTriangleCount: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pickRenderableLevel(data: LodSectionRenderData): LodMipmapLevel {
  const preferredIndex = Math.min(data.levels.length - 1, Math.max(0, data.level - 1))
  return data.levels[preferredIndex]
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

function writeQuad(buffers: GeometryBuffers, targetIndices: number[], x0: number, z0: number, x1: number, z1: number, y00: number, y10: number, y01: number, y11: number, color: number, brightnessScale: number = LOD_TOP_BRIGHTNESS_SCALE): void {
  const a = writeVertex(buffers, x0, y00, z0, color, brightnessScale)
  const b = writeVertex(buffers, x1, y10, z0, color, brightnessScale)
  const c = writeVertex(buffers, x0, y01, z1, color, brightnessScale)
  const d = writeVertex(buffers, x1, y11, z1, color, brightnessScale)
  const diagonalADDelta = Math.abs(y00 - y11)
  const diagonalBCDelta = Math.abs(y10 - y01)
  if (diagonalADDelta <= diagonalBCDelta) {
    targetIndices.push(a, c, d, a, d, b)
    return
  }
  targetIndices.push(a, c, b, b, c, d)
}

function writeVerticalQuad(buffers: GeometryBuffers, targetIndices: number[], x0: number, yBottom0: number, yTop0: number, z0: number, x1: number, yBottom1: number, yTop1: number, z1: number, color: number, brightnessScale: number = LOD_SIDE_BRIGHTNESS_SCALE): void {
  const a = writeVertex(buffers, x0, yBottom0, z0, color, brightnessScale)
  const b = writeVertex(buffers, x1, yBottom1, z1, color, brightnessScale)
  const c = writeVertex(buffers, x0, yTop0, z0, color, brightnessScale)
  const d = writeVertex(buffers, x1, yTop1, z1, color, brightnessScale)
  targetIndices.push(a, b, c, c, b, d)
}

function blend(a: number, b: number, weight: number): number {
  return a + (b - a) * weight
}

function sampleEdgeY(edge: Int16Array, index: number, fallbackY: number): number {
  if (edge.length === 0) return fallbackY
  const sampled = edge[clamp(index, 0, edge.length - 1)]
  return sampled < 0 ? fallbackY : sampled + 1 + FAR_SURFACE_Y_BIAS
}

function shouldRenderMaterial(material: BlockType): boolean {
  if (material === BlockType.LEAVES || material === BlockType.PALM_LEAVES || material === BlockType.SNOW_LEAVES) {
    return true
  }
  return material !== BlockType.AIR && !isFluidBlock(material) && !isBlockTransparent(material)
}

function getEdgeHeight(data: LodSectionRenderData, side: 'north' | 'south' | 'west' | 'east', i: number): number {
  const edge = data.edgeHeights[side]
  if (edge.length === 0) return -1
  return edge[clamp(i, 0, edge.length - 1)]
}

function getRenderableHeightAt(level: LodMipmapLevel, x: number, z: number): number {
  if (x < 0 || z < 0 || x >= level.size || z >= level.size) return -1
  const idx = x + z * level.size
  const height = level.heights[idx]
  if (height < 0) return -1
  const material = level.materials[idx] as BlockType
  if (!shouldRenderMaterial(material)) return -1
  return height
}

function getInternalSkirtBottomY(topY: number, neighborH: number): number | null {
  if (neighborH < 0) return topY - Math.min(FIXED_SIDE_FACE_DEPTH, MAX_SIDE_FACE_DEPTH)
  const drop = topY - (neighborH + 1)
  if (drop <= getLodInternalFaceMinDrop()) return null
  const skirtDepth = Math.min(FIXED_SIDE_FACE_DEPTH, MAX_SIDE_FACE_DEPTH, Math.max(MIN_INTERNAL_FACE_DEPTH, drop))
  return topY - skirtDepth
}

function getBoundarySkirtBottomY(topY: number, neighborH: number): number {
  if (neighborH < 0) return topY - Math.min(FIXED_SIDE_FACE_DEPTH, MAX_SIDE_FACE_DEPTH)
  const drop = Math.max(1, topY - (neighborH + 1))
  const skirtDepth = Math.min(FIXED_SIDE_FACE_DEPTH, MAX_SIDE_FACE_DEPTH, drop)
  return topY - skirtDepth
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

function writeVerticalQuadFromNullable(buffers: GeometryBuffers, targetIndices: number[], x0: number, yBottom0: number | null, yTop0: number, z0: number, x1: number, yBottom1: number | null, yTop1: number, z1: number, color: number, minHeightDelta = 0): boolean {
  if (yBottom0 === null && yBottom1 === null) return false
  // Avoid needle/degenerate internal skirts when only one endpoint has drop.
  const resolvedBottom0 = yBottom0 ?? yTop0 - MIN_INTERNAL_FACE_DEPTH
  const resolvedBottom1 = yBottom1 ?? yTop1 - MIN_INTERNAL_FACE_DEPTH
  const heightDelta0 = Math.abs(yTop0 - resolvedBottom0)
  const heightDelta1 = Math.abs(yTop1 - resolvedBottom1)
  if (heightDelta0 < minHeightDelta && heightDelta1 < minHeightDelta) return false
  writeVerticalQuad(buffers, targetIndices, x0, resolvedBottom0, yTop0, z0, x1, resolvedBottom1, yTop1, z1, color)
  return true
}

export function buildSectionGeometry(data: LodSectionRenderData): GeometryBuildResult {
  const occupancy = buildOccupancySectionGeometry(data)
  if (occupancy) return occupancy

  const level = pickRenderableLevel(data)
  const debugColor = isLodDebugColorEnabled()
  const boundaryFacesEnabled = isLodBoundaryFacesEnabled()
  const internalFacesEnabled = isLodInternalFacesEnabled()
  const buffers: GeometryBuffers = { positions: [], colors: [] }
  const topIndices: number[] = []
  const boundaryIndices: number[] = []
  const internalIndices: number[] = []
  let boundarySideFaceCount = 0
  let boundaryCandidateCount = 0
  let internalSideFaceCount = 0
  const internalEdgeKeys = new Set<string>()

  const writeInternalFace = (edgeKey: string, x0: number, yBottom0: number | null, yTop0: number, z0: number, x1: number, yBottom1: number | null, yTop1: number, z1: number, color: number): void => {
    if (internalEdgeKeys.has(edgeKey)) return
    const wroteFace = writeVerticalQuadFromNullable(buffers, internalIndices, x0, yBottom0, yTop0, z0, x1, yBottom1, yTop1, z1, color, MIN_INTERNAL_FACE_HEIGHT_DELTA)
    if (!wroteFace) return
    internalEdgeKeys.add(edgeKey)
    internalSideFaceCount += 1
  }

  for (let z = 0; z < level.size; z++) {
    for (let x = 0; x < level.size; x++) {
      const index = x + z * level.size
      const height = level.heights[index]
      if (height < 0) continue
      const material = level.materials[index] as BlockType
      if (!shouldRenderMaterial(material)) continue

      const topSourceColor = getLodTopColor(material, level.colors[index])
      const sideSourceColor = getLodSideColor(material, topSourceColor)
      const x0 = data.worldStartX + x * level.scale
      const z0 = data.worldStartZ + z * level.scale
      const x1 = x0 + level.scale
      const z1 = z0 + level.scale
      const baseY = height + 1 + FAR_SURFACE_Y_BIAS
      let y00 = baseY
      let y10 = baseY
      let y01 = baseY
      let y11 = baseY
      const edgeStart = x * level.scale
      const edgeEnd = Math.min(data.baseSize - 1, edgeStart + level.scale - 1)

      if (z === 0) {
        y00 = blend(y00, sampleEdgeY(data.edgeHeights.north, edgeStart, baseY), EDGE_BLEND_WEIGHT)
        y10 = blend(y10, sampleEdgeY(data.edgeHeights.north, edgeEnd, baseY), EDGE_BLEND_WEIGHT)
      }
      if (z === level.size - 1) {
        y01 = blend(y01, sampleEdgeY(data.edgeHeights.south, edgeStart, baseY), EDGE_BLEND_WEIGHT)
        y11 = blend(y11, sampleEdgeY(data.edgeHeights.south, edgeEnd, baseY), EDGE_BLEND_WEIGHT)
      }
      if (x === 0) {
        const edgeZStart = z * level.scale
        const edgeZEnd = Math.min(data.baseSize - 1, edgeZStart + level.scale - 1)
        y00 = blend(y00, sampleEdgeY(data.edgeHeights.west, edgeZStart, baseY), EDGE_BLEND_WEIGHT)
        y01 = blend(y01, sampleEdgeY(data.edgeHeights.west, edgeZEnd, baseY), EDGE_BLEND_WEIGHT)
      }
      if (x === level.size - 1) {
        const edgeZStart = z * level.scale
        const edgeZEnd = Math.min(data.baseSize - 1, edgeZStart + level.scale - 1)
        y10 = blend(y10, sampleEdgeY(data.edgeHeights.east, edgeZStart, baseY), EDGE_BLEND_WEIGHT)
        y11 = blend(y11, sampleEdgeY(data.edgeHeights.east, edgeZEnd, baseY), EDGE_BLEND_WEIGHT)
      }

      const maxTopDelta = Math.max(Math.abs(y00 - y10), Math.abs(y01 - y11), Math.abs(y00 - y01), Math.abs(y10 - y11))
      const topColor = debugColor ? (maxTopDelta >= DEBUG_STEEP_SLOPE_DELTA ? DEBUG_COLOR_TOP_STEEP : DEBUG_COLOR_TOP) : topSourceColor
      const boundaryColor = debugColor ? DEBUG_COLOR_BOUNDARY : sideSourceColor
      const internalColor = debugColor ? DEBUG_COLOR_INTERNAL : sideSourceColor

      writeQuad(buffers, topIndices, x0, z0, x1, z1, y00, y10, y01, y11, topColor)

      if (DEBUG_DISABLE_SIDE_FACES) continue

      if (boundaryFacesEnabled && z === 0) {
        boundaryCandidateCount += 1
        const northH0 = getEdgeHeight(data, 'north', edgeStart)
        const northH1 = getEdgeHeight(data, 'north', edgeEnd)
        const northBottomY0 = getBoundarySkirtBottomY(y00, northH0)
        const northBottomY1 = getBoundarySkirtBottomY(y10, northH1)
        writeVerticalQuad(buffers, boundaryIndices, x0, northBottomY0, y00, z0, x1, northBottomY1, y10, z0, boundaryColor)
        boundarySideFaceCount += 1
      }
      if (boundaryFacesEnabled && z === level.size - 1) {
        boundaryCandidateCount += 1
        const southH0 = getEdgeHeight(data, 'south', edgeEnd)
        const southH1 = getEdgeHeight(data, 'south', edgeStart)
        const southBottomY0 = getBoundarySkirtBottomY(y11, southH0)
        const southBottomY1 = getBoundarySkirtBottomY(y01, southH1)
        writeVerticalQuad(buffers, boundaryIndices, x1, southBottomY0, y11, z1, x0, southBottomY1, y01, z1, boundaryColor)
        boundarySideFaceCount += 1
      }
      if (boundaryFacesEnabled && x === 0) {
        boundaryCandidateCount += 1
        const westH0 = getEdgeHeight(data, 'west', z * level.scale + level.scale - 1)
        const westH1 = getEdgeHeight(data, 'west', z * level.scale)
        const westBottomY0 = getBoundarySkirtBottomY(y01, westH0)
        const westBottomY1 = getBoundarySkirtBottomY(y00, westH1)
        writeVerticalQuad(buffers, boundaryIndices, x0, westBottomY0, y01, z1, x0, westBottomY1, y00, z0, boundaryColor)
        boundarySideFaceCount += 1
      }
      if (boundaryFacesEnabled && x === level.size - 1) {
        boundaryCandidateCount += 1
        const eastH0 = getEdgeHeight(data, 'east', z * level.scale)
        const eastH1 = getEdgeHeight(data, 'east', z * level.scale + level.scale - 1)
        const eastBottomY0 = getBoundarySkirtBottomY(y10, eastH0)
        const eastBottomY1 = getBoundarySkirtBottomY(y11, eastH1)
        writeVerticalQuad(buffers, boundaryIndices, x1, eastBottomY0, y10, z0, x1, eastBottomY1, y11, z1, boundaryColor)
        boundarySideFaceCount += 1
      }

      if (!GENERATE_INTERNAL_SIDE_FACES || !internalFacesEnabled) continue

      if (z > 0) {
        const northInsideH0 = getRenderableHeightAt(level, x, z - 1)
        const northInsideH1 = getRenderableHeightAt(level, Math.min(level.size - 1, x + 1), z - 1)
        const northBottomY0 = getInternalSkirtBottomY(y00, northInsideH0)
        const northBottomY1 = getInternalSkirtBottomY(y10, northInsideH1)
        writeInternalFace(`hz:${x},${z}`, x0, northBottomY0, y00, z0, x1, northBottomY1, y10, z0, internalColor)
      }
      if (z < level.size - 1) {
        const southInsideH0 = getRenderableHeightAt(level, Math.min(level.size - 1, x + 1), z + 1)
        const southInsideH1 = getRenderableHeightAt(level, x, z + 1)
        const southBottomY0 = getInternalSkirtBottomY(y11, southInsideH0)
        const southBottomY1 = getInternalSkirtBottomY(y01, southInsideH1)
        writeInternalFace(`hz:${x},${z + 1}`, x1, southBottomY0, y11, z1, x0, southBottomY1, y01, z1, internalColor)
      }
      if (x > 0) {
        const westInsideH0 = getRenderableHeightAt(level, x - 1, Math.min(level.size - 1, z + 1))
        const westInsideH1 = getRenderableHeightAt(level, x - 1, z)
        const westBottomY0 = getInternalSkirtBottomY(y01, westInsideH0)
        const westBottomY1 = getInternalSkirtBottomY(y00, westInsideH1)
        writeInternalFace(`vx:${x},${z}`, x0, westBottomY0, y01, z1, x0, westBottomY1, y00, z0, internalColor)
      }
      if (x < level.size - 1) {
        const eastInsideH0 = getRenderableHeightAt(level, x + 1, z)
        const eastInsideH1 = getRenderableHeightAt(level, x + 1, Math.min(level.size - 1, z + 1))
        const eastBottomY0 = getInternalSkirtBottomY(y10, eastInsideH0)
        const eastBottomY1 = getInternalSkirtBottomY(y11, eastInsideH1)
        writeInternalFace(`vx:${x + 1},${z}`, x1, eastBottomY0, y10, z0, x1, eastBottomY1, y11, z1, internalColor)
      }
    }
  }

  logDebugLod('side-face counts', {
    sectionKey: data.sectionKey,
    boundaryCandidates: boundaryCandidateCount,
    boundary: boundarySideFaceCount,
    internal: internalSideFaceCount,
  })

  const geometry = new BufferGeometry()
  const combinedIndices = topIndices.concat(boundaryIndices, internalIndices)
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(buffers.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(buffers.colors), 3))
  geometry.setIndex(combinedIndices)
  geometry.clearGroups()
  geometry.addGroup(0, topIndices.length, 0)
  if (boundaryIndices.length > 0) {
    geometry.addGroup(topIndices.length, boundaryIndices.length, 1)
  }
  if (internalIndices.length > 0) {
    geometry.addGroup(topIndices.length + boundaryIndices.length, internalIndices.length, 2)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return {
    geometry,
    topTriangleCount: Math.floor(topIndices.length / 3),
    boundaryTriangleCount: Math.floor(boundaryIndices.length / 3),
    internalTriangleCount: Math.floor(internalIndices.length / 3),
  }
}
