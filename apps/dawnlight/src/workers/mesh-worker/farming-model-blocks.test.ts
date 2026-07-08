import { BlockType } from '../../shared/block-types'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../shared/constants'
import { buildMeshData3D } from './builder-3d'
import { getBlockIndex3D } from './utils'

declare const describe: any
declare const test: any
declare const expect: any

function createChunkWithBlock(type: BlockType): Uint8Array {
  const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
  chunk[getBlockIndex3D(4, 3, 4)] = type
  return chunk
}

describe('farming model blocks in mesh worker', () => {
  test('omits crop blocks from chunk geometry so Meshy GLB systems own their visual shape', () => {
    for (const block of [BlockType.WILD_WHEAT, BlockType.WILD_RICE, BlockType.WHEAT_CROP_1, BlockType.WHEAT_CROP_2, BlockType.WHEAT_CROP_3, BlockType.WHEAT_CROP_4, BlockType.RICE_CROP_1, BlockType.RICE_CROP_2, BlockType.RICE_CROP_3, BlockType.RICE_CROP_4]) {
      const meshData = buildMeshData3D(0, 0, 0, createChunkWithBlock(block), {})

      expect(meshData.solid).toBeNull()
      expect(meshData.transparent).toBeNull()
      expect(meshData.foliage).toBeNull()
      expect(meshData.fluid).toBeNull()
    }
  })

  test('still renders farmland as normal square block geometry', () => {
    const meshData = buildMeshData3D(0, 0, 0, createChunkWithBlock(BlockType.FARMLAND_WET), {})

    expect(meshData.solid).not.toBeNull()
    expect(meshData.foliage).toBeNull()
  })
})
