import { AmbientLight, DirectionalLight, HemisphereLight, type Scene } from 'three'
import { SPAWN_X, SPAWN_Z } from '../../constants'

// Fixed shadow direction at 8 AM (오전 8시 고정 그림자 방향)
const FIXED_SHADOW_HOUR = 8
const FIXED_SHADOW_TIME_NORM = FIXED_SHADOW_HOUR / 24
const FIXED_SUN_ANGLE = (FIXED_SHADOW_TIME_NORM - 0.25) * Math.PI * 2
const FIXED_SHADOW_X = Math.cos(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Y = Math.sin(FIXED_SUN_ANGLE)
const FIXED_SHADOW_Z = Math.cos(FIXED_SUN_ANGLE) * 0.2
// Normalize and scale for initial light position
const magnitude = Math.sqrt(FIXED_SHADOW_X ** 2 + FIXED_SHADOW_Y ** 2 + FIXED_SHADOW_Z ** 2)
const INITIAL_LIGHT_X = (FIXED_SHADOW_X / magnitude) * 200
const INITIAL_LIGHT_Y = (FIXED_SHADOW_Y / magnitude) * 200
const INITIAL_LIGHT_Z = (FIXED_SHADOW_Z / magnitude) * 200

export interface LightingSetup {
  ambientLight: AmbientLight
  directionalLight: DirectionalLight
  hemiLight: HemisphereLight
}

export function createLighting(scene: Scene): LightingSetup {
  // Ambient Light
  const ambientLight = new AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  // Directional Light (Sun/Moon) - Initial position at 8 AM angle
  // Use player spawn position as initial target
  const SPAWN_Y = 50
  const directionalLight = new DirectionalLight(0xffffee, 2.0)
  directionalLight.position.set(INITIAL_LIGHT_X + SPAWN_X, INITIAL_LIGHT_Y + SPAWN_Y, INITIAL_LIGHT_Z + SPAWN_Z)
  directionalLight.target.position.set(SPAWN_X, SPAWN_Y, SPAWN_Z)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 300
  directionalLight.shadow.camera.left = -100
  directionalLight.shadow.camera.right = 100
  directionalLight.shadow.camera.top = 100
  directionalLight.shadow.camera.bottom = -100
  directionalLight.shadow.bias = -0.0001 // Reduced bias
  directionalLight.shadow.normalBias = 0.05 // Add normal bias to fix acne
  scene.add(directionalLight)
  scene.add(directionalLight.target) // Add target to scene so it can be updated

  // Hemisphere Light
  const hemiLight = new HemisphereLight(0x87ceeb, 0x8b6914, 1.0)
  scene.add(hemiLight)

  return {
    ambientLight,
    directionalLight,
    hemiLight,
  }
}
