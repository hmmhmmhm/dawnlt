import { canTransitionLodSectionState, createLodSection, createLodSectionKey, transitionLodSectionState } from './lod-section'
import { LodTree } from './lod-tree'

// Use globals provided by Jest environment
declare const describe: any
declare const test: any
declare const expect: any

describe('LOD section state machine', () => {
  test('allows valid transitions in lifecycle order', () => {
    const section = createLodSection(0, 0, 0)

    expect(canTransitionLodSectionState('idle', 'building')).toBe(true)

    transitionLodSectionState(section, 'building')
    transitionLodSectionState(section, 'ready')
    transitionLodSectionState(section, 'active')

    expect(section.state).toBe('active')
  })

  test('rejects invalid transitions', () => {
    const section = createLodSection(0, 0, 0)

    expect(() => transitionLodSectionState(section, 'active')).toThrow('Invalid LOD state transition')
  })
})

describe('LOD tree selection', () => {
  test('distance-based expected LOD increases with distance', () => {
    const tree = new LodTree({
      maxLevel: 3,
      baseDistance: 8,
      levelDistanceScale: 2,
    })

    expect(tree.calculateExpectedLod(1)).toBe(0)
    expect(tree.calculateExpectedLod(8)).toBe(1)
    expect(tree.calculateExpectedLod(16)).toBe(2)
    expect(tree.calculateExpectedLod(40)).toBe(3)
  })

  test('uses parent fallback when child LOD is not ready', () => {
    const tree = new LodTree({
      maxLevel: 2,
      baseDistance: 8,
      levelDistanceScale: 2,
    })

    tree.setSectionState(0, 0, 1, 'building')
    tree.setSectionState(0, 0, 1, 'ready')

    const result = tree.selectActiveSections([{ x: 1, z: 1 }], { x: 1, z: 1 })

    expect(result.activeKeys.has(createLodSectionKey(0, 0, 1))).toBe(true)
    expect(result.missing).toContain(createLodSectionKey(1, 1, 0))
  })

  test('switches from parent to child when child becomes ready', () => {
    const tree = new LodTree({
      maxLevel: 2,
      baseDistance: 8,
      levelDistanceScale: 2,
    })

    tree.setSectionState(0, 0, 1, 'building')
    tree.setSectionState(0, 0, 1, 'ready')

    const before = tree.selectActiveSections([{ x: 1, z: 1 }], { x: 1, z: 1 })
    expect(before.activeKeys.has(createLodSectionKey(0, 0, 1))).toBe(true)

    tree.setSectionState(1, 1, 0, 'building')
    tree.setSectionState(1, 1, 0, 'ready')

    const after = tree.selectActiveSections([{ x: 1, z: 1 }], { x: 1, z: 1 })

    expect(after.activeKeys.has(createLodSectionKey(1, 1, 0))).toBe(true)
    expect(after.activeKeys.has(createLodSectionKey(0, 0, 1))).toBe(false)
    expect(after.activated).toContain(createLodSectionKey(1, 1, 0))
    expect(after.deactivated).toContain(createLodSectionKey(0, 0, 1))
  })
})
