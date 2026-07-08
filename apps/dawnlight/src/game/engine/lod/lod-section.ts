export type LodSectionState = 'idle' | 'building' | 'ready' | 'active'

export interface LodSectionCoord {
  x: number
  z: number
  level: number
}

export interface LodSection extends LodSectionCoord {
  key: string
  state: LodSectionState
}

const ALLOWED_TRANSITIONS: Record<LodSectionState, ReadonlySet<LodSectionState>> = {
  idle: new Set(['building']),
  building: new Set(['idle', 'ready']),
  ready: new Set(['idle', 'active']),
  active: new Set(['idle', 'ready']),
}

export function createLodSectionKey(x: number, z: number, level: number): string {
  return `${level}:${x},${z}`
}

export function normalizeToLevel(value: number, level: number): number {
  const scale = 1 << Math.max(0, level)
  return Math.floor(value / scale)
}

export function createLodSection(x: number, z: number, level: number, state: LodSectionState = 'idle'): LodSection {
  return {
    x,
    z,
    level,
    state,
    key: createLodSectionKey(x, z, level),
  }
}

export function canTransitionLodSectionState(from: LodSectionState, to: LodSectionState): boolean {
  return ALLOWED_TRANSITIONS[from].has(to)
}

export function transitionLodSectionState(section: LodSection, to: LodSectionState): LodSection {
  if (section.state === to) return section
  if (!canTransitionLodSectionState(section.state, to)) {
    throw new Error(`Invalid LOD state transition: ${section.state} -> ${to}`)
  }
  section.state = to
  return section
}

export function isLodSectionRenderable(state: LodSectionState): boolean {
  return state === 'ready' || state === 'active'
}
