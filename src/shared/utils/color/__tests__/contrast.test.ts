import { describe, expect, it } from 'vitest'
import { contrast, MIN_CONTRAST } from '@/shared/utils/color/contrast'

describe('contrast', () => {
  it('is 21 between black and white', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('is 1 between a colour and itself', () => {
    expect(contrast('#C8A24A', '#C8A24A')).toBeCloseTo(1, 5)
  })

  it('does not depend on the order of the colours', () => {
    expect(contrast('#FFFFFF', '#777777')).toBeCloseTo(contrast('#777777', '#FFFFFF'), 10)
  })

  it('matches the WCAG reference values', () => {
    // #767676 on white is the classic "just passes AA" grey.
    expect(contrast('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
    // Pure red on white.
    expect(contrast('#FF0000', '#FFFFFF')).toBeCloseTo(4, 2)
  })

  it('uses the linear segment for very dark channels', () => {
    // 0x0A / 255 is below the 0.03928 knee, so it is divided by 12.92.
    const expected = (1 + 0.05) / ((10 / 255 / 12.92) * 1 + 0.05)
    expect(contrast('#0A0A0A', '#FFFFFF')).toBeCloseTo(expected, 8)
  })

  it('accepts lower-case hex', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('sets the warning bar at WCAG AA for body text', () => {
    expect(MIN_CONTRAST).toBe(4.5)
    expect(contrast('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast('#777777', '#FFFFFF')).toBeLessThan(MIN_CONTRAST)
  })
})
