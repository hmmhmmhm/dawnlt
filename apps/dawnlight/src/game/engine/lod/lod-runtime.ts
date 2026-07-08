import { CHUNK_SIZE, CHUNK_Y_COUNT, CHUNK_Y_SIZE, DEFAULT_LOD_QUALITY, ENABLE_FAR_LOD, FAR_LOD_DISTANCE, LOD_BUDGET_MS, type LodQuality, RENDER_DISTANCE_Y, RENDER_DISTANCE_Y_DOWN } from '../../../constants'
import { getChunkKey, getChunkKey3D, getChunksInRadius3D } from '../../../engine/world'
import { LodWorkerManager } from '../../../workers/lod-worker-manager'
import type { GameEngine } from '../game-engine'
import { FarRenderer } from './far-renderer'
import { isLodDebugColorEnabled, setLodDebugColorEnabled } from './far-renderer-debug'
import type { LodSectionBuildInput } from './lod-data-types'
import { DEFAULT_MAX_QUEUE_SIZE, FAR_COVER_HYSTERESIS_MS, getMaxLevelByQuality, INITIAL_LOD_VISIBILITY_WARMUP_MS, INITIAL_LOD_WARMUP_MS, MAX_COMPLETED_SECTION_APPLIES_PER_TICK, MAX_NEW_VISIBLE_SECTIONS_PER_TICK, MAX_SECTION_INPUT_BUILDS_PER_TICK, MAX_SYNC_LOD_COLUMN_GENERATIONS_PER_TICK } from './lod-runtime-config'
import { createLodRuntimeDebugSnapshot, formatLodRuntimeDebugSnapshot, type LodRuntimeSettings, parseSectionKey } from './lod-runtime-debug'
import { createChunkSectionFromColumn } from './lod-runtime-section'
import { collectFarLeafPositions, isSectionOutsideRenderDistance } from './lod-runtime-selection'
import { createLodSectionKey, normalizeToLevel } from './lod-section'
import { LodTree } from './lod-tree'
export class LodRuntime {
  private lodStartDistance: number
  private maxLevel: number
  private enabled: boolean
  private quality: LodQuality
  private farDistance: number
  private lodBudgetMs: number
  private tree: LodTree
  private workerManager: LodWorkerManager
  private farRenderer: FarRenderer
  private readonly rawChunkKeysCoveredByFarLod = new Set<string>()
  private readonly chunkKeysCoveredByFarLod = new Set<string>()
  private readonly chunkCoverHoldUntilMs = new Map<string, number>()
  private readonly generatedChunkSectionsForLod = new Map<string, Uint8Array>()
  private readonly visibleSectionKeys = new Set<string>()
  private lastFarRendererUpdateMs = performance.now()
  private lastUpdateMs = 0
  private activeSectionCount = 0
  private lastActiveSectionKeys: string[] = []
  private remainingSyncColumnGenerations = 0
  private lodWarmupUntilMs = performance.now() + INITIAL_LOD_WARMUP_MS
  private lodVisibilityWarmupUntilMs = performance.now() + INITIAL_LOD_VISIBILITY_WARMUP_MS
  private lastApplyResultsMs = 0
  private lastAppliedSectionCount = 0

  constructor(private readonly engine: GameEngine) {
    this.quality = DEFAULT_LOD_QUALITY
    this.maxLevel = getMaxLevelByQuality(this.quality)
    this.enabled = ENABLE_FAR_LOD
    this.farDistance = Math.max(2, FAR_LOD_DISTANCE)
    this.lodBudgetMs = Math.max(0.1, LOD_BUDGET_MS)
    this.lodStartDistance = Math.max(2, this.engine.renderDistance)
    this.tree = this.createTree(this.maxLevel, this.lodStartDistance)
    this.workerManager = this.createWorkerManager(this.lodBudgetMs)
    this.farRenderer = new FarRenderer(this.engine.scene, this.engine.renderer)
  }

