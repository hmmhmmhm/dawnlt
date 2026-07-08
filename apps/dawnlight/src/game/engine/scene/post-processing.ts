/**
 * Post-processing effects for SceneSystem
 * Post-processing effect application logic
 */
import type { DirectionalLight, Scene, WebGLRenderer } from 'three'
import type { EffectSettings } from '../../../constants/effects'
import type { PostProcessingSetup } from '../../../engine/scene'

export interface PostProcessingContext {
  postProcessing: PostProcessingSetup
  renderer: WebGLRenderer
  directionalLight: DirectionalLight
  scene: Scene
}

/**
 * Apply post-processing effects
 * @param gameTime - Game time (0-1440 minutes, 7 AM = 420 minutes)
 */
export function applyPostProcessingEffects(context: PostProcessingContext, effects: EffectSettings, sunIntensity: number, isUnderwater: boolean, gameTime: number): void {
  const { bloomPass, bokehPass, colorGradingPass, vignettePass, chromaticPass, smaaPass } = context.postProcessing

  // Toggle passes based on effects
  bloomPass.enabled = effects.bloom
  bokehPass.enabled = effects.dof
  colorGradingPass.enabled = effects.colorGrading
  vignettePass.enabled = effects.vignette
  chromaticPass.enabled = effects.chromatic
  smaaPass.enabled = effects.smaa

  // Shadow settings
  context.renderer.shadowMap.enabled = effects.shadows
  context.directionalLight.castShadow = effects.shadows

  // Dynamic Post-Processing Updates based on time of day
  const dayFactor = Math.max(0, sunIntensity / 2.0) // 0 at night, 1 at noon
  colorGradingPass.uniforms.timeOfDay.value = dayFactor

  // Apply night mode post-processing before 7 AM (420 min) or after 6 PM (1080 min)
  const isDaytime = sunIntensity > 0.1 && gameTime >= 420 && gameTime < 1080

  if (isDaytime) {
    // Daytime - warmer tones, more saturation
    colorGradingPass.uniforms.saturation.value = 1.15 + dayFactor * 0.1
    colorGradingPass.uniforms.contrast.value = 1.08
    colorGradingPass.uniforms.brightness.value = 0.0
    colorGradingPass.uniforms.shadowTint.value.setRGB(0.95, 0.95, 1.0)
    colorGradingPass.uniforms.highlightTint.value.setRGB(1.0, 0.98, 0.95)

    // Reduce vignette during day
    vignettePass.uniforms.darkness.value = 1.2

    // Subtle chromatic aberration
    chromaticPass.uniforms.amount.value = 0.001

    // Bloom adjustments for day
    bloomPass.strength = 0.4 + dayFactor * 0.2
    bloomPass.threshold = 0.85
  } else {
    // Nighttime - cooler tones, subtle blue for moonlit atmosphere
    colorGradingPass.uniforms.saturation.value = 1.0
    colorGradingPass.uniforms.contrast.value = 1.05
    colorGradingPass.uniforms.brightness.value = 0.05
    colorGradingPass.uniforms.shadowTint.value.setRGB(0.95, 0.95, 1.05) // Very subtle blue
    colorGradingPass.uniforms.highlightTint.value.setRGB(0.98, 0.98, 1.02)

    // Minimal vignette at night
    vignettePass.uniforms.darkness.value = 1.0

    // Minimal chromatic aberration at night
    chromaticPass.uniforms.amount.value = 0.001

    // Reduced bloom at night to prevent haze
    bloomPass.strength = 0.3
    bloomPass.threshold = 0.8
  }

  // Fog setting
  if (!effects.fog && !isUnderwater) {
    context.scene.fog = null
  }
}

/**
 * Perform rendering
 */
export function render(composer: { render: () => void }): void {
  composer.render()
}
