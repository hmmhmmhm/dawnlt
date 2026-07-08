/**
 * Day/Night cycle system for SceneSystem
 * Day/night cycle update logic
 */
import { type AmbientLight, type Color, type DirectionalLight, type Fog, type Mesh, type MeshBasicMaterial, type PerspectiveCamera, type Points, type PointsMaterial, type Scene, type ShaderMaterial, Vector3 } from 'three'
import { CHUNK_SIZE } from '../../../constants'
import { getFluidMaterial, getSolidMaterial } from '../../../engine/materials'
import { updateSunMoonPosition } from '../../../engine/scene'
import { calculateDayNightState, type DayNightState } from '../../../engine/systems/day-night-cycle'

// Fixed shadow direction at 8 AM (오전 8시 고정 그림자 방향)
const FIXED_SHADOW_HOUR = 8
const FIXED_SHADOW_TIME_NORM = FIXED_SHADOW_HOUR / 24 // 8/24 = 0.3333...
const FIXED_SUN_ANGLE = (FIXED_SHADOW_TIME_NORM - 0.25) * Math.PI * 2
// Pre-calculated fixed shadow direction components
const FIXED_SHADOW_X = Math.cos(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Y = Math.sin(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Z = Math.cos(FIXED_SUN_ANGLE) * 0.2

// Shadow camera grid snap size for stable shadows
// Snapping to a grid prevents shadow "swimming" when moving
const SHADOW_GRID_SIZE = 1 // Snap to 1-block grid for maximum stability

export interface DayNightContext {
  gameTime: number
  renderDistance: number
  farLodDistance?: number
  sunSprite: Mesh | null
  moonSprite: Mesh | null
  skyMaterial: ShaderMaterial
  sky: Mesh
  stars: Points
  constellations: Points
  directionalLight: DirectionalLight
  ambientLight: AmbientLight
  scene: Scene
}

/**
 * Update day/night cycle
 */
export function updateDayNightCycle(context: DayNightContext, camera: PerspectiveCamera, deltaTime: number): DayNightState {
  const timeNorm = context.gameTime / 1440 // 0..1

  // Sun & Moon Position (visual only, shadow direction is fixed)
  if (context.sunSprite && context.moonSprite) {
    updateSunMoonPosition(context.sunSprite, context.moonSprite, camera, timeNorm)
  }

  // Calculate day/night state
  const dayNightState = calculateDayNightState(timeNorm)

  // Update sky colors and cloud uniforms
  if (context.skyMaterial.uniforms) {
    context.skyMaterial.uniforms.topColor.value.copy(dayNightState.skyTop)
    context.skyMaterial.uniforms.bottomColor.value.copy(dayNightState.skyBottom)
    context.skyMaterial.uniforms.exponent.value = dayNightState.skyExponent
    // Update cloud animation time
    context.skyMaterial.uniforms.time.value += deltaTime
    // Update sun intensity for cloud lighting
    context.skyMaterial.uniforms.sunIntensity.value = dayNightState.sunIntensity / 2.0
  }

  // Update sky position to follow camera (prevents atmosphere from appearing distant)
  context.sky.position.copy(camera.position)

  // Update stars
  context.stars.position.copy(camera.position)
  ;(context.stars.material as PointsMaterial).opacity = dayNightState.starOpacity
  context.stars.rotation.y += deltaTime * 0.005 // Rotate stars very slowly
  context.constellations.position.copy(camera.position)
  ;(context.constellations.material as PointsMaterial).opacity = dayNightState.starOpacity
  context.constellations.rotation.y += deltaTime * 0.005

  // Update Moon Opacity
  if (context.moonSprite) {
    ;(context.moonSprite.material as MeshBasicMaterial).opacity = dayNightState.moonOpacity
  }

  // Update lighting (sun + moon)
  const { sunIntensity, moonIntensity } = dayNightState
  context.directionalLight.intensity = Math.max(sunIntensity, moonIntensity * 0.8)
  context.ambientLight.intensity = 0.2 + Math.max(sunIntensity * 0.4, moonIntensity * 0.5)
  context.ambientLight.color.copy(dayNightState.ambientColor)

  // Update Light Position - Fixed at 8 AM angle for consistent shadows
  // (오전 8시 각도로 그림자 방향 고정)
  const lightDir = new Vector3(FIXED_SHADOW_X, FIXED_SHADOW_Y, FIXED_SHADOW_Z)
  if (sunIntensity <= 0) {
    context.directionalLight.color.setHex(0xaaccff) // Moonlight color
  } else {
    context.directionalLight.color.setHex(0xffffee) // Sunlight color
  }

  // Snap shadow camera position to grid for stable, consistent shadows
  // This prevents shadow "swimming" as player moves
  const snappedX = Math.floor(camera.position.x / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedY = Math.floor(camera.position.y / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedZ = Math.floor(camera.position.z / SHADOW_GRID_SIZE) * SHADOW_GRID_SIZE
  const snappedPosition = new Vector3(snappedX, snappedY, snappedZ)

  context.directionalLight.position.copy(lightDir).normalize().multiplyScalar(200).add(snappedPosition)
  context.directionalLight.target.position.copy(snappedPosition)
  context.directionalLight.target.updateMatrixWorld()

  // Update fog color and distance (clearer at night for better sky visibility)
  if (context.scene.fog) {
    const fog = context.scene.fog as Fog
    fog.color.copy(dayNightState.fogColor)
    const effectiveDistance = Math.max(context.renderDistance, context.farLodDistance ?? context.renderDistance)
    // Adjust fog distance based on time of day - clearer at night
    fog.near = sunIntensity > 0.1 ? 30 : 50
    fog.far = sunIntensity > 0.1 ? effectiveDistance * CHUNK_SIZE - 20 : effectiveDistance * CHUNK_SIZE + 50
  }
  // Update scene background color (use skyBottom for proper sky color)
  ;(context.scene.background as Color).copy(dayNightState.skyBottom)

  // Update block material properties based on time of day
  const solidMaterial = getSolidMaterial()
  if (solidMaterial) {
    solidMaterial.roughness = dayNightState.blockRoughness
    solidMaterial.metalness = dayNightState.blockMetalness
  }

  // Update water color
  const fluidMaterial = getFluidMaterial()
  if (fluidMaterial) {
    fluidMaterial.color.copy(dayNightState.waterColor)
  }

  return dayNightState
}
