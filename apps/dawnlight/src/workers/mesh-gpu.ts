/**
 * Mesh GPU
 * GPU-accelerated mesh generation using WebGPU
 */

import { BufferAttribute, BufferGeometry, Mesh, type Scene } from 'three'
import { CHUNK_SIZE } from '../constants'
import { GPUMeshGenerator } from '../engine/gpu-mesh'
import { getSolidMaterial } from '../engine/materials'
import type { ChunkMeshData } from '../types'
import { blockUVs } from '../utils/textures'

/**
 * Manages GPU-accelerated mesh generation
 */
export class MeshGPUProcessor {
  private gpuMeshGen: GPUMeshGenerator | null = null
  public useGPU = false
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Initialize GPU mesh generator (async)
   */
  async initialize(): Promise<boolean> {
    try {
      this.gpuMeshGen = new GPUMeshGenerator()
      const success = await this.gpuMeshGen.initialize()

      if (success) {
        // Update UV lookup table
        this.gpuMeshGen.updateUVLookup(blockUVs)
        this.useGPU = true
        console.log('[MeshGPUProcessor] GPU mesh generation ENABLED (WebGPU)')
        return true
      } else {
        this.gpuMeshGen = null
        console.log('[MeshGPUProcessor] GPU mesh generation disabled (WebGPU not available)')
        return false
      }
    } catch (error) {
      console.warn('[MeshGPUProcessor] GPU mesh init failed:', error)
      this.gpuMeshGen = null
      return false
    }
  }

  /**
   * Check if GPU is available
   */
  get isAvailable(): boolean {
    return this.gpuMeshGen !== null && this.useGPU
  }

  /**
   * Build mesh using GPU compute (if available)
   * Returns null if GPU is not available, caller should fall back to Worker
   */
  async buildChunkMesh(cx: number, cz: number, chunkData: Uint8Array, chunks: Map<string, Uint8Array>): Promise<ChunkMeshData | null> {
    if (!this.gpuMeshGen || !this.useGPU) {
      return null
    }

    try {
      // Get neighbor data
      const neighbors = {
        nx: chunks.get(`${cx - 1},${cz}`) || null,
        px: chunks.get(`${cx + 1},${cz}`) || null,
        nz: chunks.get(`${cx},${cz - 1}`) || null,
        pz: chunks.get(`${cx},${cz + 1}`) || null,
      }

      const result = await this.gpuMeshGen.generateMesh(chunkData, neighbors)

      if (!result || result.faceCount === 0) {
        return {}
      }

      // Create Three.js mesh from GPU result
      const chunkWorldX = cx * CHUNK_SIZE
      const chunkWorldZ = cz * CHUNK_SIZE

      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(result.vertices, 3))
      geometry.setAttribute('normal', new BufferAttribute(result.normals, 3))
      geometry.setAttribute('uv', new BufferAttribute(result.uvs, 2))
      geometry.setIndex(new BufferAttribute(result.indices, 1))

      // Compute bounding box
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()

      const mesh = new Mesh(geometry, getSolidMaterial())
      mesh.position.set(chunkWorldX, 0, chunkWorldZ)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = true
      this.scene.add(mesh)

      return { solid: mesh }
    } catch (error) {
      console.warn('[MeshGPUProcessor] GPU mesh build failed:', error)
      return null
    }
  }

  /**
   * Cleanup GPU resources
   */
  destroy(): void {
    if (this.gpuMeshGen) {
      this.gpuMeshGen.destroy()
      this.gpuMeshGen = null
    }
    this.useGPU = false
  }
}
