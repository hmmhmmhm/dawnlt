import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const API_ROOT = 'https://api.meshy.ai/openapi'
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED'])

function parseArgs(argv) {
  const out = {
    name: '',
    prompt: '',
    outputRoot: path.join(appRoot, 'asset-origin', 'meshy'),
    envFile: path.join(appRoot, '.env.local'),
    mode: 'full',
    previewTaskId: '',
    pollIntervalMs: 10_000,
    timeoutMs: 20 * 60_000,
    targetFormats: ['glb'],
    enablePbr: true,
    shouldRemesh: true,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') continue
    if (arg === '--name') out.name = String(argv[++i])
    else if (arg === '--prompt') out.prompt = String(argv[++i])
    else if (arg === '--output-root') out.outputRoot = path.resolve(argv[++i])
    else if (arg === '--env-file') out.envFile = path.resolve(argv[++i])
    else if (arg === '--mode') out.mode = String(argv[++i])
    else if (arg === '--preview-task-id') out.previewTaskId = String(argv[++i])
    else if (arg === '--poll-interval-ms') out.pollIntervalMs = Number(argv[++i])
    else if (arg === '--timeout-ms') out.timeoutMs = Number(argv[++i])
    else if (arg === '--target-formats')
      out.targetFormats = String(argv[++i])
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    else if (arg === '--enable-pbr') out.enablePbr = String(argv[++i]).toLowerCase() !== 'false'
    else if (arg === '--should-remesh') out.shouldRemesh = String(argv[++i]).toLowerCase() !== 'false'
    else if (arg === '--help') out.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return out
}

function printHelp() {
  console.log(
    [
      'Generate a Meshy GLB source asset for Dawnlight.',
      '',
      'Usage:',
      '  node ./scripts/meshy-generate.mjs --name apple-basket --prompt "low poly hand basket with four apples"',
      '',
      'Options:',
      '  --name <slug>                    Asset folder and file name',
      '  --prompt <text>                  Text-to-3D prompt',
      '  --mode <preview|refine|full>     Generation mode (default: full)',
      '  --preview-task-id <id>           Existing preview task for refine mode',
      '  --output-root <path>             Output root (default: asset-origin/meshy)',
      '  --env-file <path>                Env file fallback for MESHY_API_KEY',
      '  --target-formats <csv>           Meshy target formats (default: glb)',
      '  --enable-pbr <true|false>        Request PBR textures in refine mode',
      '  --should-remesh <true|false>     Request remesh in preview mode',
      '  --poll-interval-ms <ms>          Polling interval (default: 10000)',
      '  --timeout-ms <ms>                Per-task timeout (default: 1200000)',
      '  --help                           Show this help',
    ].join('\n'),
  )
}

function readApiKey(envFile) {
  if (process.env.MESHY_API_KEY) return process.env.MESHY_API_KEY
  if (!existsSync(envFile)) return ''

  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^MESHY_API_KEY=(.*)$/)
    if (!match) continue
    return match[1].replace(/^['"]|['"]$/g, '')
  }
  return ''
}

function toSlug(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

async function requestJson(url, apiKey, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!response.ok) {
    throw new Error(`Meshy request failed ${response.status}: ${JSON.stringify(body)}`)
  }
  return body
}

async function createPreviewTask(apiKey, opts) {
  const body = {
    mode: 'preview',
    prompt: opts.prompt,
    should_remesh: opts.shouldRemesh,
    target_formats: opts.targetFormats,
  }
  const response = await requestJson(`${API_ROOT}/v2/text-to-3d`, apiKey, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return response.result
}

async function createRefineTask(apiKey, opts, previewTaskId) {
  const body = {
    mode: 'refine',
    preview_task_id: previewTaskId,
    target_formats: opts.targetFormats,
    enable_pbr: opts.enablePbr,
    auto_size: true,
  }
  const response = await requestJson(`${API_ROOT}/v2/text-to-3d`, apiKey, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return response.result
}

async function pollTask(apiKey, taskId, opts) {
  const startedAt = Date.now()
  while (true) {
    const task = await requestJson(`${API_ROOT}/v2/text-to-3d/${taskId}`, apiKey)
    const status = task.status
    const progress = typeof task.progress === 'number' ? `${task.progress}%` : 'unknown'
    console.log(`[Meshy] ${taskId}: ${status} (${progress})`)

    if (TERMINAL_STATUSES.has(status)) {
      if (status !== 'SUCCEEDED') {
        throw new Error(`Meshy task ${taskId} ended with ${status}: ${JSON.stringify(task.task_error ?? {})}`)
      }
      return task
    }
    if (Date.now() - startedAt > opts.timeoutMs) {
      throw new Error(`Timed out waiting for Meshy task ${taskId}`)
    }
    await new Promise((resolve) => setTimeout(resolve, opts.pollIntervalMs))
  }
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status}: ${url}`)
  }
  mkdirSync(path.dirname(outputPath), { recursive: true })
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(outputPath)))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  const name = toSlug(opts.name)
  if (!name) throw new Error('--name is required.')
  if (!['preview', 'refine', 'full'].includes(opts.mode)) throw new Error('--mode must be preview, refine, or full.')
  if (opts.mode !== 'refine' && !opts.prompt) throw new Error('--prompt is required unless --mode refine is used.')
  if (opts.mode === 'refine' && !opts.previewTaskId) throw new Error('--preview-task-id is required for refine mode.')

  const apiKey = readApiKey(opts.envFile)
  if (!apiKey) throw new Error('MESHY_API_KEY is required in the environment or --env-file.')

  const outputDir = path.join(opts.outputRoot, name)
  mkdirSync(outputDir, { recursive: true })

  let previewTask = null
  let refineTask = null
  let previewTaskId = opts.previewTaskId

  if (opts.mode === 'preview' || opts.mode === 'full') {
    previewTaskId = await createPreviewTask(apiKey, opts)
    previewTask = await pollTask(apiKey, previewTaskId, opts)
  }

  if (opts.mode === 'refine' || opts.mode === 'full') {
    const refineTaskId = await createRefineTask(apiKey, opts, previewTaskId)
    refineTask = await pollTask(apiKey, refineTaskId, opts)
  }

  const finalTask = refineTask ?? previewTask
  const glbUrl = finalTask?.model_urls?.glb
  if (!glbUrl) throw new Error('Meshy task did not return model_urls.glb.')

  const glbPath = path.join(outputDir, `${name}.glb`)
  const thumbnailPath = path.join(outputDir, `${name}.png`)
  await downloadFile(glbUrl, glbPath)
  if (finalTask.thumbnail_url) {
    await downloadFile(finalTask.thumbnail_url, thumbnailPath)
  }

  const metadata = {
    name,
    prompt: opts.prompt,
    createdAt: new Date().toISOString(),
    source: 'Meshy API v2 text-to-3d',
    previewTaskId,
    refineTaskId: refineTask?.id ?? null,
    finalTaskId: finalTask.id,
    status: finalTask.status,
    consumedCredits: finalTask.consumed_credits ?? null,
    modelUrls: finalTask.model_urls,
    thumbnailUrl: finalTask.thumbnail_url ?? null,
    localFiles: {
      glb: glbPath,
      thumbnail: finalTask.thumbnail_url ? thumbnailPath : null,
    },
  }
  writeFileSync(path.join(outputDir, `${name}.meshy.json`), JSON.stringify(metadata, null, 2), 'utf8')
  console.log(`Downloaded GLB: ${glbPath}`)
  console.log(`Metadata: ${path.join(outputDir, `${name}.meshy.json`)}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
