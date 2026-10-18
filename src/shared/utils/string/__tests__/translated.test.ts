import { describe, expect, it } from 'vitest'
import { translated } from '@/shared/utils/string/translated'

describe('translated', () => {
  it('uses the requested language when it has text', () => {
    expect(translated({ en: 'Soup', fr: 'Soupe' }, 'fr')).toEqual({
      text: 'Soupe',
      isFallback: false,
      missing: false,
      language: 'fr',
    })
  })

  it('trims the text it returns', () => {
    expect(translated({ en: '  Soup  ' }, 'en').text).toBe('Soup')
  })

  it('falls back to English when the requested language is blank', () => {
    expect(translated({ en: 'Soup', fr: '   ' }, 'fr')).toEqual({
      text: 'Soup',
      isFallback: true,
      missing: false,
      language: 'en',
    })
  })

  it('falls back to English when the requested language is absent or null', () => {
    expect(translated({ en: 'Soup', fr: null }, 'fr').language).toBe('en')
    expect(translated({ en: 'Soup' }, 'ar').language).toBe('en')
  })

  it('falls back to any other language when English is missing too', () => {
    expect(translated({ en: null, ar: undefined, fr: ' Soupe ' }, 'ar')).toEqual({
      text: 'Soupe',
      isFallback: true,
      missing: false,
      language: 'fr',
    })
  })

  it('reports missing text when no language has any', () => {
    expect(translated({ en: '', fr: null }, 'fr')).toEqual({
      text: '',
      isFallback: false,
      missing: true,
      language: null,
    })
    expect(translated({}, 'en').missing).toBe(true)
  })
})
