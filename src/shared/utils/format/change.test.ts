import { describe, expect, it } from 'vitest'
import { changeBetween } from './change'

describe('changeBetween', () => {
  it('is the change as a fraction of what came before', () => {
    expect(changeBetween(12, 10)).toBeCloseTo(0.2)
    expect(changeBetween(5, 10)).toBeCloseTo(-0.5)
  })

  it('has no percentage for growth from nothing', () => {
    expect(changeBetween(4, 0)).toBeNull()
  })

  it('calls nothing to nothing no change', () => {
    expect(changeBetween(0, 0)).toBe(0)
  })
})
