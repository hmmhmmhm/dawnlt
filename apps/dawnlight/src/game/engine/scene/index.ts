/**
 * Scene module exports
 * Re-exports to maintain existing API
 */

export type { DayNightContext } from './day-night'
export { updateDayNightCycle } from './day-night'
export type { FireflyContext, FireflyData } from './fireflies'
export { initializeFireflyPositions, updateFireflies } from './fireflies'
export type { PostProcessingContext } from './post-processing'
export { applyPostProcessingEffects, render } from './post-processing'
export type { SceneUpdateContext } from './scene-system'
export { default, SceneSystem } from './scene-system'
// Sub-module exports (internal use)
export { getTerrainHeight } from './terrain-utils'
