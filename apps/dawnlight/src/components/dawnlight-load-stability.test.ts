/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from '@jest/globals'

describe('dawnlight loading stability', () => {
  it('keeps the engine screenshot callback stable at the component boundary', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/dawnlight.tsx'), 'utf8')

    expect(source).toContain('const handleEngineCaptureScreenshot = useCallback')
    expect(source).toContain('onCaptureScreenshot: handleEngineCaptureScreenshot')
    expect(source).not.toContain('onCaptureScreenshot: () =>')
  })

  it('keeps engine initialization isolated behind one effect cleanup boundary', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/dawnlight-effects.ts'), 'utf8')

    expect(source).toContain('export function initializeEngineRuntime')
    expect(source).toContain('return initializeEngineRuntime(args)')
    expect(source).toContain('chunkSystem.loadInitialChunks().catch')
    expect(source).toContain('animationLoop.stop()')
    expect(source).toContain('inputSystem.dispose()')
    expect(source).toContain('engine.dispose()')
  })
})
