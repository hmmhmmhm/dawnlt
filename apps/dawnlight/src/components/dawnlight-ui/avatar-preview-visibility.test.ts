import { describe, expect, it } from '@jest/globals'
import { shouldRenderAvatarPreviewPanel } from './avatar-preview-visibility'

describe('avatar preview visibility', () => {
  it('keeps the portrait panel disabled for gameplay', () => {
    expect(shouldRenderAvatarPreviewPanel(true)).toBe(false)
  })
})
