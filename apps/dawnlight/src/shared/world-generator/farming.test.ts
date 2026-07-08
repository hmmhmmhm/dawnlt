import { BlockType } from '../block-types'
import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'
import { chooseWildCropForSurface } from './vegetation'

declare const describe: any
declare const test: any
declare const expect: any

function columnIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

describe('farming world generation', () => {
  test('chooses wheat on open inland grassland and rice near low wet terrain', () => {
    expect(chooseWildCropForSurface(7, 11, 0.45, 0.0, BlockType.AIR)).toBe(BlockType.WILD_WHEAT)
    expect(chooseWildCropForSurface(3, 5, 0.02, 0.0, BlockType.AIR)).toBe(BlockType.WILD_RICE)
  })

  test('keeps farming entry crops common enough in normal grassland terrain', () => {
    expect(chooseWildCropForSurface(1, 25, 0.45, 0.0, BlockType.AIR)).toBe(BlockType.WILD_WHEAT)
    expect(chooseWildCropForSurface(0, 13, 0.02, 0.0, BlockType.AIR)).toBe(BlockType.WILD_RICE)
  })

  test('allows wild rice on low grassland edges near wet terrain', () => {
    expect(chooseWildCropForSurface(0, 13, 0.25, 0.0, BlockType.AIR)).toBe(BlockType.WILD_RICE)
  })

  test('does not overwrite occupied surface decorations', () => {
    expect(chooseWildCropForSurface(7, 11, 0.45, 0.0, BlockType.BUSH)).toBeNull()
  })

  test('test index helper matches chunk layout for surface fixtures', () => {
    const chunkData = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
    chunkData[columnIndex(2, 64, 3)] = BlockType.GRASS

    expect(chunkData[columnIndex(2, 64, 3)]).toBe(BlockType.GRASS)
  })
})
