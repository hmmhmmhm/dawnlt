import { Box3, Group, type Material, type Mesh, type Object3D, type Scene, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { collectTreeFruitModelPlacements, type TreeFruitModelKey, type TreeFruitModelPlacement } from './tree-fruit-model-placements'

const TREE_FRUIT_MODEL_URLS: Record<TreeFruitModelKey, string> = {
  apple: '/glb/meshy/apple-round/apple-round.glb',
  orange: '/glb/meshy/orange-textured/orange-textured.glb',
  peach: '/glb/meshy/peach/peach.glb',
  banana: '/glb/meshy/banana/banana.glb',
}
const REFRESH_INTERVAL = 0.55
const MAX_TREE_FRUIT_MODELS = 112

export class TreeFruitModelSystem {
  private readonly loader = new GLTFLoader()
  private readonly root = new Group()
  private readonly instances = new Map<string, Object3D>()
  private readonly templates = new Map<TreeFruitModelKey, Object3D>()
  private refreshTimer = REFRESH_INTERVAL
  private disposed = false

  constructor(private readonly scene: Scene) {
    this.root.name = 'tree-fruit-glb-models'
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.scene.add(this.root)
  }

  async load(): Promise<void> {
    try {
      const entries = await Promise.all(
        Object.entries(TREE_FRUIT_MODEL_URLS).map(async ([key, url]) => {
          const gltf = await this.loader.loadAsync(url)
          return [key as TreeFruitModelKey, this.prepareTemplate(gltf.scene)] as const
        }),
      )
      if (this.disposed) return
      entries.forEach(([key, template]) => {
        this.templates.set(key, template)
      })
      console.log('[TreeFruitModelSystem] Loaded tree fruit models')
    } catch (error) {
      console.error('[TreeFruitModelSystem] Failed to load tree fruit models:', error)
    }
  }

  update(deltaTime: number, chunks3D: Map<string, Uint8Array>): void {
    if (this.templates.size === 0 || this.disposed) return
    this.refreshTimer += deltaTime
    if (this.refreshTimer < REFRESH_INTERVAL) return
    this.refreshTimer = 0

    const placements = collectTreeFruitModelPlacements(chunks3D, MAX_TREE_FRUIT_MODELS)
    const activeIds = new Set<string>()

    for (const placement of placements) {
      activeIds.add(placement.id)
      let model = this.instances.get(placement.id)
      if (!model) {
        const created = this.createFruitInstance(placement)
        if (!created) continue
        model = created
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
    this.templates.forEach((template) => {
      this.disposeTemplate(template)
    })
    this.templates.clear()
  }

  private createFruitInstance(placement: TreeFruitModelPlacement): Object3D | null {
    const template = this.templates.get(placement.modelKey)
    return template?.clone(true) ?? null
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
