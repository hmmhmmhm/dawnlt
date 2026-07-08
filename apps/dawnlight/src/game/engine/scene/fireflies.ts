/**
 * Firefly system for SceneSystem
 * Firefly initialization and update logic
 */
import type { BufferGeometry, PerspectiveCamera, PointLight, Points } from 'three'
import { CHUNK_SIZE } from '../../../constants'
import { getTerrainHeight } from './terrain-utils'

export interface FireflyData {
  positions: Float32Array
  basePositions: Float32Array
  phases: Float32Array
}

export interface FireflyContext {
  fireflies: Points
  fireflyData: FireflyData
  fireflyLights: PointLight[]
  chunks3D: Map<string, Uint8Array>
  camera: PerspectiveCamera
  renderDistance: number
}

/**
 * Initialize firefly positions to match terrain (called after chunk load)
 * Fireflies are distributed across the loaded map to illuminate terrain.
 */
export function initializeFireflyPositions(context: FireflyContext): void {
  const { fireflies, fireflyData, camera, chunks3D } = context

  const fireflyGeometry = fireflies.geometry as BufferGeometry
  const positions = fireflyGeometry.attributes.position.array as Float32Array

  const fireflyCount = fireflyData.positions.length / 3

  // Spread fireflies across the entire render distance
  const spawnRange = context.renderDistance * CHUNK_SIZE

  console.log(`[SceneSystem] Initializing ${fireflyCount} fireflies around camera at (${camera.position.x.toFixed(0)}, ${camera.position.z.toFixed(0)})`)

  for (let i = 0; i < fireflyCount; i++) {
    // Distribute fireflies uniformly in a square area around player
    const worldX = camera.position.x + (Math.random() - 0.5) * spawnRange * 2
    const worldZ = camera.position.z + (Math.random() - 0.5) * spawnRange * 2

    // Get terrain height at this position (-1 if chunk not loaded)
    const terrainY = getTerrainHeight(worldX, worldZ, chunks3D)

    // Place firefly 1-2 blocks above terrain
    const heightOffset = 1 + Math.random()
    // If chunk not loaded, use -1000 to hide (will be updated when chunk loads via wrapping)
    const finalY = terrainY >= 0 ? terrainY + heightOffset : -1000

    // Update base positions
    fireflyData.basePositions[i * 3] = worldX
    fireflyData.basePositions[i * 3 + 1] = finalY
    fireflyData.basePositions[i * 3 + 2] = worldZ

    // Also update render positions immediately
    positions[i * 3] = worldX
    positions[i * 3 + 1] = finalY
    positions[i * 3 + 2] = worldZ
  }

  // Mark geometry as needing update
  fireflyGeometry.attributes.position.needsUpdate = true

  console.log('[SceneSystem] Firefly positions initialized across loaded terrain')
}

/**
 * Update fireflies (distributed across terrain, for illumination)
 * When player moves, fireflies wrap around to always stay distributed around
 */
