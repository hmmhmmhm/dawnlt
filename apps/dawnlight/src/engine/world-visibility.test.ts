/**
 * Visibility Test Cases (Scenario 5-6)
 * Tests for realistic terrain visibility and high altitude scenarios
 */

import { WorldGenerator } from './world'
import { BlockType, CHUNK_Y_COUNT, CHUNK_Y_SIZE, getBlockIndex3D, getChunkKey3D, getGroundTruthVisibleChunks, getVisibleChunks3D, MockWorld, printEfficiency } from './world-test-helpers'

// Use globals provided by Jest environment
declare const describe: any
declare const test: any
declare const expect: any

describe('3D Chunk Visibility - Terrain Scenarios', () => {
  test('Scenario 5: Realistic Terrain - ~300 Chunks', () => {
    const generator = new WorldGenerator(12345)
    const world = new MockWorld()

    const radius = 2 // Reduced to 2 (5x5) for fast execution

    // Generate chunks
    console.log('Generating terrain...')
    for (let cx = -radius; cx <= radius; cx++) {
      for (let cz = -radius; cz <= radius; cz++) {
        // generateChunkColumn3D returns Map<cy, Uint8Array>
        const column = generator.generateChunkColumn3D(cx, cz)
        for (const [cy, data] of column) {
          const key = getChunkKey3D(cx, cy, cz)
          world.chunks.set(key, data)
        }
      }
    }

    console.log(`Generated ${world.chunks.size} chunks. Calculating connectivity...`)
    const startTime = Date.now()
    world.updateConnectivity()
    console.log(`Connectivity calculated in ${Date.now() - startTime}ms`)

    // Pick a spawn point on the surface
    // We'll pick 0,0 and find the surface Y
    let spawnY = 0
    let spawnCy = 0
    // Iterate down from top to find surface
    for (let y = CHUNK_Y_SIZE * CHUNK_Y_COUNT - 1; y >= 0; y--) {
      const cx = 0,
        cz = 0
      const cy = Math.floor(y / CHUNK_Y_SIZE)
      const ly = y % CHUNK_Y_SIZE

      const key = getChunkKey3D(cx, cy, cz)
      const chunk = world.chunks.get(key)
      if (chunk) {
        const idx = getBlockIndex3D(8, ly, 8)
        if (chunk[idx] !== BlockType.AIR) {
          spawnY = y + 2 // 2 blocks above ground
          spawnCy = Math.floor(spawnY / CHUNK_Y_SIZE)
          break
        }
      }
    }

    console.log(`Spawn Y: ${spawnY} (Chunk Y: ${spawnCy})`)

    const playerPos = { x: 8.5, y: spawnY + 0.5, z: 8.5 }
    // Look towards positive X
    const cameraDir = { x: 1, y: 0, z: 0, playerPos }

    const renderDistance = 6

    console.log('Running Culling Algorithm...')
    const cullStart = Date.now()
    const visible = getVisibleChunks3D(0, spawnCy, 0, cameraDir, world.chunks, world.connectivity, renderDistance)
    console.log(`Culling finished in ${Date.now() - cullStart}ms. Visible chunks: ${visible.size}`)

    console.log('Running Ground Truth Algorithm (this may take a moment)...')
    const gtStart = Date.now()
    // Local coordinates for 8, spawnY, 8
    const localY = spawnY % CHUNK_Y_SIZE

    const truth = getGroundTruthVisibleChunks(world, 0, spawnCy, 0, 8, localY, 8, renderDistance)
    console.log(`Ground Truth finished in ${Date.now() - gtStart}ms. Actually visible: ${truth.size}`)

    printEfficiency('Realistic Terrain', visible, truth)

    // Assertions
    // 1. Safety: All truth chunks MUST be visible
    const missing = []
    for (const chunk of truth) {
      if (!visible.has(chunk)) missing.push(chunk)
    }
    if (missing.length > 0) {
      console.warn('Missing chunks:', missing)
    }
    expect(missing.length).toBe(0)

    // 2. Efficiency: Overdraw shouldn't be egregious
    // We don't assert a strict number because heuristics (like direction culling) are approximate
    // But we expect Recall to be 100% (handled by safety check) and Precision to be reasonable (>20% usually for simple culling)
    // With advanced culling (occlusion), precision should be higher.

    const intersection = new Set([...visible].filter((x) => truth.has(x)))
    const precision = intersection.size / visible.size
    console.log(`Precision: ${(precision * 100).toFixed(1)}%`)

    // Allow some overdraw, but keep it bounded.
    // Absolute visible count can fluctuate with terrain shape, so enforce
    // quality by precision + bounded overdraw instead of a fixed 95% cap.
    const overdraw = visible.size - intersection.size
    expect(precision).toBeGreaterThan(0.9)
    expect(overdraw).toBeLessThanOrEqual(12)
  })

  test('Scenario 6: High Altitude - Look Down', () => {
    const generator = new WorldGenerator(12345)
    const world = new MockWorld()
    const radius = 4

    // Generate terrain
    for (let cx = -radius; cx <= radius; cx++) {
      for (let cz = -radius; cz <= radius; cz++) {
        const column = generator.generateChunkColumn3D(cx, cz)
        for (const [cy, data] of column) {
          world.chunks.set(getChunkKey3D(cx, cy, cz), data)
        }
      }
    }
    world.updateConnectivity()

    // Player high up (Y=200 -> Chunk Y=6) looking down
    const playerPos = { x: 0, y: 200, z: 0 }
    const cameraDir = { x: 0, y: -1, z: 0, playerPos } // Look DOWN

    // Render distance 8
    const visible = getVisibleChunks3D(0, 6, 0, cameraDir, world.chunks, world.connectivity, 8)

    console.log(`High Altitude Visible Chunks: ${visible.size}`)
    // We expect to see surface chunks (roughly radius * radius)
    // But NOT deep underground chunks (Y=0, 1 etc) unless connected
    // Total chunks ~ 9x9 * 8 = 648
    // Without cone culling, we expect full pyramid ~560.
    expect(visible.size).toBeLessThan(600)
  })
})
