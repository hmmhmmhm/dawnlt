import { BufferAttribute, BufferGeometry } from 'three'
import type { LodSectionRenderData, LodWaterLevel } from './lod-data-types'

const FAR_WATER_Y_BIAS = 0.02

function pickRenderableWaterLevel(data: LodSectionRenderData): LodWaterLevel | null {
  if (!data.waterLevels || data.waterLevels.length === 0) return null
  const preferredIndex = Math.min(data.waterLevels.length - 1, Math.max(0, data.level - 1))
  return data.waterLevels[preferredIndex]
}

function writeTopQuad(positions: number[], indices: number[], x0: number, x1: number, z0: number, z1: number, y: number): void {
  const base = positions.length / 3
  positions.push(x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1)
  indices.push(base + 0, base + 2, base + 3, base + 0, base + 3, base + 1)
}

export function buildSectionWaterGeometry(data: LodSectionRenderData): BufferGeometry | null {
  const level = pickRenderableWaterLevel(data)
  if (!level) return null

  const positions: number[] = []
  const indices: number[] = []

  for (let z = 0; z < level.size; z++) {
    for (let x = 0; x < level.size; x++) {
      const idx = x + z * level.size
      const waterY = level.surfaceHeights[idx]
      if (waterY < 0) continue
      const x0 = data.worldStartX + x * level.scale
      const z0 = data.worldStartZ + z * level.scale
      const x1 = x0 + level.scale
      const z1 = z0 + level.scale
      writeTopQuad(positions, indices, x0, x1, z0, z1, waterY + 1 + FAR_WATER_Y_BIAS)
    }
  }

  if (positions.length === 0 || indices.length === 0) return null

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
