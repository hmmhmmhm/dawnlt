import { describe, expect, it } from '@jest/globals'
import { DEFAULT_CAMERA_MODE } from './camera-mode'

describe('camera mode defaults', () => {
  it('starts the game in first-person view', () => {
    expect(DEFAULT_CAMERA_MODE).toBe('first-person')
  })
})
