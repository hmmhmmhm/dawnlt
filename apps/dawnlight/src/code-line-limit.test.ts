/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from '@jest/globals'

const MAX_CODE_LINES = 449

function collectCodeFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const info = statSync(path)
    if (info.isDirectory()) {
      result.push(...collectCodeFiles(path))
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      result.push(path)
    }
  }
  return result
}

describe('code file line limit', () => {
  it('keeps TypeScript source files under 450 lines', () => {
    const srcDir = join(process.cwd(), 'src')
    const oversized = collectCodeFiles(srcDir)
      .map((path) => ({
        path: relative(process.cwd(), path),
        lines: readFileSync(path, 'utf8').split('\n').length,
      }))
      .filter((file) => file.lines > MAX_CODE_LINES)

    expect(oversized).toEqual([])
  })
})
