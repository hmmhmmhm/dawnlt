/**
 * GPU Mesh Generator using WebGPU Compute Shaders
 * Generates vertex data directly on the GPU for maximum performance
 */

import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'
import type { ChunkNeighbors, GPUMeshResult } from './gpu-mesh-types'
import { meshComputeShader } from './mesh-compute-shader'

export class GPUMeshGenerator {
  private device: GPUDevice | null = null
  private pipeline: GPUComputePipeline | null = null
  private bindGroupLayout: GPUBindGroupLayout | null = null

  // Reusable buffers
  private chunkBuffer: GPUBuffer | null = null
  private neighborBuffer: GPUBuffer | null = null
  private vertexBuffer: GPUBuffer | null = null
  private normalBuffer: GPUBuffer | null = null
  private uvBuffer: GPUBuffer | null = null
  private indexBuffer: GPUBuffer | null = null
  private counterBuffer: GPUBuffer | null = null
  private uvLookupBuffer: GPUBuffer | null = null
  private counterReadbackBuffer: GPUBuffer | null = null

  // Max faces per chunk (worst case: every block has 6 faces)
  private readonly MAX_FACES = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT * 6
  private readonly CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT

  public isReady = false

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('[GPUMesh] WebGPU not supported')
      return false
    }

    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        console.warn('[GPUMesh] No GPU adapter found')
        return false
      }

      this.device = await adapter.requestDevice()

      // Create shader module
      const shaderModule = this.device.createShaderModule({
        code: meshComputeShader,
      })

      // Create bind group layout
      this.bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        ],
      })

      // Create pipeline
      this.pipeline = this.device.createComputePipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [this.bindGroupLayout],
        }),
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      })

      // Create buffers
      this.createBuffers()

      this.isReady = true
      console.log('[GPUMesh] Initialized successfully')
      return true
    } catch (error) {
      console.error('[GPUMesh] Initialization failed:', error)
      return false
    }
  }

  private createBuffers(): void {
    if (!this.device) return

    // Input buffers
    this.chunkBuffer = this.device.createBuffer({
      size: this.CHUNK_VOLUME * 4, // u32 per block
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    this.neighborBuffer = this.device.createBuffer({
      size: this.CHUNK_VOLUME * 4 * 4, // 4 neighbors
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Output buffers (sized for max possible faces)
    const maxVertices = this.MAX_FACES * 4

    this.vertexBuffer = this.device.createBuffer({
      size: maxVertices * 3 * 4, // 3 floats per vertex
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    this.normalBuffer = this.device.createBuffer({
      size: maxVertices * 3 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    this.uvBuffer = this.device.createBuffer({
      size: maxVertices * 2 * 4, // 2 floats per vertex
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    this.indexBuffer = this.device.createBuffer({
      size: this.MAX_FACES * 6 * 4, // 6 indices per face
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    this.counterBuffer = this.device.createBuffer({
      size: 4, // Single atomic u32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })

    // UV lookup table (256 block types * 6 faces * 4 floats)
    this.uvLookupBuffer = this.device.createBuffer({
      size: 256 * 6 * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Readback buffers
    this.counterReadbackBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
  }

  /**
   * Update UV lookup table from blockUVs
   */
  updateUVLookup(blockUVs: Record<string, number[]>): void {
    if (!this.device || !this.uvLookupBuffer) return

    const uvData = new Float32Array(256 * 6 * 4)

    // Face type mapping
    const faceTypes = ['top', 'bottom', 'side', 'side', 'side', 'side']

    for (let blockType = 0; blockType < 256; blockType++) {
      for (let face = 0; face < 6; face++) {
        const faceType = faceTypes[face]
        const key = `${blockType}:${faceType}`
        const uv = blockUVs[key]

        const offset = (blockType * 6 + face) * 4
        if (uv) {
          uvData[offset] = uv[0] // u0
          uvData[offset + 1] = uv[1] // v0
          uvData[offset + 2] = uv[2] // u1
          uvData[offset + 3] = uv[3] // v1
        } else {
          // Default UV (full tile)
          uvData[offset] = 0
          uvData[offset + 1] = 0
          uvData[offset + 2] = 0.0625
          uvData[offset + 3] = 0.0625
        }
      }
    }

    this.device.queue.writeBuffer(this.uvLookupBuffer, 0, uvData)
  }

  /**
   * Generate mesh for a chunk using GPU compute
   */
  async generateMesh(chunkData: Uint8Array, neighbors: ChunkNeighbors): Promise<GPUMeshResult | null> {
    if (!this.isReady || !this.device || !this.pipeline || !this.bindGroupLayout) {
      return null
    }

    // Convert chunk data to u32 array
    const chunkU32 = new Uint32Array(this.CHUNK_VOLUME)
    for (let i = 0; i < this.CHUNK_VOLUME; i++) {
      chunkU32[i] = chunkData[i]
    }

    // Pack neighbor data
    const neighborU32 = new Uint32Array(this.CHUNK_VOLUME * 4)
    const neighborArrays = [neighbors.nx, neighbors.px, neighbors.nz, neighbors.pz]
    for (let n = 0; n < 4; n++) {
      const neighbor = neighborArrays[n]
      const offset = n * this.CHUNK_VOLUME
      if (neighbor) {
        for (let i = 0; i < this.CHUNK_VOLUME; i++) {
          neighborU32[offset + i] = neighbor[i]
        }
      }
      // If no neighbor, leave as 0 (AIR)
    }

    // Upload data
    this.device.queue.writeBuffer(this.chunkBuffer!, 0, chunkU32)
    this.device.queue.writeBuffer(this.neighborBuffer!, 0, neighborU32)
    this.device.queue.writeBuffer(this.counterBuffer!, 0, new Uint32Array([0]))

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.chunkBuffer! } },
        { binding: 1, resource: { buffer: this.neighborBuffer! } },
        { binding: 2, resource: { buffer: this.vertexBuffer! } },
        { binding: 3, resource: { buffer: this.normalBuffer! } },
        { binding: 4, resource: { buffer: this.uvBuffer! } },
        { binding: 5, resource: { buffer: this.indexBuffer! } },
        { binding: 6, resource: { buffer: this.counterBuffer! } },
        { binding: 7, resource: { buffer: this.uvLookupBuffer! } },
      ],
    })

    // Dispatch compute
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(this.pipeline)
    passEncoder.setBindGroup(0, bindGroup)

    // Dispatch: 16x16 XZ, 4 workgroups for Y (256/64=4)
    passEncoder.dispatchWorkgroups(Math.ceil(CHUNK_SIZE / 8), Math.ceil(CHUNK_SIZE / 8), Math.ceil(CHUNK_HEIGHT / 64))
    passEncoder.end()

    // Copy counter for readback
    commandEncoder.copyBufferToBuffer(this.counterBuffer!, 0, this.counterReadbackBuffer!, 0, 4)

    this.device.queue.submit([commandEncoder.finish()])

    // Read face count
    const counterReadbackBuffer = this.counterReadbackBuffer
    if (!counterReadbackBuffer) throw new Error('GPU counter readback buffer is not initialized')

    await counterReadbackBuffer.mapAsync(GPUMapMode.READ)
    const counterData = new Uint32Array(counterReadbackBuffer.getMappedRange())
    const faceCount = counterData[0]
    counterReadbackBuffer.unmap()

    if (faceCount === 0) {
      return {
        vertices: new Float32Array(0),
        normals: new Float32Array(0),
        uvs: new Float32Array(0),
        indices: new Uint32Array(0),
        faceCount: 0,
      }
    }

    // Read back vertex data
    const vertexCount = faceCount * 4
    const indexCount = faceCount * 6

    // Create readback buffers for actual data
    const vertexReadback = this.device.createBuffer({
      size: vertexCount * 3 * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
    const normalReadback = this.device.createBuffer({
      size: vertexCount * 3 * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
    const uvReadback = this.device.createBuffer({
      size: vertexCount * 2 * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
    const indexReadback = this.device.createBuffer({
      size: indexCount * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })

    const copyEncoder = this.device.createCommandEncoder()
    copyEncoder.copyBufferToBuffer(this.vertexBuffer!, 0, vertexReadback, 0, vertexCount * 3 * 4)
    copyEncoder.copyBufferToBuffer(this.normalBuffer!, 0, normalReadback, 0, vertexCount * 3 * 4)
    copyEncoder.copyBufferToBuffer(this.uvBuffer!, 0, uvReadback, 0, vertexCount * 2 * 4)
    copyEncoder.copyBufferToBuffer(this.indexBuffer!, 0, indexReadback, 0, indexCount * 4)
    this.device.queue.submit([copyEncoder.finish()])

    // Map and read
    await Promise.all([vertexReadback.mapAsync(GPUMapMode.READ), normalReadback.mapAsync(GPUMapMode.READ), uvReadback.mapAsync(GPUMapMode.READ), indexReadback.mapAsync(GPUMapMode.READ)])

    const result: GPUMeshResult = {
      vertices: new Float32Array(vertexReadback.getMappedRange().slice(0)),
      normals: new Float32Array(normalReadback.getMappedRange().slice(0)),
      uvs: new Float32Array(uvReadback.getMappedRange().slice(0)),
      indices: new Uint32Array(indexReadback.getMappedRange().slice(0)),
      faceCount,
    }

    vertexReadback.unmap()
    normalReadback.unmap()
    uvReadback.unmap()
    indexReadback.unmap()

    // Cleanup temporary buffers
    vertexReadback.destroy()
    normalReadback.destroy()
    uvReadback.destroy()
    indexReadback.destroy()

    return result
  }

  destroy(): void {
    this.chunkBuffer?.destroy()
    this.neighborBuffer?.destroy()
    this.vertexBuffer?.destroy()
    this.normalBuffer?.destroy()
    this.uvBuffer?.destroy()
    this.indexBuffer?.destroy()
    this.counterBuffer?.destroy()
    this.uvLookupBuffer?.destroy()
    this.counterReadbackBuffer?.destroy()

    this.device = null
    this.pipeline = null
    this.isReady = false

    console.log('[GPUMesh] Destroyed')
  }
}
