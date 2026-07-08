/**
 * Shooting Star (별똥별) particle system
 * Creates bright streaks across the sky with fading trails
 */
import { AdditiveBlending, BufferGeometry, type Camera, Float32BufferAttribute, Group, Line, LineBasicMaterial, type Scene } from 'three'

// Pool size and trail resolution
const MAX_SHOOTING_STARS = 8
const TRAIL_POINTS = 24
const SKY_RADIUS = 420 // Just inside the star sphere (450)

// Spawn timing - frequent for testing
const SPAWN_INTERVAL_MIN = 0.5
const SPAWN_INTERVAL_MAX = 2.0

// Movement properties
const STAR_SPEED_MIN = 100
const STAR_SPEED_MAX = 200
const STAR_LIFETIME_MIN = 0.6
const STAR_LIFETIME_MAX = 1.2

// Visual - HDR bright for bloom visibility during daytime
const HEAD_COLOR_R = 5.0
const HEAD_COLOR_G = 4.5
const HEAD_COLOR_B = 3.0
const TAIL_COLOR_R = 0.5
const TAIL_COLOR_G = 0.7
const TAIL_COLOR_B = 1.5

interface ShootingStarData {
  active: boolean
  headX: number
  headY: number
  headZ: number
  velX: number
  velY: number
  velZ: number
  lifetime: number
  elapsed: number
  trailHistory: Float32Array
}

export interface ShootingStarSystem {
  group: Group
  lines: Line[]
  data: ShootingStarData[]
  nextSpawnTime: number
}

/**
 * Create the shooting star system (pool of reusable star trails)
 */
export function createShootingStars(scene: Scene): ShootingStarSystem {
  const group = new Group()
  const lines: Line[] = []
  const data: ShootingStarData[] = []

  for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
    const geometry = new BufferGeometry()
    const positions = new Float32Array(TRAIL_POINTS * 3)
    const colors = new Float32Array(TRAIL_POINTS * 3)

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))

    const material = new LineBasicMaterial({
      vertexColors: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      transparent: true,
    })

    const line = new Line(geometry, material)
    line.frustumCulled = false
    line.visible = false
    group.add(line)
    lines.push(line)

    data.push({
      active: false,
      headX: 0,
      headY: 0,
      headZ: 0,
      velX: 0,
      velY: 0,
      velZ: 0,
      lifetime: 0,
      elapsed: 0,
      trailHistory: new Float32Array(TRAIL_POINTS * 3),
    })
  }

  scene.add(group)

  return { group, lines, data, nextSpawnTime: 0.3 }
}

/**
 * Spawn a new shooting star at a random sky position
 */
function spawnShootingStar(star: ShootingStarData): void {
  // Random point on upper hemisphere (elevation 20-75 degrees)
  const theta = Math.random() * Math.PI * 2
  const elevationMin = 0.25 // ~14 degrees
  const elevationMax = 0.85 // ~58 degrees
  const cosElev = elevationMin + Math.random() * (elevationMax - elevationMin)
  const sinElev = Math.sqrt(1 - cosElev * cosElev)

  const startX = SKY_RADIUS * sinElev * Math.cos(theta)
  const startY = SKY_RADIUS * cosElev
  const startZ = SKY_RADIUS * sinElev * Math.sin(theta)

  star.headX = startX
  star.headY = startY
  star.headZ = startZ

  // Velocity: angled downward and across the sky
  const speed = STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN)
  const dirTheta = theta + (Math.random() - 0.5) * 2.0
  const downAngle = 0.3 + Math.random() * 0.5

  star.velX = Math.cos(dirTheta) * Math.cos(downAngle) * speed
  star.velY = -Math.sin(downAngle) * speed
  star.velZ = Math.sin(dirTheta) * Math.cos(downAngle) * speed

  star.lifetime = STAR_LIFETIME_MIN + Math.random() * (STAR_LIFETIME_MAX - STAR_LIFETIME_MIN)
  star.elapsed = 0
  star.active = true

  // Initialize all trail positions to start point
  for (let i = 0; i < TRAIL_POINTS; i++) {
    star.trailHistory[i * 3] = startX
    star.trailHistory[i * 3 + 1] = startY
    star.trailHistory[i * 3 + 2] = startZ
  }
}

/**
 * Calculate brightness based on lifecycle progress (fade in/out)
 */
function getOverallBrightness(progress: number): number {
  if (progress < 0.1) return progress / 0.1
  if (progress > 0.6) return (1.0 - progress) / 0.4
  return 1.0
}

/**
 * Update trail vertex positions and colors for a single star
 */
function updateStarGeometry(star: ShootingStarData, line: Line): void {
  const positions = line.geometry.attributes.position.array as Float32Array
  const colors = line.geometry.attributes.color.array as Float32Array

  const progress = star.elapsed / star.lifetime
  const overallBrightness = getOverallBrightness(progress)

  for (let j = 0; j < TRAIL_POINTS; j++) {
    // Position from trail history
    positions[j * 3] = star.trailHistory[j * 3]
    positions[j * 3 + 1] = star.trailHistory[j * 3 + 1]
    positions[j * 3 + 2] = star.trailHistory[j * 3 + 2]

    // Trail brightness: head is bright, tail fades (quadratic falloff)
    const trailFade = 1.0 - j / TRAIL_POINTS
    const brightness = trailFade * trailFade * overallBrightness

    // Color gradient: warm white head -> cool blue tail
    const mix = trailFade
    colors[j * 3] = (HEAD_COLOR_R * mix + TAIL_COLOR_R * (1 - mix)) * brightness
    colors[j * 3 + 1] = (HEAD_COLOR_G * mix + TAIL_COLOR_G * (1 - mix)) * brightness
    colors[j * 3 + 2] = (HEAD_COLOR_B * mix + TAIL_COLOR_B * (1 - mix)) * brightness
  }

  line.geometry.attributes.position.needsUpdate = true
  line.geometry.attributes.color.needsUpdate = true
}

/**
 * Update the shooting star system each frame
 */
export function updateShootingStars(system: ShootingStarSystem, camera: Camera, deltaTime: number): void {
  // Follow camera (like stars/sky dome)
  system.group.position.copy(camera.position)

  // Spawn logic
  system.nextSpawnTime -= deltaTime
  if (system.nextSpawnTime <= 0) {
    for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
      if (!system.data[i].active) {
        spawnShootingStar(system.data[i])
        system.lines[i].visible = true
        break
      }
    }
    system.nextSpawnTime = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN)
  }

  // Update each active shooting star
  for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
    const star = system.data[i]
    const line = system.lines[i]

    if (!star.active) continue

    star.elapsed += deltaTime

    // Deactivate if lifetime expired
    if (star.elapsed >= star.lifetime) {
      star.active = false
      line.visible = false
      continue
    }

    // Move head position
    star.headX += star.velX * deltaTime
    star.headY += star.velY * deltaTime
    star.headZ += star.velZ * deltaTime

    // Shift trail history (newest at index 0, oldest at end)
    for (let j = TRAIL_POINTS - 1; j > 0; j--) {
      star.trailHistory[j * 3] = star.trailHistory[(j - 1) * 3]
      star.trailHistory[j * 3 + 1] = star.trailHistory[(j - 1) * 3 + 1]
      star.trailHistory[j * 3 + 2] = star.trailHistory[(j - 1) * 3 + 2]
    }

    // Insert new head position
    star.trailHistory[0] = star.headX
    star.trailHistory[1] = star.headY
    star.trailHistory[2] = star.headZ

    // Update line geometry (positions + colors)
    updateStarGeometry(star, line)
  }
}
