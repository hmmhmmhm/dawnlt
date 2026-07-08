import { Box3, Group, type Material, type Mesh, type Object3D, type Scene, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type BasketModelPlacement, collectBasketModelPlacements } from './basket-model-placements'

const BASKET_MODEL_URL = '/glb/meshy/empty-basket/empty-basket.glb'
const APPLE_MODEL_URL = '/glb/meshy/apple-round/apple-round.glb'
const REFRESH_INTERVAL = 0.45
const MAX_BASKET_MODELS = 96

export class BasketModelSystem {
  private readonly loader = new GLTFLoader()
  private readonly root = new Group()
  private readonly instances = new Map<string, Object3D>()
  private basketTemplate: Object3D | null = null
  private appleTemplate: Object3D | null = null
  private refreshTimer = REFRESH_INTERVAL
  private disposed = false

  constructor(private readonly scene: Scene) {
    this.root.name = 'basket-glb-models'
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.scene.add(this.root)
  }

  async load(): Promise<void> {
    try {
      const [basketGltf, appleGltf] = await Promise.all([this.loader.loadAsync(BASKET_MODEL_URL), this.loader.loadAsync(APPLE_MODEL_URL)])
      if (this.disposed) return

      this.basketTemplate = this.prepareTemplate(basketGltf.scene, 'bottom')
      this.appleTemplate = this.prepareTemplate(appleGltf.scene, 'center')
      console.log('[BasketModelSystem] Loaded basket and apple models')
    } catch (error) {
      console.error('[BasketModelSystem] Failed to load basket models:', error)
    }
  }

  update(deltaTime: number, chunks3D: Map<string, Uint8Array>): void {
    if (!this.basketTemplate || !this.appleTemplate || this.disposed) return
    this.refreshTimer += deltaTime
    if (this.refreshTimer < REFRESH_INTERVAL) return
    this.refreshTimer = 0

    const placements = collectBasketModelPlacements(chunks3D, MAX_BASKET_MODELS)
    const activeIds = new Set<string>()

    for (const placement of placements) {
      activeIds.add(placement.id)
      let model = this.instances.get(placement.id)
      if (!model) {
        model = this.createBasketInstance(placement)
        this.instances.set(placement.id, model)
        this.root.add(model)
      } else if (model.userData.appleCount !== placement.appleCount) {
        model.removeFromParent()
        model = this.createBasketInstance(placement)
        this.instances.set(placement.id, model)
        this.root.add(model)
      }

      model.position.set(placement.position.x, placement.position.y, placement.position.z)
      model.rotation.set(0, placement.rotationY, 0)
      model.scale.setScalar(placement.scale)
    }

    for (const [id, model] of this.instances) {
      if (activeIds.has(id)) continue
      model.removeFromParent()
      this.instances.delete(id)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.root.removeFromParent()
    this.instances.clear()
    this.disposeTemplate(this.basketTemplate)
    this.disposeTemplate(this.appleTemplate)
  }

  private createBasketInstance(placement: BasketModelPlacement): Object3D {
    const group = new Group()
    group.userData.appleCount = placement.appleCount

    group.add(this.basketTemplate!.clone(true))
    for (const slot of placement.appleSlots) {
      const apple = this.appleTemplate!.clone(true)
      apple.position.set(slot.position.x, slot.position.y, slot.position.z)
      apple.rotation.set(0, slot.rotationY, 0)
      apple.scale.setScalar(slot.scale)
      group.add(apple)
    }

    return group
  }

  private prepareTemplate(model: Object3D, anchor: 'bottom' | 'center'): Object3D {
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
    const normalized = new Group()

    model.scale.setScalar(1 / maxAxis)
    model.position.set(-center.x / maxAxis, anchor === 'bottom' ? -box.min.y / maxAxis : -center.y / maxAxis, -center.z / maxAxis)
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    normalized.add(model)
    return normalized
  }

  private disposeTemplate(template: Object3D | null): void {
    template?.traverse((object) => {
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
