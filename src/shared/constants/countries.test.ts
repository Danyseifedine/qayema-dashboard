import { describe, expect, it } from 'vitest'
import { t } from '@/lib/i18n'
import { COUNTRIES } from '@/shared/constants/countries'

describe('COUNTRIES', () => {
  it('lists each ISO-3166 code once, with a dial code', () => {
    const codes = COUNTRIES.map((country) => country.code)

    expect(new Set(codes).size).toBe(codes.length)
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/)
      expect(country.dial).toMatch(/^\+\d+$/)
    }
  })

  it('has a translated name for every country', () => {
    const names = t('countries', { returnObjects: true }) as Record<string, string>

    for (const country of COUNTRIES) {
      expect(names[country.code]).toBe(country.label)
    }
  })
})
