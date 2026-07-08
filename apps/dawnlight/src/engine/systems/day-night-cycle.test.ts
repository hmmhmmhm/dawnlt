import { describe, expect, it } from '@jest/globals'
import { getRandomStartingGameTime } from './day-night-cycle'

describe('getRandomStartingGameTime', () => {
  it('can pick a daytime start', () => {
    const time = getRandomStartingGameTime(sequence(0.1, 0.5))

    expect(time).toBe(720)
  })

  it('can pick an evening start', () => {
    const time = getRandomStartingGameTime(sequence(0.4, 0.5))

    expect(time).toBe(1080)
  })

  it('can pick a night start across midnight', () => {
    const time = getRandomStartingGameTime(sequence(0.8, 0.5))

    expect(time).toBe(30)
  })
})

function sequence(...values: number[]): () => number {
  let index = 0
  return () => values[index++] ?? values[values.length - 1]
}
