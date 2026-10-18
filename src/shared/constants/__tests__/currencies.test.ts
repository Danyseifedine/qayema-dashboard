import { describe, expect, it } from 'vitest'
import { CURRENCIES, CURRENCY_OPTIONS } from '@/shared/constants/currencies'

describe('currencies', () => {
  it('lists each ISO-4217 code once', () => {
    const codes = CURRENCIES.map((currency) => currency.code)

    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(code).toMatch(/^[A-Z]{3}$/)
  })

  it('offers every currency to the picker, searchable by code or name', () => {
    expect(CURRENCY_OPTIONS).toHaveLength(CURRENCIES.length)
    expect(CURRENCY_OPTIONS[0]).toEqual({ value: 'USD', label: 'USD', description: 'US Dollar' })
    expect(CURRENCY_OPTIONS.find((option) => option.value === 'LBP')?.description).toMatch(
      /Lebanese/,
    )
  })
})
