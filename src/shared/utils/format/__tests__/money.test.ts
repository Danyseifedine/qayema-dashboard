import { describe, expect, it } from 'vitest'
import { formatMoney, formatRate, invertRate, rateFor } from '@/shared/utils/format/money'

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

  it('keeps the plain-code fallback to two decimals', () => {
    expect(formatMoney(3.456, 'XX')).toBe('XX 3.46')
  })
})

describe('rateFor', () => {
  it('is 1 for the main currency, and the rate for the second', () => {
    expect(rateFor('LBP', 'LBP', '89000')).toBe(1)
    expect(rateFor('USD', 'LBP', '89000')).toBe(89000)
    expect(rateFor('LBP', 'USD', '0.0000112360')).toBeCloseTo(0.000011236)
  })

  it('is 1 when the server sent no rate', () => {
    expect(rateFor('USD', 'LBP', null)).toBe(1)
  })
})

describe('invertRate', () => {
  it('gives the inverse of a small rate only the digits it carries', () => {
    expect(invertRate(0.000011236)).toBe(89000)
    expect(invertRate(1 / 1507.25)).toBe(1507.25)
    expect(invertRate(0.92)).toBe(1.087)
  })

  it('keeps an inverse below 1 to 10 decimals, as the server does', () => {
    expect(invertRate(89000)).toBe(0.000011236)
    expect(invertRate(1)).toBe(1)
  })
})

describe('formatRate', () => {
  it('says the rate with the side worth more as the 1, whichever is the main', () => {
    expect(formatRate('LBP', 'USD', '89000.0000000000')).toBe('1 USD = 89,000 LBP')
    expect(formatRate('USD', 'LBP', '0.0000112360')).toBe('1 USD = 89,000 LBP')
    expect(formatRate('USD', 'EUR', '1.0850000000')).toBe('1 EUR = 1.085 USD')
  })
})
