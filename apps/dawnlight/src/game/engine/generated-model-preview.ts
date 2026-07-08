import { Box3, Group, type Material, type Mesh, type Object3D, type Scene, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GeneratedModelPreviewConfig } from './generated-model-preview-config'

export class GeneratedModelPreview {
  private readonly loader = new GLTFLoader()
  private readonly root = new Group()
  private loadedModel: Object3D | null = null
  private disposed = false

  constructor(
    private readonly scene: Scene,
    private readonly config: GeneratedModelPreviewConfig,
  ) {
    this.root.name = `generated-model-preview:${config.key}`
    this.root.position.set(config.position.x, config.position.y, config.position.z)
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.scene.add(this.root)
  }

  async load(): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(this.config.url)
      if (this.disposed) return

      const model = gltf.scene
      this.prepareModel(model)
      this.root.add(model)
      this.loadedModel = model
      console.log(`[GeneratedModelPreview] Loaded ${this.config.label}`)
    } catch (error) {
      console.error(`[GeneratedModelPreview] Failed to load ${this.config.label}:`, error)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.root.removeFromParent()
    if (this.loadedModel) {
      this.loadedModel.traverse((object) => {
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

  private prepareModel(model: Object3D): void {
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
    const normalizedScale = this.config.scale / maxAxis

    model.position.sub(center)
    model.scale.setScalar(normalizedScale)
    model.rotation.y = Math.PI * 0.18
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
  }
}
