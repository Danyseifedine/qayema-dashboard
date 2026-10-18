import { describe, expect, it } from 'vitest'
import { formatMoney } from '@/shared/utils/format/money'

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

  it('formats for an English reader whatever other code is passed', () => {
    // Anything but Arabic uses the en-US format.
    expect(formatMoney(12.5, 'USD', 'fr')).toBe('$12.50')
    expect(formatMoney(12.5, 'USD', 'en')).toBe('$12.50')
  })

  it('uses Arabic numerals for an Arabic reader', () => {
    const text = formatMoney(12.5, 'USD', 'ar')

    expect(text).not.toBe('$12.50')
    // Arabic-Indic digits for 1 and 2.
    expect(text).toMatch(/[١٢]/)
  })

  it('keeps the plain-code fallback in Arabic too', () => {
    expect(formatMoney(3.456, 'XX', 'ar')).toBe('XX 3.46')
  })
})
