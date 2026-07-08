import { Mesh, Scene, Vector3 } from 'three'
import { BlockType, type Inventory, type Player } from '../../types'
import type { blockUVs as blockUVsType, getTextureUV as getTextureUVType } from '../../utils/textures'
import type { DroppedItemSystem as DroppedItemSystemType } from './dropped-items'

declare const describe: any
declare const beforeAll: any
declare const test: any
declare const expect: any

let DroppedItemSystem: typeof DroppedItemSystemType
let blockUVs: typeof blockUVsType
let getTextureUV: typeof getTextureUVType

beforeAll(async () => {
  ;(globalThis as any).document ??= {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        setTransform: () => {},
        get imageSmoothingEnabled() {
          return false
        },
        set imageSmoothingEnabled(_value: boolean) {},
        set fillStyle(_value: string) {},
      }),
      toDataURL: () => 'data:image/png;base64,',
    }),
  }

  ;({ DroppedItemSystem } = await import('./dropped-items'))
  ;({ blockUVs, getTextureUV } = await import('../../utils/textures'))
})

function seedBlockUvs(type: BlockType): void {
  blockUVs[`${type}:top`] = [0, 0, 1, 1]
  blockUVs[`${type}:side`] = [0, 0, 1, 1]
  blockUVs[`${type}:bottom`] = [0, 0, 1, 1]
  blockUVs[`${type}:front`] = blockUVs[`${type}:side`]
  blockUVs[`${type}:back`] = blockUVs[`${type}:side`]
  blockUVs[`${type}:left`] = blockUVs[`${type}:side`]
  blockUVs[`${type}:right`] = blockUVs[`${type}:side`]
}

function expectUvSliceToMatch(received: number[], expected: number[]): void {
  expect(received.length).toBe(expected.length)
  received.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], 6)
  })
}

function createInventory(): Inventory {
  return {
    hotbar: new Array(9).fill(null),
    slots: new Array(36).fill(null),
  }
}

function createPlayer(position: Vector3): Player {
  return {
    position,
    velocity: new Vector3(),
    rotation: { x: 0, y: 0 },
    isGrounded: true,
    isFlying: false,
    isCrouching: false,
    isSneaking: false,
    selectedSlot: 0,
  }
}

