import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats a price in the given currency', () => {
    expect(formatMoney(12.5, 'USD')).toBe('$12.50')
  })

  it('never shows more than two decimals', () => {
    expect(formatMoney(7.12945, 'USD')).toBe('$7.13')
  })

  it('falls back to a plain code when the currency is not recognised', () => {
    expect(formatMoney(5, 'NOTACURRENCY')).toBe('NOTACURRENCY 5.00')
  })

  it('handles zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00')
  })
})
