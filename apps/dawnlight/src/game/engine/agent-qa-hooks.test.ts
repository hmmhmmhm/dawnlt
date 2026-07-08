declare const describe: any
declare const test: any
declare const expect: any

import { FARMING_DEMO_CLEAR_HEIGHT, FARMING_DEMO_CLEAR_MARGIN } from './agent-qa-config'

describe('agent QA farming demo clearance', () => {
  test('clears enough space around the demo field to avoid trunkless tree canopies in screenshots', () => {
    expect(FARMING_DEMO_CLEAR_HEIGHT).toBeGreaterThanOrEqual(24)
    expect(FARMING_DEMO_CLEAR_MARGIN).toBeGreaterThanOrEqual(18)
  })
})