  tick(frameStartMs: number = performance.now()): void {
    const updateStartMs = performance.now()
    try {
      if (!this.enabled) return
      this.syncLodStartDistance()
      this.workerManager.beginFrame(frameStartMs)
      this.applyWorkerResults()

      const currentChunkX = Math.floor(this.engine.player.position.x / CHUNK_SIZE)
      const currentChunkY = Math.floor(this.engine.player.position.y / CHUNK_Y_SIZE)
      const currentChunkZ = Math.floor(this.engine.player.position.z / CHUNK_SIZE)
      const renderDistance = this.engine.renderDistance
      const meshWorker = this.engine.meshWorkerManager
      const nearPipelineBusy = this.engine.chunkLoadQueue.length > 0 || (meshWorker ? meshWorker.pendingCount > 0 || meshWorker.meshQueueSize > 0 || meshWorker.busyWorkerCount > 0 : false)
      let nearChunksReady = !nearPipelineBusy
      if (nearChunksReady) {
        for (const near of getChunksInRadius3D(currentChunkX, currentChunkY, currentChunkZ, renderDistance, RENDER_DISTANCE_Y, RENDER_DISTANCE_Y_DOWN)) {
          if (!this.engine.chunks3D.has(getChunkKey3D(near.cx, near.cy, near.cz))) {
            nearChunksReady = false
            break
          }
        }
      }
      const leaves = getChunksInRadius3D(currentChunkX, currentChunkY, currentChunkZ, Math.max(renderDistance, this.farDistance), RENDER_DISTANCE_Y, RENDER_DISTANCE_Y_DOWN)

      const farLeafPositions = collectFarLeafPositions(leaves, currentChunkX, currentChunkZ, renderDistance)
      const selection = this.tree.selectActiveSections(farLeafPositions, { x: currentChunkX, z: currentChunkZ }, (x, z, level) => isSectionOutsideRenderDistance(x, z, level, currentChunkX, currentChunkZ, renderDistance))
      this.applySelection(selection.activeKeys, selection.deactivated)
      this.updateFarRenderer(frameStartMs)
      if (!nearChunksReady) return

      const enqueueStartMs = performance.now()
      const warmupActive = enqueueStartMs < this.lodWarmupUntilMs
      const collectDeadlineMs = enqueueStartMs + this.lodBudgetMs
      this.remainingSyncColumnGenerations = warmupActive ? 0 : MAX_SYNC_LOD_COLUMN_GENERATIONS_PER_TICK
      let submittedCount = 0
      let preparedSectionCount = 0
      for (const key of selection.missing) {
        const section = this.tree.getSection(key)
        if (section && section.state !== 'idle') continue

        if (preparedSectionCount >= MAX_SECTION_INPUT_BUILDS_PER_TICK) break
        const enqueueElapsedMs = performance.now() - enqueueStartMs
        if (submittedCount > 0 && enqueueElapsedMs > this.lodBudgetMs) break

        const parsed = parseSectionKey(key)
        const sectionData = this.collectSectionBuildInput(key, parsed.x, parsed.z, parsed.level, collectDeadlineMs)
        if (!sectionData) {
          if (performance.now() >= collectDeadlineMs) break
          continue
        }
        preparedSectionCount += 1

        const next = this.tree.setSectionState(parsed.x, parsed.z, parsed.level, 'building')

        const sectionScale = 1 << Math.max(0, parsed.level)
        const centerX = parsed.x * sectionScale + sectionScale * 0.5
        const centerZ = parsed.z * sectionScale + sectionScale * 0.5
        const distance = Math.hypot(centerX - currentChunkX, centerZ - currentChunkZ)
        const priority = (this.maxLevel - parsed.level) * 1000 + distance

        const queued = this.workerManager.enqueueBuild(
          {
            sectionKey: next.key,
            x: parsed.x,
            z: parsed.z,
            level: parsed.level,
            priority,
            sectionData,
          },
          0,
        )

        if (!queued.accepted) {
          this.tree.setSectionState(parsed.x, parsed.z, parsed.level, 'idle')
          continue
        }
        submittedCount += 1
      }
    } finally {
      this.lastUpdateMs = performance.now() - updateStartMs
    }
  }

