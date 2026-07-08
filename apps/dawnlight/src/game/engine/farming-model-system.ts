import { Box3, Color, Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D, type Scene, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FARMING_MODEL_BLOCKS, type FarmingModelKey, getFarmingModelConfig, isFarmingWorldCropBlock } from './farming-model-config'
import { collectFarmingModelPlacements, type FarmingModelPlacement } from './farming-model-placements'

const REFRESH_INTERVAL = 0.5
const MAX_FARMING_MODELS = 180
interface ClusterOffset {
  x: number
  z: number
  scale: number
  rotation: number
}

const CLUSTER_OFFSETS: ClusterOffset[] = [
  { x: -0.1, z: -0.08, scale: 0.94, rotation: 0.2 },
  { x: 0.11, z: 0.08, scale: 0.98, rotation: 1.8 },
  { x: -0.3, z: 0.02, scale: 0.88, rotation: 3.1 },
  { x: 0.29, z: -0.02, scale: 0.9, rotation: 4.4 },
  { x: 0.02, z: -0.3, scale: 0.92, rotation: 2.6 },
  { x: -0.02, z: 0.3, scale: 0.9, rotation: 5.3 },
  { x: -0.29, z: -0.27, scale: 0.84, rotation: 0.9 },
  { x: 0.3, z: 0.27, scale: 0.86, rotation: 3.8 },
  { x: 0.27, z: -0.28, scale: 0.82, rotation: 5.8 },
]

function clusterOffsets(count: number): ClusterOffset[] {
  return CLUSTER_OFFSETS.slice(0, Math.max(1, Math.min(count, CLUSTER_OFFSETS.length)))
}

export class FarmingModelSystem {
  private readonly loader = new GLTFLoader()
  private readonly root = new Group()
  private readonly instances = new Map<string, Object3D>()
  private readonly placements = new Map<string, FarmingModelPlacement>()
  private readonly templates = new Map<FarmingModelKey, Object3D>()
  private refreshTimer = REFRESH_INTERVAL
  private elapsed = 0
  private disposed = false

  constructor(private readonly scene: Scene) {
    this.root.name = 'farming-glb-models'
    this.loader.setMeshoptDecoder(MeshoptDecoder)
    this.scene.add(this.root)
  }

  async load(): Promise<void> {
    const keys = new Set<FarmingModelKey>()
    const configsByKey = new Map<FarmingModelKey, string>()
    for (const block of FARMING_MODEL_BLOCKS) {
      if (!isFarmingWorldCropBlock(block)) continue
      const config = getFarmingModelConfig(block)
      if (config) {
        keys.add(config.key)
        configsByKey.set(config.key, config.url)
      }
    }

    try {
      const entries = await Promise.all(
        [...keys].map(async (key) => {
          const url = configsByKey.get(key)
          if (!url) return null
          const gltf = await this.loader.loadAsync(url)
          return [key, this.prepareTemplate(gltf.scene)] as const
        }),
      )
      if (this.disposed) return
      entries.forEach((entry) => {
        if (entry) this.templates.set(entry[0], entry[1])
      })
      console.log('[FarmingModelSystem] Loaded farming crop models')
    } catch (error) {
      console.error('[FarmingModelSystem] Failed to load farming crop models:', error)
    }
  }

  update(deltaTime: number, chunks3D: Map<string, Uint8Array>, focus?: Vector3): void {
    if (this.templates.size === 0 || this.disposed) return
    this.elapsed += deltaTime
    this.refreshTimer += deltaTime

    if (this.refreshTimer >= REFRESH_INTERVAL) {
      this.refreshTimer = 0
      this.syncPlacements(chunks3D, focus)
    }

    for (const [id, model] of this.instances) {
      const placement = this.placements.get(id)
      if (!placement) continue
      model.rotation.y = placement.rotationY
      model.rotation.z = Math.sin(this.elapsed * 1.4 + placement.phase) * 0.025
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.root.removeFromParent()
    this.instances.clear()
    this.placements.clear()
    this.templates.forEach((template) => {
      this.disposeTemplate(template)
    })
    this.templates.clear()
  }

  private syncPlacements(chunks3D: Map<string, Uint8Array>, focus?: Vector3): void {
    const placements = collectFarmingModelPlacements(chunks3D, MAX_FARMING_MODELS, focus)
    const activeIds = new Set<string>()

    for (const placement of placements) {
      activeIds.add(placement.id)
      this.placements.set(placement.id, placement)
      let model = this.instances.get(placement.id)
      if (!model) {
        const created = this.createInstance(placement)
        if (!created) continue
        model = created
        this.instances.set(placement.id, model)
        this.root.add(model)
      }

      model.position.set(placement.position.x, placement.position.y, placement.position.z)
      model.rotation.set(0, placement.rotationY, 0)
      const worldScale = getFarmingModelConfig(placement.blockType)?.worldScale
      model.scale.set(placement.scale * (worldScale?.x ?? 1), placement.scale * (worldScale?.y ?? 1), placement.scale * (worldScale?.z ?? 1))
    }

    for (const [id, model] of this.instances) {
      if (activeIds.has(id)) continue
      model.removeFromParent()
      this.instances.delete(id)
      this.placements.delete(id)
    }
  }

  private createInstance(placement: FarmingModelPlacement): Object3D | null {
    const template = this.templates.get(placement.modelKey)
    if (!template) return null

    const root = new Group()
    const config = getFarmingModelConfig(placement.blockType)
    const tint = config?.tint
    const offsets = clusterOffsets(placement.clusterCount)
    offsets.forEach((offset, index) => {
      const model = template.clone(true)
      if (tint) this.applyTint(model, tint, config?.tintStrength, config?.emissiveStrength)
      model.position.set(offset.x, 0, offset.z)
      model.rotation.y = offset.rotation
      model.scale.setScalar(offset.scale)
      model.name = `${placement.modelKey}-cluster-${index + 1}`
      root.add(model)
    })
    return root
  }

  private applyTint(model: Object3D, tint: number, strength = 0.82, emissiveStrength = 0.1): void {
    const tintColor = new Color(tint)
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => this.tintedMaterial(material, tintColor, strength, emissiveStrength))
      } else {
        mesh.material = this.tintedMaterial(mesh.material, tintColor, strength, emissiveStrength)
      }
    })
  }

  private tintedMaterial(material: Material, tint: Color, strength: number, emissiveStrength: number): Material {
    const cloned = material.clone()
    const standard = cloned as MeshStandardMaterial
    if (strength >= 0.9) standard.map = null
    if (standard.color) standard.color.lerp(tint, strength)
    if (standard.emissive) {
      standard.emissive.lerp(tint, strength)
      standard.emissiveIntensity = Math.max(standard.emissiveIntensity ?? 0, emissiveStrength)
    }
    if (typeof standard.roughness === 'number') standard.roughness = Math.min(1, standard.roughness + 0.18)
    return cloned
  }

  private prepareTemplate(model: Object3D): Object3D {
    const box = new Box3().setFromObject(model)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z, 0.001)
    const normalized = new Group()

    model.scale.setScalar(1 / maxAxis)
    model.position.set(-center.x / maxAxis, -box.min.y / maxAxis, -center.z / maxAxis)
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
