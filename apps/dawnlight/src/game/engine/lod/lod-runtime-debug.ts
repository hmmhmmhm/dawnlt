import type { LodQuality } from '../../../constants'

interface ParsedSectionKey {
  level: number
  x: number
  z: number
}

export interface LodRuntimeSettings {
  enabled: boolean
  farDistance: number
  quality: LodQuality
  lodBudgetMs: number
}

export interface LodRuntimeDebugSnapshot {
  timestamp: string
  player: { chunkX: number; chunkZ: number }
  settings: LodRuntimeSettings
  debugColorEnabled: boolean
  activeSectionCount: number
  activeSectionSample: string[]
  queueSize: number
  processingCount: number
  droppedCount: number
  lastUpdateMs: number
  farRenderer: {
    meshCount: number
    vertexCount: number
    triangleCount: number
  }
}

export interface LodRuntimeDebugSnapshotArgs {
  playerChunkX: number
  playerChunkZ: number
  settings: LodRuntimeSettings
  debugColorEnabled: boolean
  activeSectionCount: number
  activeSectionSample: string[]
  queueSize: number
  processingCount: number
  droppedCount: number
  lastUpdateMs: number
  farRenderer: LodRuntimeDebugSnapshot['farRenderer']
}

export function createLodRuntimeDebugSnapshot(args: LodRuntimeDebugSnapshotArgs): LodRuntimeDebugSnapshot {
  return {
    timestamp: new Date().toISOString(),
    player: { chunkX: args.playerChunkX, chunkZ: args.playerChunkZ },
    settings: args.settings,
    debugColorEnabled: args.debugColorEnabled,
    activeSectionCount: args.activeSectionCount,
    activeSectionSample: args.activeSectionSample,
    queueSize: args.queueSize,
    processingCount: args.processingCount,
    droppedCount: args.droppedCount,
    lastUpdateMs: args.lastUpdateMs,
    farRenderer: args.farRenderer,
  }
}

export function formatLodRuntimeDebugSnapshot(snapshot: LodRuntimeDebugSnapshot): string {
  return `LOD log captured (selected=${snapshot.activeSectionCount}, queue=${snapshot.queueSize}, processing=${snapshot.processingCount}, loaded=${snapshot.farRenderer.meshCount}, tris=${snapshot.farRenderer.triangleCount}, update=${snapshot.lastUpdateMs}ms)`
}

export function parseSectionKey(key: string): ParsedSectionKey {
  const [levelToken, coordToken] = key.split(':')
  const [xToken, zToken] = (coordToken ?? '').split(',')
  const level = Number(levelToken)
  const x = Number(xToken)
  const z = Number(zToken)
  if (!Number.isFinite(level) || !Number.isFinite(x) || !Number.isFinite(z)) {
    throw new Error(`Invalid LOD section key: ${key}`)
  }
  return { level, x, z }
}
