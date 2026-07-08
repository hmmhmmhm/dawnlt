import { createLodSection, createLodSectionKey, isLodSectionRenderable, type LodSection, normalizeToLevel, transitionLodSectionState } from './lod-section'

export interface LodSelectionResult {
  activeKeys: Set<string>
  activated: string[]
  deactivated: string[]
  missing: string[]
}

export interface LodTreeOptions {
  maxLevel: number
  baseDistance: number
  levelDistanceScale?: number
}

export interface LodCameraPosition {
  x: number
  z: number
}

export interface LodLeafCoord {
  x: number
  z: number
}

const DEFAULT_LEVEL_DISTANCE_SCALE = 2

export class LodTree {
  private readonly sections = new Map<string, LodSection>()
  private readonly activeKeys = new Set<string>()

  readonly maxLevel: number
  readonly baseDistance: number
  readonly levelDistanceScale: number

  constructor(options: LodTreeOptions) {
    this.maxLevel = Math.max(0, options.maxLevel)
    this.baseDistance = Math.max(1, options.baseDistance)
    this.levelDistanceScale = Math.max(1.01, options.levelDistanceScale ?? DEFAULT_LEVEL_DISTANCE_SCALE)
  }

  getSection(key: string): LodSection | undefined {
    return this.sections.get(key)
  }

  ensureSection(x: number, z: number, level: number): LodSection {
    const key = createLodSectionKey(x, z, level)
    const existing = this.sections.get(key)
    if (existing) return existing
    const section = createLodSection(x, z, level)
    this.sections.set(key, section)
    return section
  }

  setSectionState(x: number, z: number, level: number, state: 'idle' | 'building' | 'ready' | 'active'): LodSection {
    const section = this.ensureSection(x, z, level)
    transitionLodSectionState(section, state)
    return section
  }

  calculateExpectedLod(distance: number): number {
    let level = 0
    let threshold = this.baseDistance
    const normalizedDistance = Math.max(0, distance)

    while (level < this.maxLevel && normalizedDistance >= threshold) {
      level += 1
      threshold *= this.levelDistanceScale
    }

    return level
  }

  selectActiveSections(leaves: readonly LodLeafCoord[], camera: LodCameraPosition, canUseSection?: (x: number, z: number, level: number) => boolean): LodSelectionResult {
    const nextActive = new Set<string>()
    const missing = new Set<string>()

    for (const leaf of leaves) {
      const dx = leaf.x - camera.x
      const dz = leaf.z - camera.z
      const expectedLevel = this.calculateExpectedLod(Math.hypot(dx, dz))

      let selected: LodSection | undefined
      let firstMissing: string | null = null

      for (let level = expectedLevel; level <= this.maxLevel; level++) {
        const lodX = normalizeToLevel(leaf.x, level)
        const lodZ = normalizeToLevel(leaf.z, level)
        if (canUseSection && !canUseSection(lodX, lodZ, level)) continue
        const key = createLodSectionKey(lodX, lodZ, level)
        const section = this.sections.get(key)

        if (section && isLodSectionRenderable(section.state)) {
          selected = section
          break
        }

        if (!firstMissing) firstMissing = key
      }

      if (selected) {
        nextActive.add(selected.key)
        if (firstMissing) missing.add(firstMissing)
      } else if (firstMissing) {
        missing.add(firstMissing)
      }
    }

    const activated: string[] = []
    const deactivated: string[] = []

    for (const key of this.activeKeys) {
      if (!nextActive.has(key)) {
        deactivated.push(key)
        const section = this.sections.get(key)
        if (section?.state === 'active') {
          transitionLodSectionState(section, 'ready')
        }
      }
    }

    for (const key of nextActive) {
      if (!this.activeKeys.has(key)) {
        activated.push(key)
      }
      const section = this.sections.get(key)
      if (section?.state === 'ready') {
        transitionLodSectionState(section, 'active')
      }
    }

    this.activeKeys.clear()
    for (const key of nextActive) this.activeKeys.add(key)

    return {
      activeKeys: new Set(this.activeKeys),
      activated,
      deactivated,
      missing: [...missing],
    }
  }
}
