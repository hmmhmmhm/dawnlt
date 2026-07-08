/**
 * World Module - Chunk system integration and re-exports
 *
 * This file is the central entry point for various chunk system modules:
 * - chunk-2d: Traditional 2D chunk system (16x128x16)
 * - chunk-3d: 3D chunk system (16x32x16)
 * - chunk-visibility: Visibility and occlusion culling
 * - chunk-connectivity: Connectivity graph and advanced cave culling
 */

// ============================================================================
// WorldGenerator re-export
// ============================================================================
export { WorldGenerator } from '../shared/world-generator'

// ============================================================================
// 2D Chunk System
// ============================================================================
export {
  getBlock,
  getBlockIndex,
  getChunkKey,
  getChunksInRadius,
  getChunkYRange,
  setBlock,
  worldToChunk,
} from './chunk-2d'

// ============================================================================
// 3D Chunk System
// ============================================================================
export {
  getBlock3D,
  getBlockIndex3D,
  getChunk3DYRange,
  getChunkKey3D,
  getChunksInRadius3D,
  setBlock3D,
  worldToChunk3D,
} from './chunk-3d'
// ============================================================================
// Chunk Connectivity & Advanced Culling
// ============================================================================
export {
  areFacesConnected,
  type ChunkConnectivity,
  ChunkFace,
  calculateChunkConnectivity,
  getReachableFacesFromPosition,
  getVisibleChunks3D,
  isSurfaceChunk,
} from './chunk-connectivity'
// ============================================================================
// Chunk Visibility & Occlusion
// ============================================================================
export {
  isChunk3DEmpty,
  isChunk3DOccluded,
  isChunk3DVisible,
} from './chunk-visibility'
