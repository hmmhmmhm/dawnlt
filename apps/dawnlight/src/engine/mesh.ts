/**
 * Mesh module - re-exports from the mesh directory
 *
 * This file maintains backward compatibility with existing imports.
 * All functionality has been split into separate modules under ./mesh/
 */

export { buildChunkMesh, buildChunkMesh3D, cleanupChunkMeshes, disposeMesh } from './mesh/index'
