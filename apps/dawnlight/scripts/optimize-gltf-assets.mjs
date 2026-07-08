import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const out = {
    source: path.join(appRoot, 'asset-origin'),
    output: path.join(appRoot, 'asset-optimized'),
    textureSize: 1024,
    animationTextureSize: 16,
    textureCompress: 'webp',
    extractTextures: true,
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') continue
    if (arg === '--source') out.source = path.resolve(argv[++i])
    else if (arg === '--output') out.output = path.resolve(argv[++i])
    else if (arg === '--texture-size') out.textureSize = Number(argv[++i])
    else if (arg === '--animation-texture-size') out.animationTextureSize = Number(argv[++i])
    else if (arg === '--texture-compress') out.textureCompress = String(argv[++i])
    else if (arg === '--extract-textures') out.extractTextures = String(argv[++i]).toLowerCase() !== 'false'
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--help') out.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return out
}

function printHelp() {
  console.log(
    [
      'Optimize GLB assets from asset-origin into asset-optimized.',
      '',
      'Usage:',
      '  node ./scripts/optimize-gltf-assets.mjs [options]',
      '',
      'Options:',
      '  --source <path>                   Source root (default: apps/dawnlight/asset-origin)',
      '  --output <path>                   Output root (default: apps/dawnlight/asset-optimized)',
      '  --texture-size <pixels>           Max texture size for regular files (default: 1024)',
      '  --animation-texture-size <pixels> Max texture size for animation packs (default: 16)',
      '  --texture-compress <format>       Texture codec for optimize command (default: webp)',
      '  --extract-textures <true|false>    Also write non-animation texture bundles as .gltf + image files (default: true)',
      '  --dry-run                         Print commands without running them',
      '  --help                            Show this help',
      '',
      'Notes:',
      "  - Files with names containing 'animation' are treated as animation packs and",
      '    get aggressive texture downscale to avoid duplicate texture payloads.',
      '  - Requires pnpm + network access for first-time dlx package download.',
    ].join('\n'),
  )
}

function findGlbFiles(rootDir) {
  const results = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const fullPath = path.join(dir, name)
      const st = statSync(fullPath)
      if (st.isDirectory()) {
        walk(fullPath)
      } else if (st.isFile() && name.toLowerCase().endsWith('.glb')) {
        results.push(fullPath)
      }
    }
  }
  walk(rootDir)
  return results
}

function isAnimationPack(filePath) {
  const name = path.basename(filePath).toLowerCase()
  return name.includes('animation')
}

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function buildOutputFileName(sourcePath, sourceRoot) {
  const relativeDir = path.relative(sourceRoot, path.dirname(sourcePath))
  const folderName = relativeDir && relativeDir !== '.' ? path.basename(relativeDir) : 'character'
  const characterName = toKebabCase(folderName)
  const animationPack = isAnimationPack(sourcePath)
  return animationPack ? `${characterName}-anim.glb` : `${characterName}.glb`
}

function toMB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2))
}

function toReportPath(filePath) {
  const relativePath = path.relative(appRoot, filePath)
  return relativePath.startsWith('..') ? filePath : relativePath
}

function runOptimize(command, args, env, dryRun) {
  const line = `${command} ${args.map((x) => (x.includes(' ') ? `"${x}"` : x)).join(' ')}`
  console.log(`\n> ${line}`)
  if (dryRun) return 0

  const result = spawnSync(line, [], {
    shell: true,
    stdio: 'inherit',
    cwd: appRoot,
    env,
  })
  return result.status ?? 1
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  if (Number.isNaN(opts.textureSize) || Number.isNaN(opts.animationTextureSize)) {
    throw new Error('Texture sizes must be numbers.')
  }

  const glbFiles = findGlbFiles(opts.source)
  if (glbFiles.length === 0) {
    console.log(`No .glb files found in ${opts.source}`)
    return
  }

  mkdirSync(opts.output, { recursive: true })

  const isWindows = process.platform === 'win32'
  const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm'

  const env = {
    ...process.env,
    PNPM_HOME: path.join(os.tmpdir(), 'pnpm-home'),
    XDG_CACHE_HOME: path.join(os.tmpdir(), 'pnpm-cache'),
  }

  const report = []
  const startedAt = new Date().toISOString()

  for (const sourcePath of glbFiles) {
    const relPath = path.relative(opts.source, sourcePath)
    const relDir = path.dirname(relPath)
    const fileName = buildOutputFileName(sourcePath, opts.source)
    const outDir = relDir === '.' ? opts.output : path.join(opts.output, relDir)
    const outPath = path.join(outDir, fileName)
    mkdirSync(outDir, { recursive: true })

    const sourceStat = statSync(sourcePath)
    const animationPack = isAnimationPack(sourcePath)
    const textureSize = animationPack ? opts.animationTextureSize : opts.textureSize

    const args = ['dlx', '@gltf-transform/cli', 'optimize', sourcePath, outPath, '--compress', 'meshopt', '--texture-compress', opts.textureCompress, '--texture-size', String(textureSize), '--simplify', 'false', '--join', 'false', '--palette', 'false', '--instance', 'false']

    const status = runOptimize(pnpmCmd, args, env, opts.dryRun)
    if (status !== 0) {
      throw new Error(`Optimization failed (${status}) for ${sourcePath}`)
    }

    let textureBundle = null
    if (!animationPack && opts.extractTextures) {
      const textureDir = path.join(outDir, 'textures')
      mkdirSync(textureDir, { recursive: true })
      const textureBundlePath = path.join(textureDir, `${fileName.replace(/\.glb$/i, '')}.gltf`)
      const textureArgs = ['dlx', '@gltf-transform/cli', 'optimize', sourcePath, textureBundlePath, '--compress', 'meshopt', '--texture-compress', opts.textureCompress, '--texture-size', String(textureSize), '--simplify', 'false', '--join', 'false', '--palette', 'false', '--instance', 'false']

      const textureStatus = runOptimize(pnpmCmd, textureArgs, env, opts.dryRun)
      if (textureStatus !== 0) {
        throw new Error(`Texture extraction failed (${textureStatus}) for ${sourcePath}`)
      }
      textureBundle = textureBundlePath
    }

    const outputBytes = opts.dryRun ? 0 : statSync(outPath).size
    report.push({
      source: toReportPath(sourcePath),
      output: toReportPath(outPath),
      textureBundle: textureBundle ? toReportPath(textureBundle) : null,
      animationPack,
      textureSize,
      sizeMBBefore: toMB(sourceStat.size),
      sizeMBAfter: toMB(outputBytes),
      ratio: opts.dryRun || sourceStat.size === 0 ? null : Number((outputBytes / sourceStat.size).toFixed(4)),
    })
  }

  const reportPath = path.join(opts.output, 'optimization-report.json')
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        options: {
          ...opts,
          source: toReportPath(opts.source),
          output: toReportPath(opts.output),
        },
        files: report,
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log(`\nDone. Wrote optimized assets to: ${opts.output}`)
  console.log(`Report: ${reportPath}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
