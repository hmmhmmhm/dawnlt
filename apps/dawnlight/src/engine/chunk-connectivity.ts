import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE } from '../constants'
import { isBlockOpaque } from '../shared/block-utils'
import { getBlockIndex3D, getChunkKey3D } from './chunk-3d'

/**
 * Advanced cave culling algorithm.
 * Uses a chunk connectivity graph to avoid drawing sealed underground spaces.
 * Cave culling through connectivity graph
 */

/**
 * Chunk face indices (for connectivity graph)
 * Each chunk stores which faces can "see" each other through air blocks
 */
export enum ChunkFace {
  NEG_X = 0, // Left (-X)
  POS_X = 1, // Right (+X)
  NEG_Y = 2, // Bottom (-Y)
  POS_Y = 3, // Top (+Y)
  NEG_Z = 4, // Back (-Z)
  POS_Z = 5, // Front (+Z)
}

// Direction vectors for each face
const FACE_DIRECTIONS: Record<ChunkFace, [number, number, number]> = {
  [ChunkFace.NEG_X]: [-1, 0, 0],
  [ChunkFace.POS_X]: [1, 0, 0],
  [ChunkFace.NEG_Y]: [0, -1, 0],
  [ChunkFace.POS_Y]: [0, 1, 0],
  [ChunkFace.NEG_Z]: [0, 0, -1],
  [ChunkFace.POS_Z]: [0, 0, 1],
}

// Opposite face mapping
const OPPOSITE_FACE: Record<ChunkFace, ChunkFace> = {
  [ChunkFace.NEG_X]: ChunkFace.POS_X,
  [ChunkFace.POS_X]: ChunkFace.NEG_X,
  [ChunkFace.NEG_Y]: ChunkFace.POS_Y,
  [ChunkFace.POS_Y]: ChunkFace.NEG_Y,
  [ChunkFace.NEG_Z]: ChunkFace.POS_Z,
  [ChunkFace.POS_Z]: ChunkFace.NEG_Z,
}

/**
 * Chunk connectivity data - 15 bits representing which face pairs are connected
 * Bit index = face1 * 6 + face2 (when face1 < face2)
 */
export type ChunkConnectivity = number

/**
 * Get bit index for face pair (order independent)
 */
function getFacePairIndex(face1: ChunkFace, face2: ChunkFace): number {
  const min = Math.min(face1, face2)
  const max = Math.max(face1, face2)
  // Map 15 unique pairs to 0-14
  return min * 6 + max - (min * (min + 1)) / 2 - min - 1
}

/**
 * Check if two faces are connected in connectivity data
 */
export function areFacesConnected(connectivity: ChunkConnectivity, face1: ChunkFace, face2: ChunkFace): boolean {
  if (face1 === face2) return true // Same face is always "connected"
  const bitIndex = getFacePairIndex(face1, face2)
  return (connectivity & (1 << bitIndex)) !== 0
}

/**
 * Set two faces as connected in connectivity data
 */
function setFacesConnected(connectivity: ChunkConnectivity, face1: ChunkFace, face2: ChunkFace): ChunkConnectivity {
  if (face1 === face2) return connectivity
  const bitIndex = getFacePairIndex(face1, face2)
  return connectivity | (1 << bitIndex)
}

/**
 * Calculate connectivity graph of 3D chunk using flood fill
 * Returns 15-bit number representing face pairs connected through air
 */
export function calculateChunkConnectivity(chunkData: Uint8Array): ChunkConnectivity {
  let connectivity: ChunkConnectivity = 0
  const visited = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)

  // Perform flood fill for each non-opaque block to find connected faces
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = 0; y < CHUNK_Y_SIZE; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const idx = getBlockIndex3D(x, y, z)
        if (visited[idx] || isBlockOpaque(chunkData[idx])) continue

        // Start flood fill from this block
        const reachedFaces = new Set<ChunkFace>()
        const stack: [number, number, number][] = [[x, y, z]]

        while (stack.length > 0) {
          const [cx, cy, cz] = stack.pop()!
          const cIdx = getBlockIndex3D(cx, cy, cz)

          if (visited[cIdx]) continue
          if (isBlockOpaque(chunkData[cIdx])) continue

          visited[cIdx] = 1

          // Check if reached chunk face
          if (cx === 0) reachedFaces.add(ChunkFace.NEG_X)
          if (cx === CHUNK_SIZE - 1) reachedFaces.add(ChunkFace.POS_X)
          if (cy === 0) reachedFaces.add(ChunkFace.NEG_Y)
          if (cy === CHUNK_Y_SIZE - 1) reachedFaces.add(ChunkFace.POS_Y)
          if (cz === 0) reachedFaces.add(ChunkFace.NEG_Z)
          if (cz === CHUNK_SIZE - 1) reachedFaces.add(ChunkFace.POS_Z)

          // Add neighbors to stack
          if (cx > 0) stack.push([cx - 1, cy, cz])
          if (cx < CHUNK_SIZE - 1) stack.push([cx + 1, cy, cz])
          if (cy > 0) stack.push([cx, cy - 1, cz])
          if (cy < CHUNK_Y_SIZE - 1) stack.push([cx, cy + 1, cz])
          if (cz > 0) stack.push([cx, cy, cz - 1])
          if (cz < CHUNK_SIZE - 1) stack.push([cx, cy, cz + 1])
        }

        // Connect all reached faces to each other
        const faces = Array.from(reachedFaces)
        for (let i = 0; i < faces.length; i++) {
          for (let j = i + 1; j < faces.length; j++) {
            connectivity = setFacesConnected(connectivity, faces[i], faces[j])
          }
        }
      }
    }
  }

  return connectivity
}

