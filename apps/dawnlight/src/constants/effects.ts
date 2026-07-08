import { RENDER_DISTANCE } from './index'

// Worker Configuration
export const USE_MESH_WORKERS = true // Enable Web Worker mesh building
export const QUEUE_CULL_DIST_SQ = (RENDER_DISTANCE + 3) ** 2 // Cull tasks if player moves > render distance + 3 chunks away

// Effect Settings - All post-processing and rendering effects
export interface EffectSettings {
  bloom: boolean // Glow/Bloom effect
  dof: boolean // Depth of Field (Bokeh)
  colorGrading: boolean // Color correction
  vignette: boolean // Screen edge darkening
  chromatic: boolean // Chromatic Aberration
  smaa: boolean // Anti-aliasing
  shadows: boolean // Shadow mapping
  fog: boolean // Distance fog
}

export const DEFAULT_EFFECTS: EffectSettings = {
  bloom: true,
  dof: true,
  colorGrading: true,
  vignette: true,
  chromatic: true,
  smaa: true,
  shadows: true,
  fog: true,
}

export const EFFECT_NAMES: (keyof EffectSettings)[] = ['bloom', 'dof', 'colorGrading', 'vignette', 'chromatic', 'smaa', 'shadows', 'fog']