  invalidateChunk(chunkX: number, chunkZ: number): void {
    if (!this.enabled) return
    for (let cy = 0; cy < CHUNK_Y_COUNT; cy++) {
      this.generatedChunkSectionsForLod.delete(getChunkKey3D(chunkX, cy, chunkZ))
    }
    for (let level = 0; level <= this.maxLevel; level++) {
      const key = createLodSectionKey(normalizeToLevel(chunkX, level), normalizeToLevel(chunkZ, level), level)
      this.workerManager.invalidateSection(key)
      this.farRenderer.removeSection(key)
      const section = this.tree.getSection(key)
      if (section && section.state !== 'idle') {
        this.tree.setSectionState(section.x, section.z, section.level, 'idle')
      }
    }
    this.rawChunkKeysCoveredByFarLod.clear()
    this.chunkKeysCoveredByFarLod.clear()
    this.chunkCoverHoldUntilMs.clear()
  }

  getQueueSize(): number {
    return this.enabled ? this.workerManager.queueSize : 0
  }
  getProcessingCount(): number {
    return this.enabled ? this.workerManager.processingCount : 0
  }
  getDroppedCount(): number {
    return this.enabled ? this.workerManager.droppedCount : 0
  }

  isChunkCoveredByFarLod(chunkX: number, chunkZ: number): boolean {
    if (!this.enabled) return false
    return this.chunkKeysCoveredByFarLod.has(`${chunkX},${chunkZ}`)
  }

  isEnabled(): boolean {
    return this.enabled
  }
  getActiveSectionCount(): number {
    return this.enabled ? this.activeSectionCount : 0
  }
  getLastUpdateMs(): number {
    return this.lastUpdateMs
  }
  getLastApplyResultsMs(): number {
    return this.lastApplyResultsMs
  }
  getLastAppliedSectionCount(): number {
    return this.lastAppliedSectionCount
  }

  getSettings(): LodRuntimeSettings {
    return {
      enabled: this.enabled,
      farDistance: this.farDistance,
      quality: this.quality,
      lodBudgetMs: this.lodBudgetMs,
    }
  }

  isDebugColorEnabled(): boolean {
    return isLodDebugColorEnabled()
  }
  setDebugColorEnabled(enabled: boolean): boolean {
    if (isLodDebugColorEnabled() === enabled) return enabled
    setLodDebugColorEnabled(enabled)
    this.rebuildPipeline()
    return enabled
  }

  logDebugSnapshot(): string {
    const playerChunkX = Math.floor(this.engine.player.position.x / CHUNK_SIZE)
    const playerChunkZ = Math.floor(this.engine.player.position.z / CHUNK_SIZE)
    const snapshot = createLodRuntimeDebugSnapshot({
      playerChunkX,
      playerChunkZ,
      settings: this.getSettings(),
      debugColorEnabled: this.isDebugColorEnabled(),
      activeSectionCount: this.getActiveSectionCount(),
      activeSectionSample: this.lastActiveSectionKeys.slice(0, 10),
      queueSize: this.getQueueSize(),
      processingCount: this.getProcessingCount(),
      droppedCount: this.getDroppedCount(),
      lastUpdateMs: Math.round(this.getLastUpdateMs() * 100) / 100,
      farRenderer: this.farRenderer.getStats(),
    })
    console.log('[lodlog]', snapshot)
    return formatLodRuntimeDebugSnapshot(snapshot)
  }

  configure(next: Partial<LodRuntimeSettings>): LodRuntimeSettings {
    const enabled = next.enabled ?? this.enabled
    const quality = next.quality ?? this.quality
    const farDistance = Math.max(2, Math.round(next.farDistance ?? this.farDistance))
    const lodBudgetMs = Math.max(0.1, next.lodBudgetMs ?? this.lodBudgetMs)
    const maxLevel = getMaxLevelByQuality(quality)

    const changed = enabled !== this.enabled || quality !== this.quality || farDistance !== this.farDistance || Math.abs(lodBudgetMs - this.lodBudgetMs) > 0.001

    if (!changed) return this.getSettings()

    this.enabled = enabled
    this.quality = quality
    this.maxLevel = maxLevel
    this.farDistance = farDistance
    this.lodBudgetMs = lodBudgetMs
    this.rebuildPipeline()
    return this.getSettings()
  }

