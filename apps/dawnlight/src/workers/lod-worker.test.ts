import { BlockColors } from '../constants'
import type { LodSectionBuildInput } from '../game/engine/lod/lod-data-types'
import { BlockType } from '../shared/block-types'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../shared/constants'
import { buildLodSectionData } from './lod-worker'

declare const describe: any
declare const test: any
declare const expect: any

function getChunkKey3D(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`
}

function getBlockIndex3D(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_Y_SIZE
}

function createChunk(fill: BlockType = BlockType.AIR): Uint8Array {
  return new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_Y_SIZE).fill(fill)
}

function setColumn(chunk: Uint8Array, x: number, z: number, topY: number, block: BlockType): void {
  for (let y = 0; y <= topY; y++) {
    chunk[getBlockIndex3D(x, y, z)] = block
  }
}

function createInput(chunksByKey: Record<string, Uint8Array>): LodSectionBuildInput {
  return {
    sectionKey: '0:0,0',
    sectionX: 0,
    sectionZ: 0,
    level: 0,
    chunksByKey,
    minCy: 0,
    maxCy: 0,
  }
}

describe('lod-worker stage-3 pipeline', () => {
  test('build is deterministic for same input', () => {
    const chunk = createChunk()
    setColumn(chunk, 2, 3, 6, BlockType.DIRT)
    setColumn(chunk, 5, 8, 12, BlockType.STONE)

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const first = buildLodSectionData(input)
    const second = buildLodSectionData(input)

    expect(Array.from(first.levels[0].heights)).toEqual(Array.from(second.levels[0].heights))
    expect(Array.from(first.levels[0].materials)).toEqual(Array.from(second.levels[0].materials))
    expect(Array.from(first.levels[0].colors)).toEqual(Array.from(second.levels[0].colors))
  })

  test('creates mipmap pyramid with 2x2 merges', () => {
    const chunk = createChunk()
    setColumn(chunk, 0, 0, 3, BlockType.DIRT)
    setColumn(chunk, 1, 0, 10, BlockType.STONE)

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)

    expect(data.levels.map((level) => level.size)).toEqual([16, 8, 4, 2, 1])
    expect(data.levels[1].heights[0]).toBe(10)
    expect(data.levels[1].materials[0]).toBe(BlockType.STONE)
  })

  test('uses majority material and blends color in merged cell', () => {
    const chunk = createChunk()
    setColumn(chunk, 0, 0, 5, BlockType.DIRT)
    setColumn(chunk, 1, 0, 6, BlockType.DIRT)
    setColumn(chunk, 0, 1, 4, BlockType.DIRT)
    setColumn(chunk, 1, 1, 20, BlockType.STONE)

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const mergedMaterial = data.levels[1].materials[0]
    const mergedColor = data.levels[1].colors[0]

    expect(mergedMaterial).toBe(BlockType.DIRT)
    expect(mergedColor).not.toBe(BlockColors[BlockType.DIRT].all)
    expect(mergedColor).not.toBe(BlockColors[BlockType.STONE].all)
  })

  test('respects minCy when sampling vertical range', () => {
    const lowChunk = createChunk()
    const highChunk = createChunk()
    setColumn(lowChunk, 2, 2, 10, BlockType.STONE)
    setColumn(highChunk, 2, 2, 3, BlockType.DIRT)

    const input: LodSectionBuildInput = {
      ...createInput({
        [getChunkKey3D(0, 0, 0)]: lowChunk,
        [getChunkKey3D(0, 1, 0)]: highChunk,
      }),
      minCy: 1,
      maxCy: 1,
    }
    const data = buildLodSectionData(input)
    const index = 2 + 2 * CHUNK_SIZE

    expect(data.levels[0].materials[index]).toBe(BlockType.DIRT)
    expect(data.levels[0].heights[index]).toBe(CHUNK_Y_SIZE + 3)
  })

  test('blends edge height with neighbor sample when available', () => {
    const chunk = createChunk()
    setColumn(chunk, 0, 0, 10, BlockType.STONE)

    const northNeighbor = createChunk()
    setColumn(northNeighbor, 0, CHUNK_SIZE - 1, 30, BlockType.STONE)

    const input = createInput({
      [getChunkKey3D(0, 0, 0)]: chunk,
      [getChunkKey3D(0, 0, -1)]: northNeighbor,
    })
    const data = buildLodSectionData(input)

    expect(data.edgeHeights.north[0]).toBe(20)
  })

  test('excludes tree canopy blocks from terrain LOD surface samples', () => {
    const chunk = createChunk()
    const groundY = 4
    const trunkTopY = 9
    const leafTopY = 12
    const x = 7
    const z = 7
    setColumn(chunk, x, z, groundY, BlockType.DIRT)
    for (let y = groundY + 1; y <= trunkTopY; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.WOOD
    }
    for (let y = trunkTopY + 1; y <= leafTopY; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.LEAVES
    }

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const index = x + z * CHUNK_SIZE

    expect(data.levels[0].heights[index]).toBe(groundY)
    expect(data.levels[0].materials[index]).toBe(BlockType.DIRT)
    const voxels = data.treeData?.voxels ?? []
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === trunkTopY && voxel.z === z && voxel.block === BlockType.WOOD)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === leafTopY && voxel.z === z && voxel.block === BlockType.LEAVES)).toBe(true)
  })

  test('keeps floating canopy out of occupancy merge when tree LOD is split', () => {
    const chunk = createChunk()
    chunk[getBlockIndex3D(0, 10, 0)] = BlockType.LEAVES
    chunk[getBlockIndex3D(0, 11, 0)] = BlockType.LEAVES
    chunk[getBlockIndex3D(0, 12, 0)] = BlockType.LEAVES
    setColumn(chunk, 1, 0, 2, BlockType.DIRT)
    setColumn(chunk, 0, 1, 2, BlockType.DIRT)
    setColumn(chunk, 1, 1, 2, BlockType.DIRT)

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const merged = data.occupancyLevels?.[1]
    expect(merged).toBeDefined()
    if (!merged) return

    expect(merged.topHeights[0]).toBe(2)
    expect(merged.bottomHeights[0]).toBe(0)
    expect(merged.materials[0]).toBe(BlockType.DIRT)
  })

  test('terrain LOD does not follow canopy height even when trunk connects upward', () => {
    const chunk = createChunk()
    const x = 5
    const z = 5
    for (let y = 0; y <= 9; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.WOOD
    }
    for (let y = 10; y <= 13; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.LEAVES
    }

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const index = x + z * CHUNK_SIZE
    expect(data.levels[0].heights[index]).toBe(-1)
    expect(data.levels[0].materials[index]).toBe(BlockType.AIR)
    const voxels = data.treeData?.voxels ?? []
    expect(voxels.some((voxel) => voxel.x === x && voxel.z === z && voxel.block === BlockType.WOOD)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x && voxel.z === z && voxel.block === BlockType.LEAVES)).toBe(true)
  })

  test('extracts exact tree voxels from chunk data', () => {
    const chunk = createChunk()
    const x = 6
    const z = 6
    for (let y = 0; y <= 4; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.WOOD
    }
    chunk[getBlockIndex3D(x, 5, z)] = BlockType.LEAVES
    chunk[getBlockIndex3D(x + 1, 5, z)] = BlockType.LEAVES
    chunk[getBlockIndex3D(x, 5, z + 1)] = BlockType.LEAVES

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const voxels = data.treeData?.voxels ?? []
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === 0 && voxel.z === z && voxel.block === BlockType.WOOD)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === 4 && voxel.z === z && voxel.block === BlockType.WOOD)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === 5 && voxel.z === z && voxel.block === BlockType.LEAVES)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x + 1 && voxel.y === 5 && voxel.z === z && voxel.block === BlockType.LEAVES)).toBe(true)
  })

  test('builds water surface levels for far static water rendering', () => {
    const chunk = createChunk()
    const waterY = 6
    chunk[getBlockIndex3D(3, waterY, 4)] = BlockType.WATER
    chunk[getBlockIndex3D(4, waterY, 4)] = BlockType.WATER
    chunk[getBlockIndex3D(3, waterY, 5)] = BlockType.WATER
    chunk[getBlockIndex3D(4, waterY, 5)] = BlockType.WATER

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const level0 = data.waterLevels?.[0]
    const level1 = data.waterLevels?.[1]
    expect(level0).toBeDefined()
    expect(level1).toBeDefined()
    if (!level0 || !level1) return

    const idx = 3 + 4 * CHUNK_SIZE
    expect(level0.surfaceHeights[idx]).toBe(waterY)

    const mergedIdx = Math.floor(3 / 2) + Math.floor(4 / 2) * level1.size
    expect(level1.surfaceHeights[mergedIdx]).toBe(waterY)
  })

  test('keeps palm block types in tree voxel data', () => {
    const chunk = createChunk()
    const x = 9
    const z = 4
    for (let y = 0; y <= 5; y++) {
      chunk[getBlockIndex3D(x, y, z)] = BlockType.PALM_WOOD
    }
    chunk[getBlockIndex3D(x, 6, z)] = BlockType.PALM_LEAVES
    chunk[getBlockIndex3D(x + 1, 6, z)] = BlockType.PALM_LEAVES

    const input = createInput({ [getChunkKey3D(0, 0, 0)]: chunk })
    const data = buildLodSectionData(input)
    const voxels = data.treeData?.voxels ?? []
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === 5 && voxel.z === z && voxel.block === BlockType.PALM_WOOD)).toBe(true)
    expect(voxels.some((voxel) => voxel.x === x && voxel.y === 6 && voxel.z === z && voxel.block === BlockType.PALM_LEAVES)).toBe(true)
  })

  test('keeps tree voxels on adjacent LOD section boundaries exclusive', () => {
    const leftChunk = createChunk()
    const rightChunk = createChunk()
    leftChunk[getBlockIndex3D(CHUNK_SIZE - 1, 7, 4)] = BlockType.WOOD
    rightChunk[getBlockIndex3D(0, 8, 4)] = BlockType.LEAVES

    const chunksByKey = {
      [getChunkKey3D(0, 0, 0)]: leftChunk,
      [getChunkKey3D(1, 0, 0)]: rightChunk,
    }
    const leftData = buildLodSectionData(createInput(chunksByKey))
    const rightData = buildLodSectionData({
      ...createInput(chunksByKey),
      sectionKey: '0:1,0',
      sectionX: 1,
    })

    const leftVoxels = leftData.treeData?.voxels ?? []
    const rightVoxels = rightData.treeData?.voxels ?? []
    expect(leftVoxels).toEqual([{ x: CHUNK_SIZE - 1, y: 7, z: 4, block: BlockType.WOOD }])
    expect(rightVoxels).toEqual([{ x: CHUNK_SIZE, y: 8, z: 4, block: BlockType.LEAVES }])
  })
})
