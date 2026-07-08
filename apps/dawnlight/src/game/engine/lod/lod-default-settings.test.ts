import { describe, expect, it } from '@jest/globals'
import { ENABLE_FAR_LOD } from '../../../constants'

describe('LOD default settings', () => {
  it('keeps far LOD disabled by default', () => {
    expect(ENABLE_FAR_LOD).toBe(false)
  })
})
