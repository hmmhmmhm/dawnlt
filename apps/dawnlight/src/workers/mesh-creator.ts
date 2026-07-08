/**
 * Mesh Creator
 * Creates Three.js meshes from mesh data (vertices, normals, uvs, colors, indices)
 */

import { type Box3, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshStandardMaterial, Sphere } from 'three'
import { attachFoliageWindController, getFluidMaterial, getFoliageMaterial, getSolidMaterial } from '../engine/materials'
import { textureAtlas } from '../utils/textures'

/**
 * Mesh data structure for solid, transparent, and fluid meshes
 */
export interface MeshBufferData {
  vertices: Float32Array
  normals: Float32Array
  uvs: Float32Array
  colors: Float32Array
  indices: Uint32Array
}

/**
 * Mesh data structure for foliage meshes (includes wind weights)
 */
export interface FoliageMeshBufferData extends MeshBufferData {
  windWeights: Float32Array
}

/**
 * Create geometry from buffer data with pre-calculated bounding box
 */
function createGeometryFromBuffers(data: MeshBufferData, boundingBox: Box3): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.vertices, 3))
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2))
  geometry.setAttribute('color', new BufferAttribute(data.colors, 3))
  geometry.setIndex(new BufferAttribute(data.indices, 1))
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)
  return geometry
}

/**
 * Create a solid mesh (opaque blocks like stone, dirt, etc.)
 */
export function createSolidMesh(data: MeshBufferData, boundingBox: Box3): Mesh {
  const geometry = createGeometryFromBuffers(data, boundingBox)

  const mesh = new Mesh(geometry, getSolidMaterial())
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  return mesh
}

/**
 * Create a transparent mesh (blocks like glass, leaves, etc.)
 */
export function createTransparentMesh(data: MeshBufferData, boundingBox: Box3): Mesh {
  const geometry = createGeometryFromBuffers(data, boundingBox)

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
  return mesh
}

/**
 * Create a foliage mesh (plants, flowers, etc. with wind animation)
 */
export function createFoliageMesh(data: FoliageMeshBufferData, boundingBox: Box3): Mesh {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.vertices, 3))
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2))
  geometry.setAttribute('color', new BufferAttribute(data.colors, 3))
  geometry.setAttribute('windWeight', new BufferAttribute(data.windWeights, 1))
  geometry.setIndex(new BufferAttribute(data.indices, 1))
  geometry.boundingBox = boundingBox.clone()
  geometry.boundingSphere = new Sphere()
  boundingBox.getBoundingSphere(geometry.boundingSphere)

  const mesh = new Mesh(geometry, getFoliageMaterial())
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  mesh.renderOrder = 1
  attachFoliageWindController(mesh)
  return mesh
}

/**
 * Create a fluid mesh (water, lava, etc.)
 */
export function createFluidMesh(data: MeshBufferData, boundingBox: Box3): Mesh {
  const geometry = createGeometryFromBuffers(data, boundingBox)

  const mesh = new Mesh(geometry, getFluidMaterial())
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.frustumCulled = true
  mesh.renderOrder = 1
  return mesh
}
