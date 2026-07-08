import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const out = {
    source: path.join(appRoot, 'asset-optimized', 'meshy'),
    output: path.join(appRoot, 'public', 'glb', 'meshy'),
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') continue
    if (arg === '--source') out.source = path.resolve(argv[++i])
    else if (arg === '--output') out.output = path.resolve(argv[++i])
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--help') out.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return out
}

function printHelp() {
  console.log(
    [
      'Publish optimized Meshy GLB files to Vite public assets.',
      '',
      'Usage:',
      '  node ./scripts/publish-meshy-assets.mjs',
      '',
      'Options:',
      '  --source <path>       Source root (default: asset-optimized/meshy)',
      '  --output <path>       Public output root (default: public/glb/meshy)',
      '  --dry-run             Print copies without writing files',
      '  --help                Show this help',
    ].join('\n'),
  )
}

function findGlbFiles(rootDir) {
  if (!existsSync(rootDir)) return []
  const results = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const fullPath = path.join(dir, name)
      const st = statSync(fullPath)
      if (st.isDirectory()) walk(fullPath)
      else if (st.isFile() && name.toLowerCase().endsWith('.glb')) results.push(fullPath)
    }
  }
  walk(rootDir)
  return results
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  const files = findGlbFiles(opts.source)
  if (files.length === 0) {
    console.log(`No Meshy GLB files found in ${opts.source}`)
    return
  }

  for (const sourcePath of files) {
    const relativePath = path.relative(opts.source, sourcePath)
    const outputPath = path.join(opts.output, relativePath)
    console.log(`${sourcePath} -> ${outputPath}`)
    if (opts.dryRun) continue
    mkdirSync(path.dirname(outputPath), { recursive: true })
    copyFileSync(sourcePath, outputPath)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
