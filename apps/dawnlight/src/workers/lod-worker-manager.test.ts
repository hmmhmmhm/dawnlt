import type { LodWorkerBuildRequest, LodWorkerResponseMessage } from './lod-worker'
import { type LodWorkerLike, LodWorkerManager } from './lod-worker-manager'

// Use globals provided by Jest environment
declare const describe: any
declare const test: any
declare const expect: any

class FakeLodWorker implements LodWorkerLike {
  onmessage: ((this: Worker, ev: MessageEvent<LodWorkerResponseMessage>) => any) | null = null
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null
  readonly sentMessages: unknown[] = []
  private terminated = false

  postMessage(message: unknown): void {
    this.sentMessages.push(message)
  }

  emitBuilt(data: Omit<LodWorkerBuildRequest, 'type' | 'priority' | 'x' | 'z'>): void {
    const response: LodWorkerResponseMessage = {
      type: 'built',
      requestId: data.requestId,
      sectionKey: data.sectionKey,
      level: data.level,
      version: data.version,
      buildMs: 1,
      lodData: {
        sectionKey: data.sectionKey,
        level: data.level,
        worldStartX: 0,
        worldStartZ: 0,
        baseSize: 16,
        levels: [],
        edgeHeights: {
          north: new Int16Array(0),
          south: new Int16Array(0),
          west: new Int16Array(0),
          east: new Int16Array(0),
        },
      },
    }
    this.onmessage?.call({} as Worker, { data: response } as MessageEvent<LodWorkerResponseMessage>)
  }

  terminate(): void {
    this.terminated = true
  }

  isTerminated(): boolean {
    return this.terminated
  }
}

describe('LodWorkerManager', () => {
  test('rejects submission when queue is full', () => {
    const workers: FakeLodWorker[] = []
    const manager = new LodWorkerManager({
      workerCount: 1,
      maxQueueSize: 1,
      workerFactory: () => {
        const worker = new FakeLodWorker()
        workers.push(worker)
        return worker
      },
      now: () => 0,
    })

    manager.beginFrame(0)
    const first = manager.enqueueBuild({ sectionKey: '0:0,0', x: 0, z: 0, level: 0, priority: 1 }, 0.1)
    const second = manager.enqueueBuild({ sectionKey: '0:1,0', x: 1, z: 0, level: 0, priority: 1 }, 0.1)

    expect(first.accepted).toBe(true)
    expect(second.accepted).toBe(false)
    expect(second.reason).toBe('queue-full')
    expect(workers[0].sentMessages.length).toBe(1)
  })

  test('accepts submission regardless of frame elapsed (budget handled by runtime)', () => {
    const manager = new LodWorkerManager({
      workerCount: 1,
      lodBudgetMs: 2,
      workerFactory: () => new FakeLodWorker(),
      now: () => 0,
    })

    manager.beginFrame(0)
    const result = manager.enqueueBuild({ sectionKey: '0:0,0', x: 0, z: 0, level: 0, priority: 1 }, 2.5)

    expect(result.accepted).toBe(true)
  })

  test('drops stale worker results after section invalidation', () => {
    const workers: FakeLodWorker[] = []
    const manager = new LodWorkerManager({
      workerCount: 1,
      workerFactory: () => {
        const worker = new FakeLodWorker()
        workers.push(worker)
        return worker
      },
      now: () => 0,
    })

    manager.beginFrame(0)
    const submitted = manager.enqueueBuild({ sectionKey: '1:2,3', x: 2, z: 3, level: 1, priority: 1 }, 0)
    expect(submitted.accepted).toBe(true)

    const nextVersion = manager.invalidateSection('1:2,3')
    expect(nextVersion).toBe(1)
    workers[0].emitBuilt({
      requestId: submitted.requestId!,
      sectionKey: '1:2,3',
      level: 1,
      version: 0,
    })

    expect(manager.drainCompleted()).toHaveLength(0)
    expect(manager.droppedCount).toBe(1)
  })

  test('invalidation removes queued tasks and sends cancel for active task', () => {
    const workers: FakeLodWorker[] = []
    const manager = new LodWorkerManager({
      workerCount: 1,
      workerFactory: () => {
        const worker = new FakeLodWorker()
        workers.push(worker)
        return worker
      },
      now: () => 0,
    })

    manager.beginFrame(0)
    manager.enqueueBuild({ sectionKey: '2:0,0', x: 0, z: 0, level: 2, priority: 1 }, 0)
    manager.enqueueBuild({ sectionKey: '2:0,0', x: 0, z: 0, level: 2, priority: 2 }, 0)

    expect(manager.queueSize).toBe(1)
    expect(manager.processingCount).toBe(1)

    manager.invalidateSection('2:0,0')

    expect(manager.queueSize).toBe(0)
    expect((workers[0].sentMessages[1] as { type: string }).type).toBe('cancel')
  })

  test('dispatches accepted queued tasks regardless of current frame elapsed time', () => {
    const workers: FakeLodWorker[] = []
    const nowMs = 100
    const manager = new LodWorkerManager({
      workerCount: 1,
      lodBudgetMs: 2,
      workerFactory: () => {
        const worker = new FakeLodWorker()
        workers.push(worker)
        return worker
      },
      now: () => nowMs,
    })

    manager.beginFrame(0)
    const submitted = manager.enqueueBuild({ sectionKey: '3:1,1', x: 1, z: 1, level: 3, priority: 1 }, 0.5)

    expect(submitted.accepted).toBe(true)
    expect(workers[0].sentMessages.length).toBe(1)
  })
})
