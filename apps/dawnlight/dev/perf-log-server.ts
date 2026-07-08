import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

interface PerfPhaseAggregate {
  count: number
  totalMs: number
  maxMs: number
}

interface PerfDropSample {
  timestamp: string
  totalMs: number
  fps: number
  phases: Record<string, number>
}

interface PerfClientBatch {
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

interface PerfSummary {
  batches: number
  sessionIds: string[]
  firstSeenAt: string
  lastSeenAt: string
  page: string
  userAgent: string
  totalFrames: number
  weightedAverageFps: number
  weightedAverageFrameMs: number
  maxFrameMs: number
  slowFrames16: number
  slowFrames33: number
  slowFrames50: number
  phaseTotals: Record<string, PerfPhaseAggregate>
  recentDrops: PerfDropSample[]
}

const PERF_LOG_ENDPOINT = '/__perf-log'
const LOG_DIR = resolve(process.cwd(), '.perf-logs')
const LOG_FILE = resolve(LOG_DIR, 'perf-telemetry.ndjson')
const SUMMARY_FILE = resolve(LOG_DIR, 'latest-summary.json')
const MAX_RECENT_DROPS = 40
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function isLocalRequest(req: IncomingMessage): boolean {
  const remote = req.socket.remoteAddress ?? ''
  if (LOCAL_ADDRESSES.has(remote)) return true
  const hostHeader = req.headers.host?.split(':')[0] ?? ''
  return LOCAL_HOSTS.has(hostHeader)
}

async function readSummary(): Promise<PerfSummary | null> {
  return readSummaryFile(SUMMARY_FILE)
}

async function readSummaryFile(summaryFile: string): Promise<PerfSummary | null> {
  try {
    const raw = await readFile(summaryFile, 'utf8')
    return JSON.parse(raw) as PerfSummary
  } catch {
    return null
  }
}

function getSessionSummaryFile(sessionId: string): string {
  return resolve(LOG_DIR, `${sessionId}.summary.json`)
}

function mergePhaseAggregates(target: Record<string, PerfPhaseAggregate>, averages: Record<string, number>, maxValues: Record<string, number>, frameCount: number): void {
  const keys = new Set([...Object.keys(averages), ...Object.keys(maxValues)])
  for (const key of keys) {
    const aggregate = target[key] ?? { count: 0, totalMs: 0, maxMs: 0 }
    aggregate.count += frameCount
    aggregate.totalMs += (averages[key] ?? 0) * frameCount
    aggregate.maxMs = Math.max(aggregate.maxMs, maxValues[key] ?? 0)
    target[key] = aggregate
  }
}

function mergeSummary(previous: PerfSummary | null, batch: PerfClientBatch): PerfSummary {
  const nextFrames = (previous?.totalFrames ?? 0) + batch.frameCount
  const previousFrameWeight = previous?.totalFrames ?? 0
  const weightedAverageFps = nextFrames > 0 ? ((previous?.weightedAverageFps ?? 0) * previousFrameWeight + batch.averageFps * batch.frameCount) / nextFrames : batch.averageFps
  const weightedAverageFrameMs = nextFrames > 0 ? ((previous?.weightedAverageFrameMs ?? 0) * previousFrameWeight + batch.averageFrameMs * batch.frameCount) / nextFrames : batch.averageFrameMs

  const recentDrops = [...(previous?.recentDrops ?? []), ...batch.dropSamples].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-MAX_RECENT_DROPS)

  const phaseTotals = { ...(previous?.phaseTotals ?? {}) }
  mergePhaseAggregates(phaseTotals, batch.phaseAverages, batch.phaseMax, batch.frameCount)

  const sessionIds = new Set(previous?.sessionIds ?? [])
  sessionIds.add(batch.sessionId)

  return {
    batches: (previous?.batches ?? 0) + 1,
    sessionIds: [...sessionIds],
    firstSeenAt: previous?.firstSeenAt ?? batch.sentAt,
    lastSeenAt: batch.sentAt,
    page: batch.page,
    userAgent: batch.userAgent,
    totalFrames: nextFrames,
    weightedAverageFps: Math.round(weightedAverageFps * 100) / 100,
    weightedAverageFrameMs: Math.round(weightedAverageFrameMs * 100) / 100,
    maxFrameMs: Math.max(previous?.maxFrameMs ?? 0, batch.maxFrameMs),
    slowFrames16: (previous?.slowFrames16 ?? 0) + batch.slowFrames16,
    slowFrames33: (previous?.slowFrames33 ?? 0) + batch.slowFrames33,
    slowFrames50: (previous?.slowFrames50 ?? 0) + batch.slowFrames50,
    phaseTotals,
    recentDrops,
  }
}

async function persistBatch(batch: PerfClientBatch): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true })
  await appendFile(LOG_FILE, `${JSON.stringify(batch)}\n`, 'utf8')
  const previous = await readSummary()
  const summary = mergeSummary(previous, batch)
  await writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  const sessionSummaryFile = getSessionSummaryFile(batch.sessionId)
  const previousSession = await readSummaryFile(sessionSummaryFile)
  const sessionSummary = mergeSummary(previousSession, batch)
  await writeFile(sessionSummaryFile, `${JSON.stringify(sessionSummary, null, 2)}\n`, 'utf8')
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(res: ServerResponse, statusCode: number, payload: object): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function handlePerfRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isLocalRequest(req)) {
    sendJson(res, 403, { ok: false, error: 'local requests only' })
    return
  }

  if (req.method === 'GET') {
    const summary = await readSummary()
    sendJson(res, 200, { ok: true, summary })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
    return
  }

  try {
    const body = await readBody(req)
    const batch = JSON.parse(body) as PerfClientBatch
    if (batch.type !== 'perf-batch' || !batch.sessionId || batch.frameCount <= 0) {
      sendJson(res, 400, { ok: false, error: 'invalid payload' })
      return
    }
    await persistBatch(batch)
    sendJson(res, 200, {
      ok: true,
      logFile: LOG_FILE,
      summaryFile: SUMMARY_FILE,
      sessionSummaryFile: getSessionSummaryFile(batch.sessionId),
    })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export function createPerfLogServerPlugin(): Plugin {
  return {
    name: 'dawnlight-perf-log-server',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next()
          return
        }
        const path = req.url.split('?')[0]
        if (path !== PERF_LOG_ENDPOINT) {
          next()
          return
        }
        await handlePerfRequest(req, res)
      })
    },
    async buildStart() {
      await mkdir(dirname(LOG_FILE), { recursive: true })
    },
  }
}
