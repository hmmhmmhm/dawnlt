import { Box3, BufferGeometry, Float32BufferAttribute, Group, type Material, Mesh, type Object3D, type Scene, Vector3 } from 'three'
import { getFluidMaterial, getFoliageMaterial, getSolidMaterial } from '../../engine/materials'
import { faceData } from '../../engine/mesh/face-definitions'
import { isFluidBlock, isFoliageBlock } from '../../shared'
import { BlockType, type Inventory, type Player } from '../../types'
import { getTextureUV } from '../../utils/textures'
import { addItemToInventory } from '../inventory-utils'
import { getFarmingModelConfig, isFarmingModelBlock } from './farming-model-config'

const PICKUP_RADIUS = 1.35
const ITEM_SIZE = 0.34
const BOB_HEIGHT = 0.08
const BOB_SPEED = 1.8
const ROTATION_SPEED = 0.8

export interface DroppedItem {
  id: number
  type: BlockType
  count: number
  basePosition: Vector3
  age: number
  mesh: Mesh | Group
}

let nextDroppedItemId = 1

function getDroppedItemMaterial(type: BlockType) {
  if (isFluidBlock(type)) return getFluidMaterial()
  if (isFoliageBlock(type) || type === BlockType.GLASS) return getFoliageMaterial()
  return getSolidMaterial()
}

function getFaceTextureType(faceName: string): 'top' | 'bottom' | 'side' {
  if (faceName === 'top' || faceName === 'bottom') return faceName
  return 'side'
}

function pushFaceColor(colors: number[], shade: number): void {
  for (let i = 0; i < 4; i++) {
    colors.push(shade, shade, shade)
  }
}

export function createDroppedBlockGeometry(type: BlockType): BufferGeometry {
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  for (const [faceName, face] of Object.entries(faceData)) {
    const baseIndex = vertices.length / 3
    const [uMin, vMin, uMax, vMax] = getTextureUV(type, getFaceTextureType(faceName)) ?? [0, 0, 1, 1]

    for (const corner of face.corners) {
      vertices.push((corner[0] - 0.5) * ITEM_SIZE, (corner[1] - 0.5) * ITEM_SIZE, (corner[2] - 0.5) * ITEM_SIZE)
      normals.push(face.dir[0], face.dir[1], face.dir[2])
    }

    uvs.push(uMin, vMax, uMax, vMax, uMax, vMin, uMin, vMin)
    pushFaceColor(colors, face.shade)
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  return geometry
}

export class DroppedItemSystem {
  private readonly items: DroppedItem[] = []
  private readonly geometries = new Map<BlockType, BufferGeometry>()
  private readonly modelTemplates = new Map<BlockType, Object3D>()
  private readonly modelLoading = new Map<BlockType, Promise<Object3D | null>>()

  constructor(private readonly scene: Scene) {}

  spawn(type: BlockType, position: Vector3, count = 1): DroppedItem {
    const mesh = isFarmingModelBlock(type) ? this.createModelBackedDrop(type) : new Mesh(this.getGeometry(type), getDroppedItemMaterial(type))
    const basePosition = position.clone()
    mesh.position.copy(basePosition)
    mesh.traverse((object) => {
      const objectMesh = object as Mesh
      if (!objectMesh.isMesh) return
      objectMesh.castShadow = true
      objectMesh.receiveShadow = true
    })
    this.scene.add(mesh)

    const item: DroppedItem = {
      id: nextDroppedItemId++,
      type,
      count: Math.max(1, Math.floor(count)),
      basePosition,
      age: 0,
      mesh,
    }
    this.items.push(item)
    return item
  }

  update(deltaTime: number, player: Player, inventory: Inventory): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      item.age += deltaTime
      item.mesh.rotation.y += deltaTime * ROTATION_SPEED
      item.mesh.position.y = item.basePosition.y + Math.sin(item.age * BOB_SPEED) * BOB_HEIGHT

      if (item.mesh.position.distanceTo(player.position) > PICKUP_RADIUS) continue

      const result = addItemToInventory(inventory, item.type, item.count)
      item.count = result.remaining
      if (item.count <= 0) {
        this.removeAt(i)
      }
    }
  }

  getItemCount(): number {
    return this.items.length
  }

  getItems(): readonly DroppedItem[] {
    return this.items
  }

  dispose(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.removeAt(i)
    }
    this.geometries.forEach((geometry) => {
      geometry.dispose()
    })
    this.geometries.clear()
    this.modelTemplates.forEach((template) => {
      this.disposeTemplate(template)
    })
    this.modelTemplates.clear()
  }

  private getGeometry(type: BlockType): BufferGeometry {
    const cached = this.geometries.get(type)
    if (cached) return cached

    const geometry = createDroppedBlockGeometry(type)
    this.geometries.set(type, geometry)
    return geometry
  }

  private removeAt(index: number): void {
    const [item] = this.items.splice(index, 1)
    this.scene.remove(item.mesh)
  }

  private createModelBackedDrop(type: BlockType): Group {
    const group = new Group()
    group.name = `dropped-farming-model:${BlockType[type]}`
    group.userData.type = type

    const cached = this.modelTemplates.get(type)
    if (cached) {
      group.add(cached.clone(true))
    } else if (typeof window !== 'undefined') {
      void this.loadTemplate(type).then((template) => {
        if (!template || !this.scene.children.includes(group)) return
        group.add(template.clone(true))
      })
    }

    return group
  }

  private loadTemplate(type: BlockType): Promise<Object3D | null> {
    const cached = this.modelTemplates.get(type)
    if (cached) return Promise.resolve(cached)

    const loading = this.modelLoading.get(type)
    if (loading) return loading

    const config = getFarmingModelConfig(type)
    if (!config) return Promise.resolve(null)

    const promise = Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')])
      .then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
        const loader = new GLTFLoader()
        loader.setMeshoptDecoder(MeshoptDecoder)
        return loader.loadAsync(config.url)
      })
      .then((gltf) => {
        const template = this.prepareTemplate(gltf.scene, config.dropScale)
        this.modelTemplates.set(type, template)
        this.modelLoading.delete(type)
        return template
      })
      .catch((error) => {
        console.error(`[DroppedItemSystem] Failed to load ${config.label}:`, error)
        this.modelLoading.delete(type)
        return null
      })

    this.modelLoading.set(type, promise)
    return promise
  }

  private prepareTemplate(model: Object3D, scale: number): Object3D {
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
    const normalizedScale = scale / maxAxis
    const normalized = new Group()

    model.scale.setScalar(normalizedScale)
    model.position.set(-center.x * normalizedScale, -center.y * normalizedScale, -center.z * normalizedScale)
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    normalized.add(model)
    return normalized
  }

  private disposeTemplate(template: Object3D): void {
    template.traverse((object) => {
      const mesh = object as Mesh
      mesh.geometry?.dispose()
      const material = mesh.material
      if (Array.isArray(material)) {
        material.forEach((item) => {
          item.dispose()
        })
      } else {
        ;(material as Material | undefined)?.dispose()
      }
    })
  }
}
