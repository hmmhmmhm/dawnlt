/**
 * Connectivity Test Cases (Scenario 1-4)
 * Tests for basic chunk connectivity and culling behavior
 */

import { BlockType, CHUNK_Y_SIZE, getChunkKey3D, getGroundTruthVisibleChunks, getVisibleChunks3D, MockWorld, printEfficiency } from './world-test-helpers'

// Use globals provided by Jest environment
declare const describe: any
declare const test: any
declare const expect: any

describe('3D Chunk Connectivity - Basic Scenarios', () => {
  test('Scenario 1: Sealed Room (1x1) - Should only see current chunk', () => {
    const world = new MockWorld()
    const cx = 0,
      cy = 5,
      cz = 0

    // Create a solid chunk first
    world.createChunk(cx, cy, cz, BlockType.STONE)

    // Carve a small 1x1 room in center
    world.setBlock(cx, cy, cz, 8, 8, 8, BlockType.AIR)

    // Create a neighbor chunk that is AIR (should NOT be visible)
    world.createChunk(cx + 1, cy, cz, BlockType.AIR)

    world.updateConnectivity()

    const playerPos = { x: 8.5, y: cy * CHUNK_Y_SIZE + 8.5, z: 8.5 }
    // Camera pointing towards the neighbor
    const cameraDir = { x: 1, y: 0, z: 0, playerPos }

    const visible = getVisibleChunks3D(
      cx,
      cy,
      cz,
      cameraDir,
      world.chunks,
      world.connectivity,
      4, // maxDist
    )

    // Ground Truth
    const truth = getGroundTruthVisibleChunks(world, cx, cy, cz, 8, 8, 8, 4)

    printEfficiency('Sealed Room', visible, truth)

    // Assertions
    expect(visible.has(getChunkKey3D(cx, cy, cz))).toBe(true)
    expect(visible.has(getChunkKey3D(cx + 1, cy, cz))).toBe(false)

    // Safety Check
    for (const chunk of truth) {
      expect(visible.has(chunk)).toBe(true)
    }
  })

  test('Scenario 2: Boundary Straddling Room - Should see both chunks but not outside', () => {
    const world = new MockWorld()
    const cy = 5

    // Chunk 0,0,0 and 1,0,0
    world.createChunk(0, cy, 0, BlockType.STONE)
    world.createChunk(1, cy, 0, BlockType.STONE)
    world.createChunk(2, cy, 0, BlockType.AIR) // Outside world, should be hidden

    // Carve room crossing boundary
    // Chunk 0: x=15 is AIR
    // Chunk 1: x=0 is AIR
    world.setBlock(0, cy, 0, 15, 15, 8, BlockType.AIR)
    world.setBlock(1, cy, 0, 0, 15, 8, BlockType.AIR)

    world.updateConnectivity()

    // Player at 0,0,0 boundary (x=15.5)
    const playerPos = { x: 15.5, y: cy * CHUNK_Y_SIZE + 15.5, z: 8.5 }
    const cameraDir = { x: 1, y: 0, z: 0, playerPos }

    const visible = getVisibleChunks3D(0, cy, 0, cameraDir, world.chunks, world.connectivity, 4)

    // Ground Truth
    const truth = getGroundTruthVisibleChunks(world, 0, cy, 0, 15, 15, 8, 4)

    printEfficiency('Straddle Room', visible, truth)

    expect(visible.has('0,5,0')).toBe(true)
    expect(visible.has('1,5,0')).toBe(true)
    expect(visible.has('2,5,0')).toBe(false) // Should not see chunk 2

    // Safety
    for (const chunk of truth) {
      expect(visible.has(chunk)).toBe(true)
    }
  })

  test('Scenario 3: Zig-Zag Tunnel - Frustum/Direction Culling check', () => {
    const world = new MockWorld()
    const cy = 5

    // Create a snake tunnel: 0,0 -> 1,0 -> 1,1 -> 2,1
    // All embedded in stone
    for (let x = 0; x <= 3; x++) {
      for (let z = 0; z <= 3; z++) {
        world.createChunk(x, cy, z, BlockType.STONE)
      }
    }

    // Path construction:
    // 1. Chunk 0,0: Center (8,15,8) -> East Exit (15,15,8)
    for (let x = 8; x <= 15; x++) world.setBlock(0, cy, 0, x, 15, 8, BlockType.AIR)

    // 2. Chunk 1,0: West Entry (0,15,8) -> Center (8,15,8) -> South Exit (8,15,15)
    for (let x = 0; x <= 8; x++) world.setBlock(1, cy, 0, x, 15, 8, BlockType.AIR)
    for (let z = 8; z <= 15; z++) world.setBlock(1, cy, 0, 8, 15, z, BlockType.AIR)

    // 3. Chunk 1,1: North Entry (8,15,0) -> Center (8,15,8) -> East Exit (15,15,8)
    for (let z = 0; z <= 8; z++) world.setBlock(1, cy, 1, 8, 15, z, BlockType.AIR)
    for (let x = 8; x <= 15; x++) world.setBlock(1, cy, 1, x, 15, 8, BlockType.AIR)

    world.updateConnectivity()

    // Player at 0,0 looking East
    const playerPos = { x: 8.5, y: cy * CHUNK_Y_SIZE + 15.5, z: 8.5 }
    const cameraDir = { x: 1, y: 0, z: 0, playerPos } // Look East

    const visible = getVisibleChunks3D(0, cy, 0, cameraDir, world.chunks, world.connectivity, 4)

    // Ground Truth (Use same start pos)
    const truth = getGroundTruthVisibleChunks(world, 0, cy, 0, 8, 15, 8, 4)

    printEfficiency('ZigZag Tunnel', visible, truth)

    expect(visible.has('0,5,0')).toBe(true)
    expect(visible.has('1,5,0')).toBe(true)
    expect(visible.has('1,5,1')).toBe(true) // Connected and reachable

    // Safety Check
    for (const chunk of truth) {
      expect(visible.has(chunk)).toBe(true)
    }
  })

  test('Scenario 4: X-Ray Prevention - Parallel tunnels', () => {
    // Better Setup:
    // Chunk 0 (Player) -> Connects to Chunk 1 (East)
    // Chunk 0 also adjacent to Chunk 2 (South) but separated by wall

    const world = new MockWorld()
    const cy = 5

    world.createChunk(0, cy, 0, BlockType.STONE)
    world.createChunk(1, cy, 0, BlockType.AIR) // East neighbor (Open air)
    world.createChunk(0, cy, 1, BlockType.AIR) // South neighbor (Open air, but walled off)

    // Carve path in Chunk 0: Center -> East Exit
    for (let x = 8; x <= 15; x++) world.setBlock(0, cy, 0, x, 15, 8, BlockType.AIR)

    // Ensure South wall is solid (it is by default as we only carved East)
    // Check specific block at South boundary
    // z=15 is STONE.

    world.updateConnectivity()

    const pPos2 = { x: 8.5, y: cy * 32 + 15.5, z: 8.5 }
    const cam2 = { x: 1, y: 0, z: 0, playerPos: pPos2 }

    const visible = getVisibleChunks3D(0, cy, 0, cam2, world.chunks, world.connectivity, 4)

    // Ground Truth
    const truth = getGroundTruthVisibleChunks(world, 0, cy, 0, 8, 15, 8, 4)

    printEfficiency('X-Ray Prevention', visible, truth)

    expect(visible.has('0,5,0')).toBe(true)
    expect(visible.has('1,5,0')).toBe(true) // East is connected
    expect(visible.has('0,5,1')).toBe(false) // South is solid wall, should be hidden

    // Safety Check
    for (const chunk of truth) {
      expect(visible.has(chunk)).toBe(true)
    }
  })
})