export function updateFireflies(context: FireflyContext, _deltaTime: number): void {
  const { fireflies, fireflyData, fireflyLights, camera, chunks3D } = context

  fireflies.visible = true
  const globalOpacity = 0.8

  const time = Date.now() * 0.001
  const fireflyGeometry = fireflies.geometry as BufferGeometry
  const positions = fireflyGeometry.attributes.position.array as Float32Array
  const colors = fireflyGeometry.attributes.color.array as Float32Array

  const fireflyCount = fireflyData.positions.length / 3
  const maxFireflyLights = fireflyLights.length
  let activeLightCount = 0

  const cx = camera.position.x
  const cz = camera.position.z

  // Wrapping range matches render distance
  const wrapRange = context.renderDistance * CHUNK_SIZE

  for (let i = 0; i < fireflyCount; i++) {
    const phase = fireflyData.phases[i]

    let baseX = fireflyData.basePositions[i * 3]
    let baseZ = fireflyData.basePositions[i * 3 + 2]

    // Wrap fireflies to stay within render distance of player
    let dx = baseX - cx
    let dz = baseZ - cz
    let needsHeightUpdate = false

    if (dx > wrapRange) {
      baseX -= wrapRange * 2
      fireflyData.basePositions[i * 3] = baseX
      needsHeightUpdate = true
    } else if (dx < -wrapRange) {
      baseX += wrapRange * 2
      fireflyData.basePositions[i * 3] = baseX
      needsHeightUpdate = true
    }
    if (dz > wrapRange) {
      baseZ -= wrapRange * 2
      fireflyData.basePositions[i * 3 + 2] = baseZ
      needsHeightUpdate = true
    } else if (dz < -wrapRange) {
      baseZ += wrapRange * 2
      fireflyData.basePositions[i * 3 + 2] = baseZ
      needsHeightUpdate = true
    }

    // Update height to match terrain when wrapped to new position
    if (needsHeightUpdate) {
      const terrainY = getTerrainHeight(baseX, baseZ, chunks3D)
      // Place firefly 1-2 blocks above terrain, or hide if chunk not loaded
      const heightOffset = 1 + Math.random()
      fireflyData.basePositions[i * 3 + 1] = terrainY >= 0 ? terrainY + heightOffset : -1000
    }

    let baseY = fireflyData.basePositions[i * 3 + 1]

    // Check if this firefly is hidden (chunk wasn't loaded) and try to update
    if (baseY < -500) {
      const terrainY = getTerrainHeight(baseX, baseZ, chunks3D)
      if (terrainY >= 0) {
        // Chunk is now loaded, update height
        const heightOffset = 1 + Math.random()
        baseY = terrainY + heightOffset
        fireflyData.basePositions[i * 3 + 1] = baseY
      }
    }

    // Skip rendering if still hidden
    if (baseY < -500) {
      colors[i * 3] = 0
      colors[i * 3 + 1] = 0
      colors[i * 3 + 2] = 0
      positions[i * 3 + 1] = -1000
      continue
    }

    // Small wobble animation (subtle, stays close to terrain)
    const wobble = 0.3
    const px = baseX + Math.sin(time * 0.3 + phase) * wobble
    const py = baseY + Math.sin(time * 0.5 + phase * 2) * wobble * 0.2
    const pz = baseZ + Math.cos(time * 0.4 + phase * 1.5) * wobble

    positions[i * 3] = px
    positions[i * 3 + 1] = py
    positions[i * 3 + 2] = pz

    // Calculate distance from camera for fade effect
    dx = baseX - cx
    dz = baseZ - cz
    const dist = Math.sqrt(dx * dx + dz * dz)

    const fadeStart = wrapRange * 0.8
    let distFade = 1.0
    if (dist > fadeStart) {
      distFade = Math.max(0, 1 - (dist - fadeStart) / (wrapRange - fadeStart))
    }

    // Gentle glow animation (mostly visible, subtle pulsing)
    const glowCycle = Math.sin(time * 1.5 + phase * 4)
    const glow = 0.6 + glowCycle * 0.4 // Range: 0.2 to 1.0, always visible

    // White light for fireflies
    const brightness = glow * globalOpacity * distFade
    colors[i * 3] = brightness
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness

    // Update point lights for closest fireflies (for terrain illumination)
    if (glow > 0.5 && activeLightCount < maxFireflyLights && dist < 30) {
      const light = fireflyLights[activeLightCount]
      light.position.set(px, py, pz)
      light.intensity = 0.5 * glow * distFade // Stronger light for terrain
      light.visible = true
      activeLightCount++
    }
  }

  // Hide unused lights
  for (let i = activeLightCount; i < maxFireflyLights; i++) {
    fireflyLights[i].visible = false
  }

  fireflyGeometry.attributes.position.needsUpdate = true
  fireflyGeometry.attributes.color.needsUpdate = true
}
