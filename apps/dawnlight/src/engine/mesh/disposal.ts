import { Mesh, type Object3D, type Scene } from 'three'
import type { ChunkMeshData } from '../../types'

/**
 * Dispose a chunk mesh and remove it from the scene
 */
export function disposeMesh(meshData: ChunkMeshData, scene: Scene): void {
  let removedCount = 0

  if (meshData.solid) {
    const wasInScene = scene.children.includes(meshData.solid)
    scene.remove(meshData.solid)
    meshData.solid.geometry.dispose()
    if (wasInScene) removedCount++
    // Do not dispose material as it is shared
  }

  if (meshData.transparent) {
    const wasInScene = scene.children.includes(meshData.transparent)
    scene.remove(meshData.transparent)
    meshData.transparent.geometry.dispose()
    if (Array.isArray(meshData.transparent.material)) {
      meshData.transparent.material.forEach((m) => {
        m.dispose()
      })
    } else {
      meshData.transparent.material.dispose()
    }
    if (wasInScene) removedCount++
  }

  if (meshData.foliage) {
    const wasInScene = scene.children.includes(meshData.foliage)
    scene.remove(meshData.foliage)
    meshData.foliage.geometry.dispose()
    if (wasInScene) removedCount++
    // Do not dispose material as it is shared
  }

  if (meshData.fluid) {
    const wasInScene = scene.children.includes(meshData.fluid)
    scene.remove(meshData.fluid)
    meshData.fluid.geometry.dispose()
    if (wasInScene) removedCount++
    // Do not dispose material as it is shared
  }

  const totalMeshes = (meshData.solid ? 1 : 0) + (meshData.transparent ? 1 : 0) + (meshData.foliage ? 1 : 0) + (meshData.fluid ? 1 : 0)
  if (removedCount !== totalMeshes) {
    // Debug logging disabled
    // console.log(
    //   `%c[DISPOSE] WARNING: removed ${removedCount}/${totalMeshes} meshes from scene`,
    //   'color: #F44336; font-weight: bold'
    // )
  }
}

/**
 * Force cleanup all meshes for a specific chunk from the scene
 * This is useful to remove "ghost" meshes that might have lost their reference
 */
export function cleanupChunkMeshes(cx: number, cy: number, cz: number, scene: Scene): void {
  // Find all meshes belonging to this chunk
  const meshesToRemove: Object3D[] = []

  scene.traverse((object) => {
    if (object instanceof Mesh && object.userData && object.userData.isChunkMesh) {
      if (object.userData.cx === cx && object.userData.cy === cy && object.userData.cz === cz) {
        meshesToRemove.push(object)
      }
    }
  })

  if (meshesToRemove.length > 0) {
    console.log(`[CLEANUP] Removing ${meshesToRemove.length} stale meshes for chunk ${cx},${cy},${cz}`)
    meshesToRemove.forEach((mesh) => {
      scene.remove(mesh)
      if (mesh instanceof Mesh) {
        mesh.geometry.dispose()
        if (mesh.material && !Array.isArray(mesh.material) && mesh.userData.type === 'transparent') {
          mesh.material.dispose()
        }
      }
    })
  }
}