describe('DroppedItemSystem', () => {
  test('uses the same block face UVs as world blocks', () => {
    blockUVs[`${BlockType.GRASS}:top`] = [0.1, 0.2, 0.15, 0.25]
    blockUVs[`${BlockType.GRASS}:side`] = [0.2, 0.3, 0.25, 0.35]
    blockUVs[`${BlockType.GRASS}:bottom`] = [0.3, 0.4, 0.35, 0.45]
    blockUVs[`${BlockType.GRASS}:front`] = blockUVs[`${BlockType.GRASS}:side`]
    blockUVs[`${BlockType.GRASS}:back`] = blockUVs[`${BlockType.GRASS}:side`]
    blockUVs[`${BlockType.GRASS}:left`] = blockUVs[`${BlockType.GRASS}:side`]
    blockUVs[`${BlockType.GRASS}:right`] = blockUVs[`${BlockType.GRASS}:side`]

    const scene = new Scene()
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.GRASS, new Vector3(0, 1, 0))
    const item = system.getItems()[0]
    expect(item.mesh).toBeInstanceOf(Mesh)
    const uvs = Array.from((item.mesh as Mesh).geometry.getAttribute('uv').array as ArrayLike<number>)
    const expectedTop = getTextureUV(BlockType.GRASS, 'top')
    const expectedSide = getTextureUV(BlockType.GRASS, 'side')
    const expectedBottom = getTextureUV(BlockType.GRASS, 'bottom')

    expectUvSliceToMatch(uvs.slice(0, 8), [expectedTop[0], expectedTop[3], expectedTop[2], expectedTop[3], expectedTop[2], expectedTop[1], expectedTop[0], expectedTop[1]])
    expectUvSliceToMatch(uvs.slice(16, 24), [expectedSide[0], expectedSide[3], expectedSide[2], expectedSide[3], expectedSide[2], expectedSide[1], expectedSide[0], expectedSide[1]])
    expectUvSliceToMatch(uvs.slice(8, 16), [expectedBottom[0], expectedBottom[3], expectedBottom[2], expectedBottom[3], expectedBottom[2], expectedBottom[1], expectedBottom[0], expectedBottom[1]])
  })

  test('collects a nearby dropped block into inventory and removes its mesh', () => {
    seedBlockUvs(BlockType.DIRT)
    const scene = new Scene()
    const inventory = createInventory()
    const player = createPlayer(new Vector3(0, 0, 0))
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.DIRT, new Vector3(0.5, 0.4, 0.5))
    system.update(0.016, player, inventory)

    expect(inventory.hotbar[0]).toEqual({ type: BlockType.DIRT, count: 1 })
    expect(system.getItemCount()).toBe(0)
    expect(scene.children.length).toBe(0)
  })

  test('collects a placed apple basket back into a filled basket item', () => {
    seedBlockUvs(BlockType.BASKET_APPLES_3)
    const scene = new Scene()
    const inventory = createInventory()
    const player = createPlayer(new Vector3(0, 0, 0))
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.BASKET_APPLES_3, new Vector3(0.5, 0.4, 0.5))
    system.update(0.016, player, inventory)

    expect(inventory.hotbar[0]).toEqual({
      type: BlockType.BASKET,
      count: 1,
      storedType: BlockType.APPLE,
      storedCount: 3,
    })
    expect(system.getItemCount()).toBe(0)
  })

  test('keeps dropped item in world when inventory has no room', () => {
    seedBlockUvs(BlockType.WOOD)
    const scene = new Scene()
    const inventory = createInventory()
    for (let i = 0; i < inventory.hotbar.length; i++) inventory.hotbar[i] = { type: BlockType.DIRT, count: 64 }
    for (let i = 0; i < inventory.slots.length; i++) inventory.slots[i] = { type: BlockType.STONE, count: 64 }
    const player = createPlayer(new Vector3(0, 0, 0))
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.WOOD, new Vector3(0.5, 0.4, 0.5))
    system.update(0.016, player, inventory)

    expect(system.getItemCount()).toBe(1)
    expect(scene.children.length).toBe(1)
  })

  test('animates dropped item bob and rotation while uncollected', () => {
    seedBlockUvs(BlockType.STONE)
    const scene = new Scene()
    const inventory = createInventory()
    const player = createPlayer(new Vector3(20, 0, 20))
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.STONE, new Vector3(0, 1, 0))
    const item = system.getItems()[0]
    const startY = item.mesh.position.y
    const startX = item.mesh.position.x
    const startZ = item.mesh.position.z
    const startRotation = item.mesh.rotation.y

    system.update(0.5, player, inventory)

    expect(item.mesh.position.y).not.toBe(startY)
    expect(Math.abs(item.mesh.position.y - startY)).toBeLessThanOrEqual(0.09)
    expect(item.mesh.position.x).toBe(startX)
    expect(item.mesh.position.z).toBe(startZ)
    expect(item.mesh.rotation.y).not.toBe(startRotation)
    expect(item.mesh.rotation.y - startRotation).toBeLessThan(0.6)
    expect(system.getItemCount()).toBe(1)
  })

  test('uses model-backed objects instead of cube geometry for non-square farming drops', () => {
    const scene = new Scene()
    const system = new DroppedItemSystem(scene)

    system.spawn(BlockType.WHEAT, new Vector3(0, 1, 0))
    const item = system.getItems()[0]

    expect(item.mesh.type).toBe('Group')
    expect('geometry' in item.mesh).toBe(false)
    expect(scene.children[0]).toBe(item.mesh)
  })
})
