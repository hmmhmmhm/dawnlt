/**
 * SceneSystem - System responsible for scene element updates (main orchestration class)
 */
import { type PerspectiveCamera, Vector3 } from 'three'
import type { EffectSettings } from '../../../constants/effects'
import { updateFoliageTime } from '../../../engine/materials'
import { updateRain, updateShootingStars, updateSnow } from '../../../engine/scene'
import { type DayNightState, updateGameTime } from '../../../engine/systems/day-night-cycle'
import { updateWeather as updateWeatherSystem } from '../../../engine/systems/weather-system'
import type { GameEngine } from '../game-engine'
import type { SceneUpdateContext } from '../types'
import { type DayNightContext, updateDayNightCycle } from './day-night'
import { type FireflyContext, initializeFireflyPositions, updateFireflies } from './fireflies'
import { applyPostProcessingEffects, type PostProcessingContext, render } from './post-processing'

export type { SceneUpdateContext }

// Shadow map update threshold (in blocks) - update when player moves this far
const SHADOW_UPDATE_DISTANCE = 4

/**
 * Scene system - Manages weather, sky, particles, etc.
 */
export class SceneSystem {
  private engine: GameEngine
  private firefliesInitialized = false
  private lastShadowUpdatePosition = new Vector3()
  private shadowUpdateInitialized = false

  constructor(engine: GameEngine) {
    this.engine = engine
  }

  /**
   * Initialize firefly positions to match terrain (called after chunk load)
   * Fireflies are distributed across the loaded map to illuminate terrain.
   */
  initializeFireflyPositions(): void {
    if (this.firefliesInitialized) return

    const context: FireflyContext = {
      fireflies: this.engine.fireflies,
      fireflyData: this.engine.fireflyData,
      fireflyLights: this.engine.fireflyLights,
      chunks3D: this.engine.chunks3D,
      camera: this.engine.camera,
      renderDistance: this.engine.renderDistance,
    }

    initializeFireflyPositions(context)
    this.firefliesInitialized = true
  }

  /**
   * Update game time
   */
  updateTime(deltaTime: number): void {
    this.engine.gameTime = updateGameTime(this.engine.gameTime, deltaTime)
  }

  /**
   * Update weather
   */
  updateWeather(deltaTime: number): void {
    const weatherState = updateWeatherSystem(this.engine.weather, this.engine.weatherTime, deltaTime)
    this.engine.weather = weatherState.weather
    this.engine.weatherTime = weatherState.weatherTime
  }

  /**
   * Update rain effects
   */
  updateRain(camera: PerspectiveCamera): void {
    if (this.engine.weather === 'rain') {
      this.engine.rainSystem.visible = true
      updateRain(this.engine.rainSystem, this.engine.rainVelocities, camera)
    } else {
      this.engine.rainSystem.visible = false
    }
  }

  /**
   * Update snow effects
   */
  updateSnow(camera: PerspectiveCamera): void {
    if (this.engine.weather === 'snow') {
      this.engine.snowSystem.visible = true
      updateSnow(this.engine.snowSystem, this.engine.snowVelocities, camera, Date.now() * 0.001)
    } else {
      this.engine.snowSystem.visible = false
    }
  }

  /**
   * Update day/night cycle
   */
  updateDayNightCycle(camera: PerspectiveCamera, deltaTime: number): DayNightState {
    const lodSettings = this.engine.lodRuntime.getSettings()
    const context: DayNightContext = {
      gameTime: this.engine.gameTime,
      renderDistance: this.engine.renderDistance,
      farLodDistance: lodSettings.enabled ? lodSettings.farDistance : this.engine.renderDistance,
      sunSprite: this.engine.sunSprite,
      moonSprite: this.engine.moonSprite,
      skyMaterial: this.engine.skyMaterial,
      sky: this.engine.sky,
      stars: this.engine.stars,
      constellations: this.engine.constellations,
      directionalLight: this.engine.directionalLight,
      ambientLight: this.engine.ambientLight,
      scene: this.engine.scene,
    }

    return updateDayNightCycle(context, camera, deltaTime)
  }

  /**
   * Update fireflies (distributed across terrain, for illumination)
   * When player moves, fireflies wrap around to always stay distributed around
   */
  updateFireflies(camera: PerspectiveCamera, deltaTime: number): void {
    const context: FireflyContext = {
      fireflies: this.engine.fireflies,
      fireflyData: this.engine.fireflyData,
      fireflyLights: this.engine.fireflyLights,
      chunks3D: this.engine.chunks3D,
      camera,
      renderDistance: this.engine.renderDistance,
    }

    updateFireflies(context, deltaTime)
  }

  /**
   * Update shooting stars
   */
  updateShootingStars(camera: PerspectiveCamera, deltaTime: number): void {
    updateShootingStars(this.engine.shootingStarSystem, camera, deltaTime)
  }

  /**
   * Update foliage animation
   */
  updateFoliage(deltaTime: number): void {
    updateFoliageTime(deltaTime)
  }

  /**
   * Apply post-processing effects
   * @param gameTime - Game time (0-1440 minutes, 7 AM = 420 minutes)
   */
  applyPostProcessingEffects(effects: EffectSettings, sunIntensity: number, isUnderwater: boolean, gameTime: number): void {
    const context: PostProcessingContext = {
      postProcessing: this.engine.postProcessing,
      renderer: this.engine.renderer,
      directionalLight: this.engine.directionalLight,
      scene: this.engine.scene,
    }

    applyPostProcessingEffects(context, effects, sunIntensity, isUnderwater, gameTime)
  }

  /**
   * Perform rendering
   */
  render(): void {
    render(this.engine.postProcessing.composer)
  }

  /**
   * Check if shadow map needs update based on player movement
   */
  private checkShadowUpdate(camera: PerspectiveCamera): void {
    // Initialize on first call
    if (!this.shadowUpdateInitialized) {
      this.lastShadowUpdatePosition.copy(camera.position)
      this.shadowUpdateInitialized = true
      return
    }

    // Calculate distance from last shadow update position
    const distanceSq = this.lastShadowUpdatePosition.distanceToSquared(camera.position)
    const thresholdSq = SHADOW_UPDATE_DISTANCE * SHADOW_UPDATE_DISTANCE

    // Update shadow map if player moved far enough
    if (distanceSq >= thresholdSq) {
      this.engine.renderer.shadowMap.needsUpdate = true
      this.lastShadowUpdatePosition.copy(camera.position)
    }
  }

  /**
   * Update all scene elements (main update function)
   */
  update(context: SceneUpdateContext): DayNightState {
    const { deltaTime, camera } = context

    // Update time and weather
    this.updateTime(deltaTime)
    this.updateWeather(deltaTime)

    // Update weather effects
    this.updateRain(camera)
    this.updateSnow(camera)

    // Update day/night cycle (returns state for other systems)
    const dayNightState = this.updateDayNightCycle(camera, deltaTime)

    // Update particles
    this.updateFireflies(camera, deltaTime)
    this.updateShootingStars(camera, deltaTime)
    this.updateFoliage(deltaTime)

    // Check if shadow map needs update due to player movement
    this.checkShadowUpdate(camera)

    return dayNightState
  }
}

export default SceneSystem
