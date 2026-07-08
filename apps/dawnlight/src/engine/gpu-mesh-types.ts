/**
 * Type definitions for GPU Mesh Generation
 */

export interface GPUMeshResult {
  vertices: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint32Array
  faceCount: number
}

export interface ChunkNeighbors {
  nx: Uint8Array | null
  px: Uint8Array | null
  nz: Uint8Array | null
  pz: Uint8Array | null
}
