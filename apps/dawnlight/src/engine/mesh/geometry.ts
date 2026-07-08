import { Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, type Scene, Sphere, Vector3 } from 'three'
import type { ChunkMeshData } from '../../types'
import { textureAtlas } from '../../utils/textures'
import { attachFoliageWindController, getFluidMaterial, getFoliageMaterial, getSolidMaterial } from '../materials'
import type { MeshBuffers } from './types'

interface BoundingInfo {
  chunkWorldX: number
  chunkWorldZ: number
  minY: number
  maxY: number
  worldYOffset?: number
}

/**
 * Create bounding box for a chunk
 */
function createBoundingBox(info: BoundingInfo): Box3 {
  const yOffset = info.worldYOffset ?? 0
  return new Box3(new Vector3(info.chunkWorldX, yOffset + info.minY, info.chunkWorldZ), new Vector3(info.chunkWorldX + 16, yOffset + info.maxY + 1, info.chunkWorldZ + 16))
}

/**
 * Create solid mesh from buffers
 */
export function createSolidMesh(buffers: MeshBuffers, boundingBox: Box3, scene: Scene, userData?: Record<string, unknown>): Mesh | null {
  const { solidVertices, solidNormals, solidUvs, solidIndices, solidColors } = buffers

  if (solidVertices.length === 0) return null

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(solidVertices, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(solidNormals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(solidUvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(solidColors, 3))
  geometry.setIndex(solidIndices)
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)

  const material = getSolidMaterial()

  const mesh = new Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  if (userData) {
    mesh.userData = userData
  }
  scene.add(mesh)
  return mesh
}

/**
 * Create transparent mesh from buffers
 */
export function createTransparentMesh(buffers: MeshBuffers, boundingBox: Box3, scene: Scene, userData?: Record<string, unknown>): Mesh | null {
  const { transparentVertices, transparentNormals, transparentUvs, transparentIndices, transparentColors } = buffers

  if (transparentVertices.length === 0) return null

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(transparentVertices, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(transparentNormals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(transparentUvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(transparentColors, 3))
  geometry.setIndex(transparentIndices)
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)

  const material = new MeshStandardMaterial({
    vertexColors: true,
    map: textureAtlas,
    transparent: true,
    opacity: 0.8,
    alphaTest: 0.1,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.2,
    metalness: 0.1,
  })

  const mesh = new Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  mesh.renderOrder = 1
  if (userData) {
    mesh.userData = { ...mesh.userData, ...userData }
  }
  attachFoliageWindController(mesh)
  scene.add(mesh)
  return mesh
}

/**
 * Create foliage mesh from buffers
 */
export function createFoliageMesh(buffers: MeshBuffers, boundingBox: Box3, scene: Scene, userData?: Record<string, unknown>): Mesh | null {
  const { foliageVertices, foliageNormals, foliageUvs, foliageIndices, foliageColors, foliageWindWeights } = buffers

  if (foliageVertices.length === 0) return null

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(foliageVertices, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(foliageNormals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(foliageUvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(foliageColors, 3))
  geometry.setAttribute('windWeight', new Float32BufferAttribute(foliageWindWeights, 1))
  geometry.setIndex(foliageIndices)
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)

  const material = getFoliageMaterial()

  const mesh = new Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  mesh.renderOrder = 1
  if (userData) {
    mesh.userData = userData
  }
  scene.add(mesh)
  return mesh
}

/**
 * Create fluid mesh from buffers
 */
export function createFluidMesh(buffers: MeshBuffers, boundingBox: Box3, scene: Scene, userData?: Record<string, unknown>): Mesh | null {
  const { fluidVertices, fluidNormals, fluidUvs, fluidIndices, fluidColors } = buffers

  if (fluidVertices.length === 0) return null

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(fluidVertices, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(fluidNormals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(fluidUvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(fluidColors, 3))
  geometry.setIndex(fluidIndices)
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)

  const material = getFluidMaterial()

  const mesh = new Mesh(geometry, material)
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  mesh.renderOrder = 1
  if (userData) {
    mesh.userData = userData
  }
  scene.add(mesh)
  return mesh
}

/**
 * Build all meshes from buffers and add to scene
 */
export function buildMeshesFromBuffers(buffers: MeshBuffers, boundingInfo: BoundingInfo, scene: Scene, userData?: Record<string, unknown>): ChunkMeshData {
  const boundingBox = createBoundingBox(boundingInfo)
  const meshData: ChunkMeshData = {}

  const solidMesh = createSolidMesh(buffers, boundingBox, scene, userData ? { ...userData, type: 'solid' } : undefined)
  if (solidMesh) meshData.solid = solidMesh

  const transparentMesh = createTransparentMesh(buffers, boundingBox, scene, userData ? { ...userData, type: 'transparent' } : undefined)
  if (transparentMesh) meshData.transparent = transparentMesh

  const foliageMesh = createFoliageMesh(buffers, boundingBox, scene, userData ? { ...userData, type: 'foliage' } : undefined)
  if (foliageMesh) meshData.foliage = foliageMesh

  const fluidMesh = createFluidMesh(buffers, boundingBox, scene, userData ? { ...userData, type: 'fluid' } : undefined)
  if (fluidMesh) meshData.fluid = fluidMesh

  return meshData
}