  dispose(): void {
    this.workerManager.dispose()
    this.farRenderer.dispose()
    this.rawChunkKeysCoveredByFarLod.clear()
    this.chunkKeysCoveredByFarLod.clear()
    this.chunkCoverHoldUntilMs.clear()
    this.generatedChunkSectionsForLod.clear()
    this.visibleSectionKeys.clear()
  }
  rebuildDebugPipeline(): void {
    this.rebuildPipeline()
  }
  private createTree(maxLevel: number, baseDistance: number): LodTree {
    return new LodTree({ maxLevel, baseDistance })
  }
  private getLodStartDistance(): number {
    return Math.max(2, this.engine.renderDistance)
  }
  private syncLodStartDistance(): void {
    const next = this.getLodStartDistance()
    if (next !== this.lodStartDistance) {
      this.lodStartDistance = next
      this.tree = this.createTree(this.maxLevel, this.lodStartDistance)
    }
  }

  private createWorkerManager(lodBudgetMs: number): LodWorkerManager {
    return new LodWorkerManager({
      maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
      lodBudgetMs,
      workerFactory: () => new Worker(new URL('../../../workers/lod-worker.ts', import.meta.url), { type: 'module' }),
    })
  }

  private rebuildPipeline(): void {
    this.workerManager.dispose()
    this.workerManager = this.createWorkerManager(this.lodBudgetMs)
    this.lodStartDistance = this.getLodStartDistance()
    this.tree = this.createTree(this.maxLevel, this.lodStartDistance)
    this.farRenderer.dispose()
    this.farRenderer = new FarRenderer(this.engine.scene, this.engine.renderer)
    this.rawChunkKeysCoveredByFarLod.clear()
    this.chunkKeysCoveredByFarLod.clear()
    this.chunkCoverHoldUntilMs.clear()
    this.generatedChunkSectionsForLod.clear()
    this.visibleSectionKeys.clear()
    this.activeSectionCount = 0
    this.lastActiveSectionKeys = []
    this.lastFarRendererUpdateMs = performance.now()
    this.lodWarmupUntilMs = performance.now() + INITIAL_LOD_WARMUP_MS
    this.lodVisibilityWarmupUntilMs = performance.now() + INITIAL_LOD_VISIBILITY_WARMUP_MS
  }

  private applyWorkerResults(): void {
    const applyStartMs = performance.now()
    let appliedSectionCount = 0
    const completed = this.workerManager.drainCompleted(MAX_COMPLETED_SECTION_APPLIES_PER_TICK)
    for (const result of completed) {
      const section = this.tree.getSection(result.sectionKey)
      if (!section) continue
      if (section.state === 'idle') continue

      this.farRenderer.upsertSection(result.lodData)
      appliedSectionCount++
      if (section.state === 'building') {
        this.tree.setSectionState(section.x, section.z, section.level, 'ready')
      }
    }
    this.lastApplyResultsMs = performance.now() - applyStartMs
    this.lastAppliedSectionCount = appliedSectionCount

    const failed = this.workerManager.drainFailed(MAX_COMPLETED_SECTION_APPLIES_PER_TICK * 2)
    for (const result of failed) {
      const section = this.tree.getSection(result.sectionKey)
      if (!section) continue
      this.tree.setSectionState(section.x, section.z, section.level, 'idle')
    }
  }

  private applySelection(activeKeys: Set<string>, deactivated: readonly string[]): void {
    for (const key of deactivated) {
      this.farRenderer.setSectionVisible(key, false)
      this.visibleSectionKeys.delete(key)
    }

    let activeCount = 0
    let newVisibleCount = 0
    const visibilityWarmupActive = performance.now() < this.lodVisibilityWarmupUntilMs
    this.lastActiveSectionKeys = []
    this.rawChunkKeysCoveredByFarLod.clear()
    for (const key of activeKeys) {
      const section = this.tree.getSection(key)
      if (!section || section.level <= 0 || !this.farRenderer.hasSection(key)) continue
      const wasVisible = this.visibleSectionKeys.has(key)
      if (visibilityWarmupActive && !wasVisible && newVisibleCount >= MAX_NEW_VISIBLE_SECTIONS_PER_TICK) continue
      this.farRenderer.setSectionVisible(key, true)
      this.visibleSectionKeys.add(key)
      if (!wasVisible) newVisibleCount++
      if (this.farRenderer.isSectionCoverageReady(key)) {
        this.addFarCoverage(this.rawChunkKeysCoveredByFarLod, section.x, section.z, section.level)
      }
      this.lastActiveSectionKeys.push(key)
      activeCount++
    }
    this.activeSectionCount = activeCount
    this.applyFarCoverageHysteresis(performance.now())
  }

