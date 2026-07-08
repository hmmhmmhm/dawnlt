import { describe, expect, it } from '@jest/globals'
import { BlockType } from '../types'
import { shouldRenderHeldBasketPreview } from './held-basket-preview-visibility'

describe('held basket preview visibility', () => {
  it('keeps the right-hand basket preview disabled', () => {
    expect(
      shouldRenderHeldBasketPreview({
        type: BlockType.BASKET,
        count: 1,
        storedType: BlockType.APPLE,
        storedCount: 4,
      }),
    ).toBe(false)
  })
})
