import { describe, expect, it } from 'vitest'
import { formatNumber } from '@/shared/utils/format/number'

describe('formatNumber', () => {
  it('groups thousands in English', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567')
  })

  it('keeps Western digits in Arabic', () => {
    const text = formatNumber(1234567, 'ar')

    expect(text).toMatch(/^1\D?234\D?567$/)
    expect(text).not.toMatch(/[٠-٩]/)
  })

  it('leaves small numbers and zero alone', () => {
    expect(formatNumber(0, 'en')).toBe('0')
    expect(formatNumber(42, 'ar')).toBe('42')
  })

  it('ignores the browser language', () => {
    // A German browser would write "1.234"; the reader chose English.
    expect(formatNumber(1234, 'en')).toBe('1,234')
  })
})
