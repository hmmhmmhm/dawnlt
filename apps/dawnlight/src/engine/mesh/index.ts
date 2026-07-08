/**
 * Mesh module - handles chunk mesh generation and disposal
 *
 * This module is responsible for:
 * - Building chunk meshes from block data (2D and 3D variants)
 * - Handling special block rendering (starfish, pebbles, vines, vegetation)
 * - Managing mesh disposal and cleanup
 */

export { AO_FACTORS, calculateAO } from './ambient-occlusion'
// Export main mesh building functions
export { buildChunkMesh } from './build-2d'
export { buildChunkMesh3D } from './build-3d'
// Export disposal functions
export { cleanupChunkMeshes, disposeMesh } from './disposal'
export { faceData } from './face-definitions'
export { buildMeshesFromBuffers } from './geometry'
// Export types for consumers
export type { FaceDefinition, GetBlockFn, MeshBuffers } from './types'
// Export utilities for advanced use cases
export { createMeshBuffers } from './types'
