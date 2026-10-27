import { describe, expect, it } from 'vitest'
import { isAtLimit } from '@/shared/utils/limits/is-at-limit'

describe('isAtLimit', () => {
  it('is at its limit only once a real limit is used up', () => {
    expect(isAtLimit(undefined)).toBe(false)
    expect(isAtLimit({ used: 99, limit: null })).toBe(false)
    expect(isAtLimit({ used: 1, limit: 2 })).toBe(false)
    expect(isAtLimit({ used: 2, limit: 2 })).toBe(true)
    expect(isAtLimit({ used: 0, limit: 0 })).toBe(true)
  })
})
