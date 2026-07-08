/**
 * Type definitions for mesh worker
 */

export interface MeshWorkerInput {
  type: 'buildMesh' | 'buildMesh3D' | 'generateAndMesh3D'
  cx: number
  cy?: number // For 3D chunks
  cz: number
  chunkData?: Uint8Array // Optional for generateAndMesh3D
  neighborChunks: { [key: string]: Uint8Array }
  taskId: number
}

export interface MeshData {
  vertices: Float32Array
  normals: Float32Array
  uvs: Float32Array
  colors: Float32Array
  indices: Uint32Array
}

export interface FoliageMeshData extends MeshData {
  windWeights: Float32Array
}

export interface MeshWorkerOutput {
  type: 'meshBuilt' | 'chunkGenerated'
  taskId: number
  cx: number
  cy?: number // For 3D chunks
  cz: number
  minY: number
  maxY: number
  chunkData?: Uint8Array // For chunkGenerated type
  solid: MeshData | null
  transparent: MeshData | null
  foliage: FoliageMeshData | null
  fluid: MeshData | null
}

export type GetBlockFn = (x: number, y: number, z: number) => number

/**
 * Mesh buffers for accumulating geometry data
 */
export interface MeshBuffers {
  vertices: number[]
  normals: number[]
  uvs: number[]
  indices: number[]
  colors: number[]
}

export interface FoliageMeshBuffers extends MeshBuffers {
  windWeights: number[]
}
