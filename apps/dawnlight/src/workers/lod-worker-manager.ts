import type { LodSectionBuildInput } from '../game/engine/lod/lod-data-types'
import type { LodWorkerBuildRequest, LodWorkerBuildResult, LodWorkerCancelRequest, LodWorkerFailedResult, LodWorkerResponseMessage } from './lod-worker'

export type LodWorkerLike = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>

export interface EnqueueLodBuildInput {
  sectionKey: string
  x: number
  z: number
  level: number
  priority: number
  version?: number
  sectionData?: LodSectionBuildInput
}

export interface EnqueueLodBuildResult {
  accepted: boolean
  requestId?: number
  version: number
  reason?: 'queue-full'
}

export interface LodWorkerManagerOptions {
  workerCount?: number
  maxQueueSize?: number
  lodBudgetMs?: number
  now?: () => number
  workerFactory?: () => LodWorkerLike
}

const DEFAULT_WORKER_COUNT = 2
const DEFAULT_MAX_QUEUE_SIZE = 256
const DEFAULT_LOD_BUDGET_MS = 2

export class LodWorkerManager {
  private workers: LodWorkerLike[] = []
  private workerBusy: boolean[] = []
  private activeByWorker = new Map<number, LodWorkerBuildRequest>()
  private queued: LodWorkerBuildRequest[] = []
  private requestId = 0
  private sectionVersions = new Map<string, number>()
  private completed: LodWorkerBuildResult[] = []
  private failed: LodWorkerFailedResult[] = []
  private discardedResultCount = 0

  readonly maxQueueSize: number
  readonly lodBudgetMs: number
  private readonly now: () => number

  constructor(options: LodWorkerManagerOptions = {}) {
    const workerCount = Math.max(1, options.workerCount ?? DEFAULT_WORKER_COUNT)
    this.maxQueueSize = Math.max(1, options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE)
    this.lodBudgetMs = Math.max(0.1, options.lodBudgetMs ?? DEFAULT_LOD_BUDGET_MS)
    this.now = options.now ?? (() => performance.now())

    const workerFactory = options.workerFactory ?? this.createDefaultWorker
    for (let i = 0; i < workerCount; i++) {
      const worker = workerFactory()
      worker.onmessage = (event: MessageEvent<LodWorkerResponseMessage>) => {
        this.handleWorkerMessage(i, event.data)
      }
      worker.onerror = (event: ErrorEvent) => {
        console.error('[LOD] worker error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        })
        this.workerBusy[i] = false
        this.activeByWorker.delete(i)
        this.processQueue()
      }
      this.workers.push(worker)
      this.workerBusy.push(false)
    }
  }

  beginFrame(_frameStartMs: number = this.now()): void {
    // Submission budget is enforced in enqueueBuild; beginFrame is kept for API compatibility.
  }

  getSectionVersion(sectionKey: string): number {
    return this.sectionVersions.get(sectionKey) ?? 0
  }

  invalidateSection(sectionKey: string): number {
    const nextVersion = this.getSectionVersion(sectionKey) + 1
    this.sectionVersions.set(sectionKey, nextVersion)

    this.queued = this.queued.filter((task) => task.sectionKey !== sectionKey)
    for (const [workerIndex, active] of this.activeByWorker) {
      if (active.sectionKey !== sectionKey) continue
      const cancelMessage: LodWorkerCancelRequest = {
        type: 'cancel',
        requestId: active.requestId,
        sectionKey,
        version: nextVersion,
      }
      this.workers[workerIndex].postMessage(cancelMessage)
    }

    return nextVersion
  }

  enqueueBuild(input: EnqueueLodBuildInput, frameElapsedMs: number): EnqueueLodBuildResult {
    void frameElapsedMs
    const version = input.version ?? this.getSectionVersion(input.sectionKey)
    const totalPending = this.queued.length + this.activeByWorker.size
    if (totalPending >= this.maxQueueSize) {
      return { accepted: false, version, reason: 'queue-full' }
    }

    const request: LodWorkerBuildRequest = {
      type: 'build',
      requestId: this.requestId++,
      sectionKey: input.sectionKey,
      x: input.x,
      z: input.z,
      level: input.level,
      version,
      priority: input.priority,
      sectionData: input.sectionData,
    }
    this.queued.push(request)
    this.queued.sort((a, b) => a.priority - b.priority)
    this.processQueue()

    return { accepted: true, requestId: request.requestId, version }
  }

  drainCompleted(maxCount: number = Number.POSITIVE_INFINITY): LodWorkerBuildResult[] {
    if (maxCount >= this.completed.length) {
      const out = this.completed
      this.completed = []
      return out
    }
    return this.completed.splice(0, Math.max(0, maxCount))
  }

  drainFailed(maxCount: number = Number.POSITIVE_INFINITY): LodWorkerFailedResult[] {
    if (maxCount >= this.failed.length) {
      const out = this.failed
      this.failed = []
      return out
    }
    return this.failed.splice(0, Math.max(0, maxCount))
  }

  get queueSize(): number {
    return this.queued.length
  }

  get processingCount(): number {
    return this.activeByWorker.size
  }

  get droppedCount(): number {
    return this.discardedResultCount
  }

  dispose(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.workerBusy = []
    this.activeByWorker.clear()
    this.queued = []
    this.completed = []
    this.failed = []
  }

  private createDefaultWorker = (): LodWorkerLike => {
    throw new Error('LodWorkerManager default workerFactory is unavailable; provide workerFactory in options')
  }

  private processQueue(): void {
    for (let i = 0; i < this.workers.length; i++) {
      if (this.workerBusy[i]) continue
      if (this.queued.length === 0) return

      const next = this.queued.shift()
      if (!next) return
      this.workerBusy[i] = true
      this.activeByWorker.set(i, next)
      this.workers[i].postMessage(next)
    }
  }

  private handleWorkerMessage(workerIndex: number, response: LodWorkerResponseMessage): void {
    this.workerBusy[workerIndex] = false
    this.activeByWorker.delete(workerIndex)

    if (response.type === 'failed') {
      this.failed.push(response)
      this.processQueue()
      return
    }

    const currentVersion = this.getSectionVersion(response.sectionKey)
    if (response.version !== currentVersion) {
      this.discardedResultCount++
      this.processQueue()
      return
    }

    this.completed.push(response)
    this.processQueue()
  }
}
