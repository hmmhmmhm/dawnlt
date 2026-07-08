import type { BlockType } from '../../../shared/block-types'

export interface LodEdgeHeights {
  north: Int16Array
  south: Int16Array
  west: Int16Array
  east: Int16Array
}

export interface LodMipmapLevel {
  scale: number
  size: number
  heights: Int16Array
  materials: Uint8Array
  colors: Uint32Array
}

export interface LodOccupancyLevel {
  scale: number
  size: number
  topHeights: Int16Array
  bottomHeights: Int16Array
  materials: Uint8Array
  colors: Uint32Array
}

export interface LodWaterLevel {
  scale: number
  size: number
  surfaceHeights: Int16Array
}

export interface TreeLodVoxel {
  x: number
  y: number
  z: number
  block: BlockType
}

export interface TreeLodSectionData {
  sectionKey: string
  worldStartX: number
  worldStartZ: number
  voxels: TreeLodVoxel[]
}

export interface LodSectionRenderData {
  sectionKey: string
  level: number
  worldStartX: number
  worldStartZ: number
  baseSize: number
  levels: LodMipmapLevel[]
  occupancyLevels?: LodOccupancyLevel[]
  waterLevels?: LodWaterLevel[]
  treeData?: TreeLodSectionData
  edgeHeights: LodEdgeHeights
}

export interface LodSectionBuildInput {
  sectionKey: string
  sectionX: number
  sectionZ: number
  level: number
  chunksByKey: Record<string, Uint8Array>
  minCy: number
  maxCy: number
}

export interface LodColumnSample {
  height: number
  material: BlockType
  color: number
}
