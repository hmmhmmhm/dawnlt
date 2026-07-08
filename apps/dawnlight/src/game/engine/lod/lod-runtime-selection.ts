export interface LodLeafPosition {
  x: number
  z: number
}

export interface ChunkXZ {
  cx: number
  cz: number
}

export function collectFarLeafPositions(leaves: Iterable<ChunkXZ>, currentChunkX: number, currentChunkZ: number, renderDistance: number): LodLeafPosition[] {
  const uniqueLeaves = new Set<string>()
  for (const leaf of leaves) {
    if (Math.max(Math.abs(leaf.cx - currentChunkX), Math.abs(leaf.cz - currentChunkZ)) <= renderDistance) continue
    uniqueLeaves.add(`${leaf.cx},${leaf.cz}`)
  }
  return [...uniqueLeaves].map((value) => {
    const [x, z] = value.split(',').map(Number)
    return { x, z }
  })
}

export function isSectionOutsideRenderDistance(x: number, z: number, level: number, currentChunkX: number, currentChunkZ: number, renderDistance: number): boolean {
  const scale = 1 << Math.max(0, level)
  const minX = x * scale
  const minZ = z * scale
  const maxX = minX + scale - 1
  const maxZ = minZ + scale - 1
  const fullyInsideX = minX >= currentChunkX - renderDistance && maxX <= currentChunkX + renderDistance
  const fullyInsideZ = minZ >= currentChunkZ - renderDistance && maxZ <= currentChunkZ + renderDistance
  return !(fullyInsideX && fullyInsideZ)
}
