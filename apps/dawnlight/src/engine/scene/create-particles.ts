import { AdditiveBlending, BufferAttribute, BufferGeometry, type Camera, PointLight, Points, PointsMaterial, type Scene } from 'three'
import { WATER_LEVEL } from '../../constants'
import { createRainTexture, createSnowTexture } from '../../utils/textures'

export interface FireflyData {
  positions: Float32Array
  colors: Float32Array
  basePositions: Float32Array
  phases: Float32Array
}

export interface ParticleSystemsSetup {
  fireflies: Points
  fireflyData: FireflyData
  fireflyLights: PointLight[]
  rainSystem: Points
  rainVelocities: Float32Array
  snowSystem: Points
  snowVelocities: Float32Array
}

const FIREFLY_COUNT = 8000
const MAX_FIREFLY_LIGHTS = 10
const RAIN_COUNT = 2000
const SNOW_COUNT = 2000
const WORLD_WIDTH = 2000

export function createParticleSystems(scene: Scene): ParticleSystemsSetup {
  // Fireflies
  const { fireflies, fireflyData, fireflyLights } = createFireflies(scene)

  // Rain
  const { rainSystem, rainVelocities } = createRainParticles(scene)

  // Snow
  const { snowSystem, snowVelocities } = createSnowParticles(scene)

  return {
    fireflies,
    fireflyData,
    fireflyLights,
    rainSystem,
    rainVelocities,
    snowSystem,
    snowVelocities,
  }
}

function createFireflies(scene: Scene) {
  const fireflyGeometry = new BufferGeometry()
  const fireflyPositions = new Float32Array(FIREFLY_COUNT * 3)
  const fireflyColors = new Float32Array(FIREFLY_COUNT * 3)
  const fireflyBasePositions = new Float32Array(FIREFLY_COUNT * 3)
  const fireflyPhases = new Float32Array(FIREFLY_COUNT)

  const spawnR = 300

  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const x = (Math.random() - 0.5) * spawnR * 2
    const z = (Math.random() - 0.5) * spawnR * 2
    const y = WATER_LEVEL + 10 + Math.random() * 40

    fireflyPositions[i * 3] = x
    fireflyPositions[i * 3 + 1] = y
    fireflyPositions[i * 3 + 2] = z

    fireflyBasePositions[i * 3] = x
    fireflyBasePositions[i * 3 + 1] = y
    fireflyBasePositions[i * 3 + 2] = z

    fireflyPhases[i] = Math.random() * Math.PI * 2

    fireflyColors[i * 3] = 1
    fireflyColors[i * 3 + 1] = 1
    fireflyColors[i * 3 + 2] = 1
  }

  fireflyGeometry.setAttribute('position', new BufferAttribute(fireflyPositions, 3))
  fireflyGeometry.setAttribute('color', new BufferAttribute(fireflyColors, 3))

  const fireflyMaterial = new PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 0.15, // Small point - bloom post-processing creates the glow effect
    transparent: true,
    opacity: 1,
    fog: true,
    blending: AdditiveBlending,
    depthWrite: false,
    // No texture - bloom effect creates soft glow around bright points
  })

  const fireflies = new Points(fireflyGeometry, fireflyMaterial)
  fireflies.frustumCulled = false
  scene.add(fireflies)

  // Firefly Real Lights
  const fireflyLights: PointLight[] = []
  for (let i = 0; i < MAX_FIREFLY_LIGHTS; i++) {
    const light = new PointLight(0xffffff, 2.0, 15)
    light.visible = false
    scene.add(light)
    fireflyLights.push(light)
  }

  return {
    fireflies,
    fireflyData: {
      positions: fireflyPositions,
      colors: fireflyColors,
      basePositions: fireflyBasePositions,
      phases: fireflyPhases,
    },
    fireflyLights,
  }
}

