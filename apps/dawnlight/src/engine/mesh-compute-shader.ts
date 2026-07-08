/**
 * WGSL Compute Shader for GPU Mesh Generation
 * Generates vertex data directly on the GPU for maximum performance
 */

export const meshComputeShader = /* wgsl */ `
  // Block data input
  @group(0) @binding(0) var<storage, read> chunkData: array<u32>;
  @group(0) @binding(1) var<storage, read> neighborData: array<u32>; // 4 neighbors packed
  
  // Output buffers
  @group(0) @binding(2) var<storage, read_write> vertices: array<f32>;
  @group(0) @binding(3) var<storage, read_write> normals: array<f32>;
  @group(0) @binding(4) var<storage, read_write> uvs: array<f32>;
  @group(0) @binding(5) var<storage, read_write> indices: array<u32>;
  @group(0) @binding(6) var<storage, read_write> atomicCounter: atomic<u32>;
  
  // UV lookup table
  @group(0) @binding(7) var<storage, read> uvLookup: array<f32>; // blockType * 6 faces * 4 floats
  
  // Constants
  const CHUNK_SIZE: u32 = 16u;
  const CHUNK_HEIGHT: u32 = 256u;
  const CHUNK_VOLUME: u32 = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;
  
  // Block types
  const AIR: u32 = 0u;
  const WATER: u32 = 8u;
  const GLASS: u32 = 9u;
  
  // Face normals
  const FACE_NORMALS: array<vec3<f32>, 6> = array<vec3<f32>, 6>(
    vec3<f32>(0.0, 1.0, 0.0),   // Top
    vec3<f32>(0.0, -1.0, 0.0),  // Bottom
    vec3<f32>(0.0, 0.0, 1.0),   // Front
    vec3<f32>(0.0, 0.0, -1.0),  // Back
    vec3<f32>(1.0, 0.0, 0.0),   // Right
    vec3<f32>(-1.0, 0.0, 0.0),  // Left
  );
  
  // Face vertex offsets (4 vertices per face)
  const FACE_VERTICES: array<array<vec3<f32>, 4>, 6> = array<array<vec3<f32>, 4>, 6>(
    // Top (Y+)
    array<vec3<f32>, 4>(
      vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(1.0, 1.0, 0.0),
      vec3<f32>(1.0, 1.0, 1.0), vec3<f32>(0.0, 1.0, 1.0)
    ),
    // Bottom (Y-)
    array<vec3<f32>, 4>(
      vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(1.0, 0.0, 1.0),
      vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 0.0, 0.0)
    ),
    // Front (Z+)
    array<vec3<f32>, 4>(
      vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 1.0),
      vec3<f32>(1.0, 1.0, 1.0), vec3<f32>(1.0, 0.0, 1.0)
    ),
    // Back (Z-)
    array<vec3<f32>, 4>(
      vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 0.0),
      vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 0.0)
    ),
    // Right (X+)
    array<vec3<f32>, 4>(
      vec3<f32>(1.0, 0.0, 1.0), vec3<f32>(1.0, 1.0, 1.0),
      vec3<f32>(1.0, 1.0, 0.0), vec3<f32>(1.0, 0.0, 0.0)
    ),
    // Left (X-)
    array<vec3<f32>, 4>(
      vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0),
      vec3<f32>(0.0, 1.0, 1.0), vec3<f32>(0.0, 0.0, 1.0)
    ),
  );
  
  fn getBlockIndex(x: u32, y: u32, z: u32) -> u32 {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }
  
  fn getBlock(x: i32, y: i32, z: i32) -> u32 {
    // Out of Y bounds
    if (y < 0 || y >= i32(CHUNK_HEIGHT)) {
      return AIR;
    }
    
    // Within chunk bounds
    if (x >= 0 && x < i32(CHUNK_SIZE) && z >= 0 && z < i32(CHUNK_SIZE)) {
      return chunkData[getBlockIndex(u32(x), u32(y), u32(z))];
    }
    
    // Check neighbors
    var neighborIdx: u32 = 0u;
    var localX: u32 = u32(x);
    var localZ: u32 = u32(z);
    
    if (x < 0) {
      neighborIdx = 0u; // -X neighbor
      localX = u32(i32(CHUNK_SIZE) + x);
    } else if (x >= i32(CHUNK_SIZE)) {
      neighborIdx = 1u; // +X neighbor
      localX = u32(x - i32(CHUNK_SIZE));
    } else if (z < 0) {
      neighborIdx = 2u; // -Z neighbor
      localZ = u32(i32(CHUNK_SIZE) + z);
    } else if (z >= i32(CHUNK_SIZE)) {
      neighborIdx = 3u; // +Z neighbor
      localZ = u32(z - i32(CHUNK_SIZE));
    }
    
    let neighborOffset = neighborIdx * CHUNK_VOLUME;
    return neighborData[neighborOffset + getBlockIndex(localX, u32(y), localZ)];
  }
  
  fn isTransparent(block: u32) -> bool {
    return block == AIR || block == WATER || block == GLASS;
  }
  
  fn shouldRenderFace(block: u32, neighbor: u32) -> bool {
    if (neighbor == AIR) { return true; }
    if (block == neighbor) { return false; }
    if (isTransparent(neighbor) && !isTransparent(block)) { return true; }
    return false;
  }
  
  @compute @workgroup_size(8, 8, 4)
  fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.z * 64u + global_id.y; // Spread Y across workgroups
    let z = global_id.y;
    
    // Bounds check
    if (x >= CHUNK_SIZE || y >= CHUNK_HEIGHT || z >= CHUNK_SIZE) {
      return;
    }
    
    let block = chunkData[getBlockIndex(x, y, z)];
    
    // Skip air and transparent blocks for solid mesh
    if (block == AIR || isTransparent(block)) {
      return;
    }
    
    let worldX = f32(x);
    let worldY = f32(y);
    let worldZ = f32(z);
    
    // Check each face
    let neighbors = array<vec3<i32>, 6>(
      vec3<i32>(0, 1, 0),   // Top
      vec3<i32>(0, -1, 0),  // Bottom
      vec3<i32>(0, 0, 1),   // Front
      vec3<i32>(0, 0, -1),  // Back
      vec3<i32>(1, 0, 0),   // Right
      vec3<i32>(-1, 0, 0),  // Left
    );
    
    for (var face = 0u; face < 6u; face++) {
      let offset = neighbors[face];
      let neighborBlock = getBlock(i32(x) + offset.x, i32(y) + offset.y, i32(z) + offset.z);
      
      if (!shouldRenderFace(block, neighborBlock)) {
        continue;
      }
      
      // Allocate space for this face (4 vertices, 6 indices)
      let faceIndex = atomicAdd(&atomicCounter, 1u);
      let vertexBase = faceIndex * 4u;
      let indexBase = faceIndex * 6u;
      
      // Get UV coordinates for this block/face
      let uvBase = (block * 6u + face) * 4u;
      let u0 = uvLookup[uvBase];
      let v0 = uvLookup[uvBase + 1u];
      let u1 = uvLookup[uvBase + 2u];
      let v1 = uvLookup[uvBase + 3u];
      
      // Write vertices
      for (var v = 0u; v < 4u; v++) {
        let vertOffset = FACE_VERTICES[face][v];
        let vIdx = (vertexBase + v) * 3u;
        
        vertices[vIdx] = worldX + vertOffset.x;
        vertices[vIdx + 1u] = worldY + vertOffset.y;
        vertices[vIdx + 2u] = worldZ + vertOffset.z;
        
        normals[vIdx] = FACE_NORMALS[face].x;
        normals[vIdx + 1u] = FACE_NORMALS[face].y;
        normals[vIdx + 2u] = FACE_NORMALS[face].z;
      }
      
      // Write UVs
      let uvIdx = vertexBase * 2u;
      uvs[uvIdx] = u0; uvs[uvIdx + 1u] = v1;
      uvs[uvIdx + 2u] = u0; uvs[uvIdx + 3u] = v0;
      uvs[uvIdx + 4u] = u1; uvs[uvIdx + 5u] = v0;
      uvs[uvIdx + 6u] = u1; uvs[uvIdx + 7u] = v1;
      
      // Write indices (two triangles)
      indices[indexBase] = vertexBase;
      indices[indexBase + 1u] = vertexBase + 1u;
      indices[indexBase + 2u] = vertexBase + 2u;
      indices[indexBase + 3u] = vertexBase;
      indices[indexBase + 4u] = vertexBase + 2u;
      indices[indexBase + 5u] = vertexBase + 3u;
    }
  }
`