/**
 * Check if chunk is a surface chunk (should always be visible)
 * Only chunks with Y >= 32 (cy >= 1) that are exposed to sky are considered surface chunks
 */
export function isSurfaceChunk(cy: number, connectivity: ChunkConnectivity): boolean {
  // Only chunks with Y >= 32 (cy >= 1) are considered potential surface chunks
  // For lowered terrain (average height ~45), surface is around cy=1
  if (cy < 1) return false

  // Check if POS_Y (top) face is connected to horizontal faces
  // This means chunk has air reaching both top and sides (open to sky)
  for (let face = 0; face < 6; face++) {
    if (face === ChunkFace.POS_Y || face === ChunkFace.NEG_Y) continue
    if (areFacesConnected(connectivity, ChunkFace.POS_Y, face as ChunkFace)) {
      return true
    }
  }
  return false
}

/**
 * Get reachable faces from a specific position within chunk
 * Used to check which exits are valid from player's exact position
 */
export function getReachableFacesFromPosition(chunkData: Uint8Array, localX: number, localY: number, localZ: number): Set<ChunkFace> {
  const reachable = new Set<ChunkFace>()

  // If starting from solid block, nothing can be reached
  const startIdx = getBlockIndex3D(localX, localY, localZ)
  if (isBlockOpaque(chunkData[startIdx])) {
    return reachable
  }

  const visited = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
  const stack: [number, number, number][] = [[localX, localY, localZ]]
  visited[startIdx] = 1

  while (stack.length > 0) {
    const [cx, cy, cz] = stack.pop()!

    // Check boundaries
    if (cx === 0) reachable.add(ChunkFace.NEG_X)
    if (cx === CHUNK_SIZE - 1) reachable.add(ChunkFace.POS_X)
    if (cy === 0) reachable.add(ChunkFace.NEG_Y)
    if (cy === CHUNK_Y_SIZE - 1) reachable.add(ChunkFace.POS_Y)
    if (cz === 0) reachable.add(ChunkFace.NEG_Z)
    if (cz === CHUNK_SIZE - 1) reachable.add(ChunkFace.POS_Z)

    // Early exit if all faces reachable (optimization)
    if (reachable.size === 6) return reachable

    // Add neighbors
    const neighbors = [
      [cx + 1, cy, cz],
      [cx - 1, cy, cz],
      [cx, cy + 1, cz],
      [cx, cy - 1, cz],
      [cx, cy, cz + 1],
      [cx, cy, cz - 1],
    ]

    for (const [nx, ny, nz] of neighbors) {
      if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_Y_SIZE && nz >= 0 && nz < CHUNK_SIZE) {
        const nIdx = getBlockIndex3D(nx, ny, nz)
        if (!visited[nIdx] && !isBlockOpaque(chunkData[nIdx])) {
          visited[nIdx] = 1
          stack.push([nx, ny, nz])
        }
      }
    }
  }

  return reachable
}

/**
 * BFS-based visibility traversal using connectivity graph
 * Returns set of visible chunk keys
 *
 * Key insight: Surface chunks (sky-exposed) are always visible.
 * Only underground chunks (not sky-exposed) use connectivity culling.
 */
