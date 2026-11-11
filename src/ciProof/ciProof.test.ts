import { describe, expect, it } from 'vitest'

describe('ci red proof', () => {
  it('fails on purpose to prove the merge is blocked', () => {
    const sum = 1 + 1

    expect(sum).toBe(3)
  })
})
