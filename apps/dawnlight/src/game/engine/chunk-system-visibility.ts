import type { Mesh, PerspectiveCamera, Vector3 } from 'three'
import { CHUNK_SIZE, CHUNK_Y_SIZE } from '../../constants'
import type { ChunkMeshData } from '../../types'
import { AGGRESSIVE_DISTANCE_THRESHOLD, AGGRESSIVE_FOLIAGE_HIDE_RATIO, AGGRESSIVE_FOLIAGE_SHOW_RATIO, AGGRESSIVE_TRANSPARENT_HIDE_RATIO, AGGRESSIVE_TRANSPARENT_SHOW_RATIO, FOLIAGE_HIDE_RATIO, FOLIAGE_SHOW_RATIO, TRANSPARENT_HIDE_RATIO, TRANSPARENT_SHOW_RATIO } from './chunk-system-config'
import type { GameEngine } from './game-engine'

function getDistanceThresholdSq(renderDistance: number, ratio: number): number {
  const dist = Math.max(CHUNK_SIZE * 2, renderDistance * CHUNK_SIZE * ratio)
  return dist * dist
}

function getCurrentLodRatios(renderDistance: number): {
  foliageShow: number
  foliageHide: number
  transparentShow: number
  transparentHide: number
} {
  if (renderDistance >= AGGRESSIVE_DISTANCE_THRESHOLD) {
    return {
      foliageShow: AGGRESSIVE_FOLIAGE_SHOW_RATIO,
      foliageHide: AGGRESSIVE_FOLIAGE_HIDE_RATIO,
      transparentShow: AGGRESSIVE_TRANSPARENT_SHOW_RATIO,
      transparentHide: AGGRESSIVE_TRANSPARENT_HIDE_RATIO,
    }
  }

  return {
    foliageShow: FOLIAGE_SHOW_RATIO,
    foliageHide: FOLIAGE_HIDE_RATIO,
    transparentShow: TRANSPARENT_SHOW_RATIO,
    transparentHide: TRANSPARENT_HIDE_RATIO,
  }
}

function getLodVisibility(mesh: Mesh | undefined, distSqXZ: number, showSq: number, hideSq: number): boolean {
  if (!mesh) return false
  const prev = mesh.userData.lodVisible ?? true
  const next = prev ? distSqXZ <= hideSq : distSqXZ <= showSq
  mesh.userData.lodVisible = next
  return next
}

export function applyChunkVisibility(engine: GameEngine, tempClipPos: Vector3, meshData: ChunkMeshData, cx: number, cy: number, cz: number, camera: PerspectiveCamera): void {
  const chunkCenterX = cx * CHUNK_SIZE + CHUNK_SIZE / 2
  const chunkCenterY = cy * CHUNK_Y_SIZE + CHUNK_Y_SIZE / 2
  const chunkCenterZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2

  const toChunkX = chunkCenterX - camera.position.x
  const toChunkY = chunkCenterY - camera.position.y
  const toChunkZ = chunkCenterZ - camera.position.z
  const distSq = toChunkX * toChunkX + toChunkY * toChunkY + toChunkZ * toChunkZ
  const distSqXZ = toChunkX * toChunkX + toChunkZ * toChunkZ
  const nearAlwaysVisible = distSq < CHUNK_SIZE * 2 * (CHUNK_SIZE * 2)
  const frustumPadding = 0.45
  tempClipPos.set(chunkCenterX, chunkCenterY, chunkCenterZ).project(camera)
  const inFrustum = tempClipPos.z >= -1.15 && tempClipPos.z <= 1.15 && tempClipPos.x >= -1 - frustumPadding && tempClipPos.x <= 1 + frustumPadding && tempClipPos.y >= -1 - frustumPadding && tempClipPos.y <= 1 + frustumPadding
  const visible = nearAlwaysVisible || inFrustum
  const chunkDistanceFromCamera = Math.hypot(toChunkX, toChunkZ) / CHUNK_SIZE
  const suppressStartDistance = Math.max(0, engine.renderDistance - 1.25)
  const suppressedSolidByFarLod = chunkDistanceFromCamera >= suppressStartDistance && engine.lodRuntime.isChunkCoveredByFarLod(cx, cz)

  const ratios = getCurrentLodRatios(engine.renderDistance)
  const foliageShowSq = getDistanceThresholdSq(engine.renderDistance, ratios.foliageShow)
  const foliageHideSq = getDistanceThresholdSq(engine.renderDistance, ratios.foliageHide)
  const transparentShowSq = getDistanceThresholdSq(engine.renderDistance, ratios.transparentShow)
  const transparentHideSq = getDistanceThresholdSq(engine.renderDistance, ratios.transparentHide)

  if (meshData.solid) meshData.solid.visible = visible && !suppressedSolidByFarLod
  if (meshData.transparent) {
    const lodVisible = getLodVisibility(meshData.transparent, distSqXZ, transparentShowSq, transparentHideSq)
    meshData.transparent.visible = visible && lodVisible
  }
  if (meshData.foliage) {
    const inMeshReductionZone = distSqXZ > foliageShowSq
    meshData.foliage.userData.windEnabled = !inMeshReductionZone
    const lodVisible = getLodVisibility(meshData.foliage, distSqXZ, foliageShowSq, foliageHideSq)
    meshData.foliage.visible = visible && (lodVisible || inMeshReductionZone)
  }
  if (meshData.fluid) meshData.fluid.visible = visible && !suppressedSolidByFarLod
}
