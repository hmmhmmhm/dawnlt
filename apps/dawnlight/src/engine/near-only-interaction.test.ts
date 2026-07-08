import { PerspectiveCamera, Vector3 } from 'three'
import { CHUNK_HEIGHT, CHUNK_SIZE, CHUNK_Y_SIZE } from '../constants'
import { BlockType } from '../types'
import { createCollisionChecker } from './collision'
import { raycast } from './raycast'
import { getChunkKey, getChunkKey3D } from './world'

declare const describe: any
declare const test: any
declare const expect: any

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function createChunk(fill: BlockType = BlockType.AIR): Uint8Array {
  return new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_Y_SIZE).fill(fill)
}

function getBlockIndex2D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT
}

function createChunk2D(fill: BlockType = BlockType.AIR): Uint8Array {
  return new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT).fill(fill)
}

function setWorldBlock2D(chunks: Map<string, Uint8Array>, worldX: number, worldY: number, worldZ: number, block: BlockType): void {
  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const key = getChunkKey(cx, cz)
  const chunk = chunks.get(key) ?? createChunk2D()
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  chunk[getBlockIndex2D(localX, worldY, localZ)] = block
  chunks.set(key, chunk)
}

function setWorldBlock(chunks3D: Map<string, Uint8Array>, worldX: number, worldY: number, worldZ: number, block: BlockType): void {
  const cx = Math.floor(worldX / CHUNK_SIZE)
  const cy = Math.floor(worldY / CHUNK_Y_SIZE)
  const cz = Math.floor(worldZ / CHUNK_SIZE)
  const key = getChunkKey3D(cx, cy, cz)

  const chunk = chunks3D.get(key) ?? createChunk()
  const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const localY = ((worldY % CHUNK_Y_SIZE) + CHUNK_Y_SIZE) % CHUNK_Y_SIZE
  const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  chunk[getBlockIndex3D(localX, localY, localZ)] = block
  chunks3D.set(key, chunk)
}

describe('near-only interaction guards', () => {
  test('raycast uses near chunks3D data to hit blocks', () => {
    const chunks3D = new Map<string, Uint8Array>()
    setWorldBlock(chunks3D, 0, 2, -1, BlockType.STONE)

    const camera = new PerspectiveCamera(75, 1, 0.1, 100)
    camera.position.set(0.5, 2.5, 0.5)

    const hit = raycast(camera, { x: 0, y: 0 }, new Map(), 5, chunks3D)

    expect(hit).not.toBeNull()
    expect(hit?.block.x).toBe(0)
    expect(hit?.block.y).toBe(2)
    expect(hit?.block.z).toBe(-1)
    expect(hit?.block.type).toBe(BlockType.STONE)
  })

  test('collision checks floor against near chunks3D data', () => {
    const chunks3D = new Map<string, Uint8Array>()
    setWorldBlock(chunks3D, 0, 0, 0, BlockType.STONE)
    const collision = createCollisionChecker(new Map(), chunks3D)

    const result = collision.checkCollision(new Vector3(0.5, 1, 0.5))
    expect(result.floor).toBe(true)
    expect(result.y).toBe(true)
  })

  test('when chunks3D is present, raycast ignores legacy 2D chunk hits', () => {
    const chunks = new Map<string, Uint8Array>()
    const chunks3D = new Map<string, Uint8Array>()
    setWorldBlock2D(chunks, 0, 2, -1, BlockType.STONE)
    chunks3D.set(getChunkKey3D(0, 0, 0), createChunk())

    const camera = new PerspectiveCamera(75, 1, 0.1, 100)
    camera.position.set(0.5, 2.5, 0.5)

    const hit = raycast(camera, { x: 0, y: 0 }, chunks, 5, chunks3D)
    expect(hit).toBeNull()
  })
})