function createRainParticles(scene: Scene) {
  const rainGeometry = new BufferGeometry()
  const rainPositions = new Float32Array(RAIN_COUNT * 3)
  const rainVelocities = new Float32Array(RAIN_COUNT)

  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 100
    rainPositions[i * 3 + 1] = Math.random() * 60
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100
    rainVelocities[i] = 0.5 + Math.random() * 0.2
  }

  rainGeometry.setAttribute('position', new BufferAttribute(rainPositions, 3))

  const rainMaterial = new PointsMaterial({
    color: 0xaaaaaa,
    size: 0.8,
    transparent: true,
    opacity: 0.8,
    map: createRainTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    fog: true,
  })

  // Prevent rain streaks from rotating when camera looks up
  // By default, PointsMaterial billboards are screen-aligned, so the rain texture
  // rotates with the camera. This shader modification projects the world "down"
  // direction onto screen space and counter-rotates the texture to keep rain vertical.
  rainMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('void main() {', 'varying vec2 vScreenDown;\nvoid main() {')

    shader.vertexShader = shader.vertexShader.replace(
      '#include <fog_vertex>',
      [
        '{',
        '  vec4 mvDown = modelViewMatrix * vec4(position + vec3(0.0, -1.0, 0.0), 1.0);',
        '  vec4 clipPos = projectionMatrix * mvPosition;',
        '  vec4 clipDown = projectionMatrix * mvDown;',
        '  vec2 ndcPos = clipPos.xy / clipPos.w;',
        '  vec2 ndcDown = clipDown.xy / clipDown.w;',
        '  vec2 dir = ndcDown - ndcPos;',
        '  float len = length(dir);',
        '  vScreenDown = len > 0.0001 ? dir / len : vec2(0.0, -1.0);',
        '}',
        '#include <fog_vertex>',
      ].join('\n'),
    )

    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'varying vec2 vScreenDown;\nvoid main() {')

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_particle_fragment>',
      [
        '#ifdef USE_MAP',
        '  vec2 coord = gl_PointCoord - vec2(0.5);',
        '  float cosA = -vScreenDown.y;',
        '  float sinA = -vScreenDown.x;',
        '  vec2 rotatedUv = vec2(',
        '    cosA * coord.x - sinA * coord.y,',
        '    sinA * coord.x + cosA * coord.y',
        '  ) + vec2(0.5);',
        '  diffuseColor *= texture2D(map, rotatedUv);',
        '#endif',
      ].join('\n'),
    )
  }

  const rainSystem = new Points(rainGeometry, rainMaterial)
  rainSystem.frustumCulled = false
  rainSystem.visible = false
  scene.add(rainSystem)

  return { rainSystem, rainVelocities }
}

function createSnowParticles(scene: Scene) {
  const snowGeometry = new BufferGeometry()
  const snowPositions = new Float32Array(SNOW_COUNT * 3)
  const snowVelocities = new Float32Array(SNOW_COUNT * 3)

  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * 100
    snowPositions[i * 3 + 1] = Math.random() * 60
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 100
    snowVelocities[i * 3] = (Math.random() - 0.5) * 0.02
    snowVelocities[i * 3 + 1] = 0.1 + Math.random() * 0.1
    snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
  }

  snowGeometry.setAttribute('position', new BufferAttribute(snowPositions, 3))

  const snowMaterial = new PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0.8,
    map: createSnowTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    fog: true,
  })

  const snowSystem = new Points(snowGeometry, snowMaterial)
  snowSystem.frustumCulled = false
  snowSystem.visible = false
  scene.add(snowSystem)

  return { snowSystem, snowVelocities }
}

export function updateRain(rainSystem: Points, rainVelocities: Float32Array, camera: Camera): void {
  const positions = (rainSystem.geometry.attributes.position as BufferAttribute).array as Float32Array
  const rainCount = rainVelocities.length

  for (let i = 0; i < rainCount; i++) {
    positions[i * 3 + 1] -= rainVelocities[i]
    if (positions[i * 3 + 1] < 0) {
      positions[i * 3 + 1] += 60
    }

    const cx = camera.position.x
    const cz = camera.position.z

    const dx = positions[i * 3] - cx
    const dz = positions[i * 3 + 2] - cz

    if (dx > 50) positions[i * 3] -= 100
    if (dx < -50) positions[i * 3] += 100
    if (dz > 50) positions[i * 3 + 2] -= 100
    if (dz < -50) positions[i * 3 + 2] += 100
  }

  rainSystem.geometry.attributes.position.needsUpdate = true
}

export function updateSnow(snowSystem: Points, snowVelocities: Float32Array, camera: Camera, time: number): void {
  const positions = (snowSystem.geometry.attributes.position as BufferAttribute).array as Float32Array
  const snowCount = snowVelocities.length / 3

  for (let i = 0; i < snowCount; i++) {
    positions[i * 3 + 1] -= snowVelocities[i * 3 + 1]
    positions[i * 3] += Math.sin(time + i) * 0.02
    positions[i * 3 + 2] += Math.cos(time + i) * 0.02

    if (positions[i * 3 + 1] < 0) {
      positions[i * 3 + 1] += 60
    }

    const cx = camera.position.x
    const cz = camera.position.z

    const dx = positions[i * 3] - cx
    const dz = positions[i * 3 + 2] - cz

    if (dx > 50) positions[i * 3] -= 100
    if (dx < -50) positions[i * 3] += 100
    if (dz > 50) positions[i * 3 + 2] -= 100
    if (dz < -50) positions[i * 3 + 2] += 100
  }

  snowSystem.geometry.attributes.position.needsUpdate = true
}

export { FIREFLY_COUNT, MAX_FIREFLY_LIGHTS, WORLD_WIDTH }