  private updateFarRenderer(frameStartMs: number): void {
    const deltaSeconds = Math.max(0, Math.min(0.1, (frameStartMs - this.lastFarRendererUpdateMs) * 0.001))
    this.lastFarRendererUpdateMs = frameStartMs
    const sunLight = this.engine.directionalLight.intensity
    this.farRenderer.update(this.engine.player.position.x, this.engine.player.position.z, deltaSeconds, sunLight)
  }

  private addFarCoverage(target: Set<string>, sectionX: number, sectionZ: number, level: number): void {
    const sectionScale = 1 << Math.max(0, level)
    const startChunkX = sectionX * sectionScale
    const startChunkZ = sectionZ * sectionScale
    const endChunkX = startChunkX + sectionScale
    const endChunkZ = startChunkZ + sectionScale

    for (let cx = startChunkX; cx < endChunkX; cx++) {
      for (let cz = startChunkZ; cz < endChunkZ; cz++) {
        target.add(`${cx},${cz}`)
      }
    }
  }

  private applyFarCoverageHysteresis(nowMs: number): void {
    this.chunkKeysCoveredByFarLod.clear()

    for (const key of this.rawChunkKeysCoveredByFarLod) {
      this.chunkCoverHoldUntilMs.set(key, nowMs + FAR_COVER_HYSTERESIS_MS)
    }

    for (const [key, holdUntilMs] of this.chunkCoverHoldUntilMs) {
      if (holdUntilMs < nowMs && !this.rawChunkKeysCoveredByFarLod.has(key)) {
        this.chunkCoverHoldUntilMs.delete(key)
        continue
      }
      this.chunkKeysCoveredByFarLod.add(key)
    }
  }

  private collectSectionBuildInput(sectionKey: string, sectionX: number, sectionZ: number, level: number, deadlineMs: number): LodSectionBuildInput | null {
    const sectionScale = 1 << Math.max(0, level)
    const minCx = sectionX * sectionScale - 1
    const maxCx = (sectionX + 1) * sectionScale
    const minCz = sectionZ * sectionScale - 1
    const maxCz = (sectionZ + 1) * sectionScale

    const chunksByKey: Record<string, Uint8Array> = {}
    let hasMissingChunks = false
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (performance.now() >= deadlineMs) return null
      for (let cz = minCz; cz <= maxCz; cz++) {
        for (let cy = 0; cy < CHUNK_Y_COUNT; cy++) {
          const key = getChunkKey3D(cx, cy, cz)
          const chunkData = this.getChunkSectionForLod(cx, cy, cz, deadlineMs)
          if (!chunkData) {
            hasMissingChunks = true
            continue
          }
          chunksByKey[key] = chunkData
        }
      }
    }
    if (hasMissingChunks) return null
    return {
      sectionKey,
      sectionX,
      sectionZ,
      level,
      chunksByKey,
      minCy: 0,
      maxCy: CHUNK_Y_COUNT - 1,
    }
  }

  private getChunkSectionForLod(cx: number, cy: number, cz: number, deadlineMs: number): Uint8Array | undefined {
    const sectionKey = getChunkKey3D(cx, cy, cz)
    const loaded = this.engine.chunks3D.get(sectionKey)
    if (loaded) return loaded

    const cached = this.generatedChunkSectionsForLod.get(sectionKey)
    if (cached) return cached

    const columnKey = getChunkKey(cx, cz)
    let column = this.engine.columnCache.get(columnKey) ?? this.engine.chunks.get(columnKey)
    if (!column) {
      if (performance.now() >= deadlineMs) return undefined
      if (this.remainingSyncColumnGenerations <= 0) return undefined
      this.remainingSyncColumnGenerations--
      column = this.engine.worldGen.generateChunk(cx, cz)
      this.engine.columnCache.set(columnKey, column)
      this.engine.chunks.set(columnKey, column)
    }

    const section = createChunkSectionFromColumn(column, cy)
    this.generatedChunkSectionsForLod.set(sectionKey, section)
    return section
  }
}
