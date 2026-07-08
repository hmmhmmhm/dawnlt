import type { BlockType } from '../../types'

// Function type for getting a block at a specific position
export type GetBlockFn = (x: number, y: number, z: number) => BlockType

// Face data structure for mesh generation
export interface FaceDefinition {
  dir: [number, number, number]
  corners: [number, number, number][]
  shade: number
}

// Mesh buffer arrays for building chunk meshes
export interface MeshBuffers {
  solidVertices: number[]
  solidNormals: number[]
  solidUvs: number[]
  solidIndices: number[]
  solidColors: number[]

  transparentVertices: number[]
  transparentNormals: number[]
  transparentUvs: number[]
  transparentIndices: number[]
  transparentColors: number[]

  foliageVertices: number[]
  foliageNormals: number[]
  foliageUvs: number[]
  foliageIndices: number[]
  foliageColors: number[]
  foliageWindWeights: number[]

  fluidVertices: number[]
  fluidNormals: number[]
  fluidUvs: number[]
  fluidIndices: number[]
  fluidColors: number[]
}

// Create empty mesh buffers
export function createMeshBuffers(): MeshBuffers {
  return {
    solidVertices: [],
    solidNormals: [],
    solidUvs: [],
    solidIndices: [],
    solidColors: [],

    transparentVertices: [],
    transparentNormals: [],
    transparentUvs: [],
    transparentIndices: [],
    transparentColors: [],

    foliageVertices: [],
    foliageNormals: [],
    foliageUvs: [],
    foliageIndices: [],
    foliageColors: [],
    foliageWindWeights: [],

    fluidVertices: [],
    fluidNormals: [],
    fluidUvs: [],
    fluidIndices: [],
    fluidColors: [],
  }
}
