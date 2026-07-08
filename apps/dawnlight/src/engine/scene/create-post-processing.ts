import { type PerspectiveCamera, type Scene, Vector2, type WebGLRenderer } from 'three'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import { ChromaticAberrationShader, ColorGradingShader, VignetteShader } from '../shaders'

export interface PostProcessingSetup {
  composer: EffectComposer
  renderPass: RenderPass
  bloomPass: UnrealBloomPass
  bokehPass: BokehPass
  colorGradingPass: ShaderPass
  vignettePass: ShaderPass
  chromaticPass: ShaderPass
  smaaPass: SMAAPass
  outputPass: OutputPass
}

export function createPostProcessing(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): PostProcessingSetup {
  const width = window.innerWidth
  const height = window.innerHeight

  // Keep render stats across all composer passes; we reset manually once per frame.
  renderer.info.autoReset = false
  const composer = new EffectComposer(renderer)

  // RenderPass - Main scene render
  const renderPass = new RenderPass(scene, camera)
  renderPass.enabled = true
  composer.addPass(renderPass)

  // Bloom - Glowing effects
  const bloomPass = new UnrealBloomPass(
    new Vector2(width, height),
    0.5, // strength
    0.6, // radius
    0.85, // threshold
  )
  composer.addPass(bloomPass)

  // Depth of Field - Bokeh effect
  const bokehPass = new BokehPass(scene, camera, {
    focus: 50.0,
    aperture: 0.00003,
    maxblur: 0.005,
  })
  bokehPass.enabled = true
  composer.addPass(bokehPass)

  // Color Grading Pass
  const colorGradingPass = new ShaderPass(ColorGradingShader)
  colorGradingPass.uniforms.saturation.value = 1.15
  colorGradingPass.uniforms.contrast.value = 1.08
  colorGradingPass.uniforms.brightness.value = 0.02
  colorGradingPass.uniforms.gamma.value = 0.95
  composer.addPass(colorGradingPass)

  // Vignette Pass
  const vignettePass = new ShaderPass(VignetteShader)
  vignettePass.uniforms.offset.value = 1.2
  vignettePass.uniforms.darkness.value = 1.3
  composer.addPass(vignettePass)

  // Chromatic Aberration Pass
  const chromaticPass = new ShaderPass(ChromaticAberrationShader)
  chromaticPass.uniforms.amount.value = 0.0015
  composer.addPass(chromaticPass)

  // SMAA - Anti-aliasing
  const smaaPass = new SMAAPass()
  smaaPass.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
  composer.addPass(smaaPass)

  // Output Pass (Tone Mapping & Color Correction)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  return {
    composer,
    renderPass,
    bloomPass,
    bokehPass,
    colorGradingPass,
    vignettePass,
    chromaticPass,
    smaaPass,
    outputPass,
  }
}

export function handleResize(postProcessing: PostProcessingSetup, renderer: WebGLRenderer, camera: PerspectiveCamera): void {
  const width = window.innerWidth
  const height = window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  postProcessing.composer.setSize(width, height)

  // Update post-processing passes that need size
  postProcessing.bloomPass.setSize(width, height)
  postProcessing.smaaPass.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
}
