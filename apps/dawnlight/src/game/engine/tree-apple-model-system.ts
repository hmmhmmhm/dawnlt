import { Box3, Group, type Material, type Mesh, type Object3D, type Scene, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { collectTreeAppleModelPlacements } from './tree-apple-model-placements'

const TREE_APPLE_MODEL_URL = '/glb/meshy/apple-round/apple-round.glb'
const REFRESH_INTERVAL = 0.55
const MAX_TREE_APPLE_MODELS = 96

export class TreeAppleModelSystem {
  private readonly loader = new GLTFLoader()
  private readonly root = new Group()
  private readonly instances = new Map<string, Object3D>()
  private template: Object3D | null = null
  private refreshTimer = REFRESH_INTERVAL
  private disposed = false

  constructor(private readonly scene: Scene) {
    this.root.name = 'tree-apple-round-models'
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.scene.add(this.root)
  }

  async load(): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(TREE_APPLE_MODEL_URL)
      if (this.disposed) return
      this.template = this.prepareTemplate(gltf.scene)
      console.log('[TreeAppleModelSystem] Loaded round apple model')
    } catch (error) {
      console.error('[TreeAppleModelSystem] Failed to load round apple model:', error)
    }
  }

  update(deltaTime: number, chunks3D: Map<string, Uint8Array>): void {
    if (!this.template || this.disposed) return
    this.refreshTimer += deltaTime
    if (this.refreshTimer < REFRESH_INTERVAL) return
    this.refreshTimer = 0

    const placements = collectTreeAppleModelPlacements(chunks3D, MAX_TREE_APPLE_MODELS)
    const activeIds = new Set<string>()

    for (const placement of placements) {
      activeIds.add(placement.id)
      let model = this.instances.get(placement.id)
      if (!model) {
        model = this.template.clone(true)
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
    this.template?.traverse((object) => {
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

  private prepareTemplate(model: Object3D): Object3D {
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
    const normalized = new Group()

    model.position.sub(center)
    model.scale.setScalar(1 / maxAxis)
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    normalized.add(model)
    return normalized
  }
}
