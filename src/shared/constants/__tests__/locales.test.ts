import { describe, expect, it } from 'vitest'
import { isLocale, localeDir, localeLabel, LOCALES, localeShort } from '@/shared/constants/locales'

describe('locales', () => {
  it('lists every interface language, English first', () => {
    expect(LOCALES[0]).toBe('en')
    expect(LOCALES).toContain('ar')
  })

  it('recognises only a known language code', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('xx')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(1)).toBe(false)
  })

  it('names each language in itself', () => {
    expect(localeLabel('en')).toBe('English')
    expect(localeLabel('ar')).toBe('العربية')
  })

  it('gives the switcher’s short label', () => {
    expect(localeShort('en')).toBe('EN')
    expect(localeShort('ar')).toBe('ع')
  })

  it('knows which way each language reads', () => {
    expect(localeDir('en')).toBe('ltr')
    expect(localeDir('ar')).toBe('rtl')
  })

  it('falls back to the code for a language without a folder', () => {
    expect(localeLabel('xx')).toBe('xx')
    expect(localeShort('xx')).toBe('XX')
    expect(localeDir('xx')).toBe('ltr')
  })
})
