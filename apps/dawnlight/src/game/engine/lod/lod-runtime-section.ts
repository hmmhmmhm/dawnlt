import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_SIZE } from '../../../constants'
import { BlockType } from '../../../shared/block-types'

export function createChunkSectionFromColumn(column: Uint8Array, cy: number): Uint8Array {
  const section = new Uint8Array(CHUNK_SIZE * CHUNK_Y_SIZE * CHUNK_SIZE)
  const startY = cy * CHUNK_Y_SIZE
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let localY = 0; localY < CHUNK_Y_SIZE; localY++) {
        const worldY = startY + localY
        const sectionIndex = x + localY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
        section[sectionIndex] = worldY >= CHUNK_HEIGHT ? BlockType.AIR : column[x + worldY * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT]
      }
    }
  }
  return section
}