export function getVisibleChunks3D(
  playerCx: number,
  playerCy: number,
  playerCz: number,
  cameraDir: { x: number; y: number; z: number; playerPos?: { x: number; y: number; z: number } },
  chunks3D: Map<string, Uint8Array>,
  chunkConnectivity: Map<string, ChunkConnectivity>,
  maxDistance: number,
  maxSteps: number = 32,
): Set<string> {
  const visible = new Set<string>()

  // BFS queue: [cx, cy, cz, entryFace, steps]
  // entryFace is the face we entered this chunk from (-1 for start chunk)
  const queue: Array<[number, number, number, ChunkFace | -1, number]> = []
  const visited = new Map<string, Set<ChunkFace | -1>>() // Track which faces we entered each chunk from

  // Start from player chunk
  const startKey = getChunkKey3D(playerCx, playerCy, playerCz)

  // [Starting chunk optimization]
  // Instead of assuming full connectivity, check which faces are actually
  // reachable from player's specific position within the chunk.
  // This fixes the "sealed room" bug where you could see outside when in enclosed spaces.
  const startChunkData = chunks3D.get(startKey)
  let reachableStartFaces: Set<ChunkFace> | null = null

  if (startChunkData) {
    // Calculate local position
    // Note: handle modulo for negatives if needed, but cx/cy/cz are floor
    const localX = Math.floor((cameraDir as { playerPos?: { x: number; y: number; z: number } }).playerPos?.x ?? 0) - playerCx * CHUNK_SIZE
    const localY = Math.floor((cameraDir as { playerPos?: { x: number; y: number; z: number } }).playerPos?.y ?? 0) - playerCy * CHUNK_Y_SIZE
    const localZ = Math.floor((cameraDir as { playerPos?: { x: number; y: number; z: number } }).playerPos?.z ?? 0) - playerCz * CHUNK_SIZE

    // Validate local boundaries
    if (localX >= 0 && localX < CHUNK_SIZE && localY >= 0 && localY < CHUNK_Y_SIZE && localZ >= 0 && localZ < CHUNK_SIZE) {
      reachableStartFaces = getReachableFacesFromPosition(startChunkData, localX, localY, localZ)
    }
  }

  queue.push([playerCx, playerCy, playerCz, -1, 0])
  visited.set(startKey, new Set([-1]))

  while (queue.length > 0) {
    const [cx, cy, cz, entryFace, steps] = queue.shift()!
    const key = getChunkKey3D(cx, cy, cz)

    // Check distance
    const dx = cx - playerCx
    const dy = cy - playerCy
    const dz = cz - playerCz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist > maxDistance + 1) continue

    // Check step limit
    if (steps > maxSteps) continue

    // Get connectivity for this chunk
    const connectivity = chunkConnectivity.get(key)

    // If no connectivity data, treat chunk as solid (blocked)
    // This prevents BFS from "jumping" through unloaded/unknown chunks
    // Also prevents adding non-existent chunks to visible set (optimization)
    if (connectivity === undefined) {
      continue
    }

    // Mark as visible
    visible.add(key)

    // Try to exit through each face
    for (let exitFace = 0; exitFace < 6; exitFace++) {
      const face = exitFace as ChunkFace

      // Connectivity check: can we go from entry face to exit face?
      // [Strict mode] Always require connectivity, even for surface chunks
      // This prevents visibility from "leaking" to other caves through solid ground
      if (entryFace !== -1) {
        if (!areFacesConnected(connectivity, entryFace, face)) {
          continue // Cannot see from entry to exit through this chunk
        }
      } else {
        // [Starting chunk check]
        // If in starting chunk (entryFace === -1), check if this exit face
        // is actually reachable from player position
        if (reachableStartFaces && !reachableStartFaces.has(face)) {
          continue // Player is blocked from this exit
        }
      }

      // Get neighbor chunk
      const [fdx, fdy, fdz] = FACE_DIRECTIONS[face]
      const ncx = cx + fdx
      const ncy = cy + fdy
      const ncz = cz + fdz

      // Clamp Y to valid range
      if (ncy < 0 || ncy >= CHUNK_Y_COUNT) continue

      // Calculate base step penalty for graph traversal.
      let stepPenalty = 1

      // [Direction optimization]
      // Aggressive culling based on camera direction
      // Skip if neighbor is "behind" camera relative to current chunk
      // This is a simple form of frustum culling within graph traversal
      if (entryFace !== -1) {
        // Vector to neighbor
        const toNeighborX = fdx
        const toNeighborY = fdy
        const toNeighborZ = fdz

        // Dot product with camera direction
        const dot = toNeighborX * cameraDir.x + toNeighborY * cameraDir.y + toNeighborZ * cameraDir.z

        // If dot is negative, moving opposite to camera view direction
        // Allow some backward movement (-0.5) for wide FOV, but cull strict backward
        if (dot < -0.5) {
          // Heavily penalize backward traversal
          // This allows seeing slightly behind (for peripheral vision) but prevents deep backward recursion
          stepPenalty += 5
        }

        // When looking mostly up/down, horizontal expansion should be limited.
        // Otherwise BFS tends to spread almost flat across many columns.
        if (Math.abs(cameraDir.y) >= 0.7 && fdy === 0) {
          stepPenalty += 3
        }
      }

      const neighborKey = getChunkKey3D(ncx, ncy, ncz)
      const neighborEntryFace = OPPOSITE_FACE[face]

      // Check if already visited this chunk with this face
      let visitedFaces = visited.get(neighborKey)
      if (!visitedFaces) {
        visitedFaces = new Set()
        visited.set(neighborKey, visitedFaces)
      }
      if (visitedFaces.has(neighborEntryFace)) continue
      visitedFaces.add(neighborEntryFace)

      // Increase penalty for going down (harder to see depth)
      if (fdy < 0) stepPenalty += 1

      // Increase penalty for zigzag (axis change)
      // Heuristic: straight lines cost less
      // Axis can be inferred from face index (0-1: X, 2-3: Y, 4-5: Z)
      const currentAxis = Math.floor(face / 2)
      const entryAxis = entryFace !== -1 ? Math.floor(entryFace / 2) : -1
      if (entryAxis !== -1 && currentAxis !== entryAxis) {
        stepPenalty += 1
      }

      queue.push([ncx, ncy, ncz, neighborEntryFace, steps + stepPenalty])
    }
  }

  return visible
}
