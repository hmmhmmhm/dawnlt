export const DEBUG_DISABLE_SIDE_FACES = false
export const DEBUG_FORCE_WIREFRAME = false
export const DEBUG_USE_BASIC_MATERIAL = false
export const DEBUG_LOD_LOGS = true
export const GENERATE_INTERNAL_SIDE_FACES = true

let lodDebugColorEnabled = false
let lodInternalFacesEnabled = true
let lodBoundaryFacesEnabled = true
let lodInternalFaceMinDrop = 0.35

export function isLodDebugColorEnabled(): boolean {
  return lodDebugColorEnabled
}

export function setLodDebugColorEnabled(enabled: boolean): void {
  lodDebugColorEnabled = enabled
}

export function isLodInternalFacesEnabled(): boolean {
  return lodInternalFacesEnabled
}

export function setLodInternalFacesEnabled(enabled: boolean): void {
  lodInternalFacesEnabled = enabled
}

export function isLodBoundaryFacesEnabled(): boolean {
  return lodBoundaryFacesEnabled
}

export function setLodBoundaryFacesEnabled(enabled: boolean): void {
  lodBoundaryFacesEnabled = enabled
}

export function getLodInternalFaceMinDrop(): number {
  return lodInternalFaceMinDrop
}

export function setLodInternalFaceMinDrop(value: number): number {
  const clamped = Math.max(0.1, Math.min(2, value))
  lodInternalFaceMinDrop = clamped
  return clamped
}

export function logDebugLod(...args: unknown[]): void {
  if (!DEBUG_LOD_LOGS) return
  console.log('[debug lod]', ...args)
}
