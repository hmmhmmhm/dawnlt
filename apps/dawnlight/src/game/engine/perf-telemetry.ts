type PerfPhaseName = 'input' | 'scene' | 'physics' | 'chunks' | 'lod' | 'lodApply' | 'lodOther' | 'interaction' | 'camera' | 'culling' | 'render' | 'total'

interface FramePhaseDurations {
  inputMs: number
  sceneMs: number
  physicsMs: number
  chunkMs: number
  lodMs: number
  lodApplyMs: number
  lodOtherMs: number
  interactionMs: number
  cameraMs: number
  cullingMs: number
  renderMs: number
  totalMs: number
}

interface PerfDropSample {
  timestamp: string
  totalMs: number
  fps: number
  phases: Record<string, number>
}

interface PerfBatchPayload {
  type: 'perf-batch'
  sessionId: string
  sentAt: string
  page: string
  userAgent: string
  frameCount: number
  averageFps: number
  averageFrameMs: number
  maxFrameMs: number
  slowFrames16: number
  slowFrames33: number
  slowFrames50: number
  phaseAverages: Record<string, number>
  phaseMax: Record<string, number>
  dropSamples: PerfDropSample[]
}

const PERF_LOG_ENDPOINT = '/__perf-log'
const FLUSH_INTERVAL_MS = 2000
const MAX_DROP_SAMPLES = 12
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function isLocalPerfTelemetryEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return LOCAL_HOSTS.has(window.location.hostname)
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export class PerfTelemetryClient {
  private readonly enabled = isLocalPerfTelemetryEnabled()
  private readonly sessionId = `perf-${Date.now().toString(36)}-${randomId()}`
  private lastFlushAt = performance.now()
  private frameCount = 0
  private totalFrameMs = 0
  private maxFrameMs = 0
  private slowFrames16 = 0
  private slowFrames33 = 0
  private slowFrames50 = 0
  private readonly phaseTotals = new Map<PerfPhaseName, number>()
  private readonly phaseMax = new Map<PerfPhaseName, number>()
  private readonly dropSamples: PerfDropSample[] = []

  recordFrame(phases: FramePhaseDurations): void {
    if (!this.enabled) return

    this.frameCount += 1
    this.totalFrameMs += phases.totalMs
    this.maxFrameMs = Math.max(this.maxFrameMs, phases.totalMs)

    if (phases.totalMs > 16.7) this.slowFrames16 += 1
    if (phases.totalMs > 33.3) this.slowFrames33 += 1
    if (phases.totalMs > 50) this.slowFrames50 += 1

    const phaseEntries: Array<[PerfPhaseName, number]> = [
      ['input', phases.inputMs],
      ['scene', phases.sceneMs],
      ['physics', phases.physicsMs],
      ['chunks', phases.chunkMs],
      ['lod', phases.lodMs],
      ['lodApply', phases.lodApplyMs],
      ['lodOther', phases.lodOtherMs],
      ['interaction', phases.interactionMs],
      ['camera', phases.cameraMs],
      ['culling', phases.cullingMs],
      ['render', phases.renderMs],
      ['total', phases.totalMs],
    ]

    for (const [name, value] of phaseEntries) {
      this.phaseTotals.set(name, (this.phaseTotals.get(name) ?? 0) + value)
      this.phaseMax.set(name, Math.max(this.phaseMax.get(name) ?? 0, value))
    }

    if (phases.totalMs > 25 && this.dropSamples.length < MAX_DROP_SAMPLES) {
      this.dropSamples.push({
        timestamp: new Date().toISOString(),
        totalMs: round2(phases.totalMs),
        fps: round2(1000 / Math.max(1, phases.totalMs)),
        phases: Object.fromEntries(phaseEntries.map(([name, value]) => [name, round2(value)])),
      })
    }

    if (performance.now() - this.lastFlushAt >= FLUSH_INTERVAL_MS) {
      this.flush()
    }
  }

  flush(): void {
    if (!this.enabled || this.frameCount === 0) return

    const payload: PerfBatchPayload = {
      type: 'perf-batch',
      sessionId: this.sessionId,
      sentAt: new Date().toISOString(),
      page: window.location.href,
      userAgent: navigator.userAgent,
      frameCount: this.frameCount,
      averageFps: round2((this.frameCount * 1000) / Math.max(1, this.totalFrameMs)),
      averageFrameMs: round2(this.totalFrameMs / this.frameCount),
      maxFrameMs: round2(this.maxFrameMs),
      slowFrames16: this.slowFrames16,
      slowFrames33: this.slowFrames33,
      slowFrames50: this.slowFrames50,
      phaseAverages: Object.fromEntries([...this.phaseTotals.entries()].map(([name, total]) => [name, round2(total / this.frameCount)])),
      phaseMax: Object.fromEntries([...this.phaseMax.entries()].map(([name, max]) => [name, round2(max)])),
      dropSamples: [...this.dropSamples],
    }

    this.reset()
    this.lastFlushAt = performance.now()
    void fetch(PERF_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined)
  }

  dispose(): void {
    this.flush()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private reset(): void {
    this.frameCount = 0
    this.totalFrameMs = 0
    this.maxFrameMs = 0
    this.slowFrames16 = 0
    this.slowFrames33 = 0
    this.slowFrames50 = 0
    this.phaseTotals.clear()
    this.phaseMax.clear()
    this.dropSamples.length = 0
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
