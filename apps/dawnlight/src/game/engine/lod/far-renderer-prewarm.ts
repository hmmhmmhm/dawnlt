import { BufferAttribute, BufferGeometry, type Material, Mesh, PerspectiveCamera, Scene, type WebGLRenderer } from 'three'

function createTriangleGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]), 3))
  geometry.setIndex([0, 1, 2])
  return geometry
}

export async function prewarmFarRendererMaterials(renderer: WebGLRenderer | null, materials: readonly Material[]): Promise<void> {
  if (!renderer || materials.length === 0) return

  const scene = new Scene()
  const camera = new PerspectiveCamera(60, 1, 0.1, 10)
  camera.position.set(0, 0, 2)
  camera.lookAt(0, 0, 0)

  const meshes = materials.map((material, index) => {
    const mesh = new Mesh(createTriangleGeometry(), material)
    mesh.position.x = index * 2
    scene.add(mesh)
    return mesh
  })

  try {
    if ('compileAsync' in renderer && typeof renderer.compileAsync === 'function') {
      await renderer.compileAsync(scene, camera)
    } else {
      renderer.compile(scene, camera)
    }
  } catch {
    renderer.compile(scene, camera)
  } finally {
    for (const mesh of meshes) {
      mesh.geometry.dispose()
      scene.remove(mesh)
    }
  }
}
