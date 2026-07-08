import type { LodQuality } from '../../../constants'
import { CHUNK_SIZE, CHUNK_Y_SIZE, PLAYER_HEIGHT } from '../../../constants'

export type LodBaselineTargetKey = 'forest' | 'beachPalm' | 'snowTree'
export type LodBaselineAlias = 'forest' | 'beach' | 'palm' | 'beach-palm' | 'snow' | 'snow-tree'

export interface LodBaselineTarget {
  key: LodBaselineTargetKey
  label: string
  aliases: LodBaselineAlias[]
  position: { x: number; y: number; z: number }
  yaw: number
}

export interface LodBaselineSnapshot {
  targetLabel: string
  position: { x: number; y: number; z: number }
  chunk: { x: number; y: number; z: number }
  renderDistance: number
  cameraMode: string
  fps: number
  drawCalls: number
  triangles: number
  lodSettings: {
    enabled: boolean
    farDistance: number
    quality: LodQuality
    lodBudgetMs: number
  }
  lodSnapshot: string
}

export interface LodBaselineEngineState {
  player: {
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }
    velocity: { set: (x: number, y: number, z: number) => void }
    rotation: { x: number; y: number }
  }
  camera: {
    position: { copy: (position: { x: number; y: number; z: number }) => void; y: number }
    rotation: { order: string; x: number; y: number }
  }
  renderer: { info: { render: { calls: number; triangles: number } } }
  renderDistance: number
  cameraMode: string
  lodRuntime: {
    getSettings: () => LodBaselineSnapshot['lodSettings']
    logDebugSnapshot: () => string
  }
  lastChunkX: number
  lastChunkY: number
  lastChunkZ: number
  chunkUpdateTimer: number
}

export const LOD_BASELINE_TARGETS: Record<LodBaselineTargetKey, LodBaselineTarget> = {
  forest: {
    key: 'forest',
    label: 'Forest tree',
    aliases: ['forest'],
    position: { x: 3, y: 42, z: 8 },
    yaw: Math.PI * 0.75,
  },
  beachPalm: {
    key: 'beachPalm',
    label: 'Beach palm',
    aliases: ['beach', 'palm', 'beach-palm'],
    position: { x: -64, y: 29, z: -27 },
    yaw: Math.PI * 0.25,
  },
  snowTree: {
    key: 'snowTree',
    label: 'Snow tree',
    aliases: ['snow', 'snow-tree'],
    position: { x: -16, y: 32, z: 5 },
    yaw: Math.PI * 0.65,
  },
}

export function resolveLodBaselineTarget(value: string): LodBaselineTarget | null {
  const normalized = value.trim().toLowerCase()
  return Object.values(LOD_BASELINE_TARGETS).find((target) => target.aliases.includes(normalized as LodBaselineAlias)) ?? null
}

export function listLodBaselineTargets(): string {
  return Object.values(LOD_BASELINE_TARGETS)
    .map((target) => `${target.aliases[0]} (${target.label})`)
    .join(', ')
}

export function formatLodBaselineSnapshot(snapshot: LodBaselineSnapshot): string {
  const { position, chunk, lodSettings } = snapshot
  const settings = `lod=${lodSettings.enabled ? 'on' : 'off'}, ` + `farDistance=${lodSettings.farDistance}, ` + `quality=${lodSettings.quality}, ` + `budget=${lodSettings.lodBudgetMs}ms`

  return [
    `LOD baseline: ${snapshot.targetLabel}`,
    `position=(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`,
    `chunk=(${chunk.x}, ${chunk.y}, ${chunk.z})`,
    `renderDistance=${snapshot.renderDistance}`,
    `camera=${snapshot.cameraMode}`,
    `fps=${Math.round(snapshot.fps)}`,
    `drawCalls=${snapshot.drawCalls}`,
    `triangles=${snapshot.triangles}`,
    settings,
    snapshot.lodSnapshot,
  ].join(' | ')
}

export function moveEngineToLodBaseline(engine: LodBaselineEngineState, target: LodBaselineTarget): void {
  engine.player.position.set(target.position.x, target.position.y, target.position.z)
  engine.player.velocity.set(0, 0, 0)
  engine.player.rotation.x = 0
  engine.player.rotation.y = target.yaw
  engine.camera.position.copy(engine.player.position)
  engine.camera.position.y += PLAYER_HEIGHT * 0.9
  engine.camera.rotation.order = 'YXZ'
  engine.camera.rotation.x = 0
  engine.camera.rotation.y = target.yaw
  engine.lastChunkX = -999
  engine.lastChunkY = -999
  engine.lastChunkZ = -999
  engine.chunkUpdateTimer = 1
}

export function createLodBaselineSnapshotForEngine(engine: LodBaselineEngineState, targetLabel: string, fps: number): string {
  const player = engine.player.position
  const renderInfo = engine.renderer.info.render
  return formatLodBaselineSnapshot({
    targetLabel,
    position: { x: player.x, y: player.y, z: player.z },
    chunk: {
      x: Math.floor(player.x / CHUNK_SIZE),
      y: Math.floor(player.y / CHUNK_Y_SIZE),
      z: Math.floor(player.z / CHUNK_SIZE),
    },
    renderDistance: engine.renderDistance,
    cameraMode: engine.cameraMode,
    fps,
    drawCalls: renderInfo.calls,
    triangles: renderInfo.triangles,
    lodSettings: engine.lodRuntime.getSettings(),
    lodSnapshot: engine.lodRuntime.logDebugSnapshot(),
  })
}
