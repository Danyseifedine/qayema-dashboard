import { describe, expect, it } from 'vitest'
import { FALLBACK_LANGUAGE, LANGUAGES, i18n, languageMeta, messagesFor, t } from '@/lib/i18n'

describe('i18n', () => {
  it('lists English first', () => {
    expect(LANGUAGES[0]).toBe(FALLBACK_LANGUAGE)
    expect(LANGUAGES).toContain('ar')
  })

  it('reads each language from its meta file', () => {
    expect(languageMeta('ar')).toEqual({ name: 'العربية', short: 'ع', dir: 'rtl' })
    expect(languageMeta('en').dir).toBe('ltr')
  })

  it('describes an unknown language by its code, left to right', () => {
    expect(languageMeta('xx')).toEqual({ name: 'xx', short: 'XX', dir: 'ltr' })
  })

  it('has no messages for an unknown language', () => {
    expect(messagesFor('xx')).toEqual({})
    expect(Object.keys(messagesFor('en'))).toContain('common')
  })

  it('translates outside React in the current language', async () => {
    expect(t('nav.overview')).toBe('Overview')

    await i18n.changeLanguage('ar')
    try {
      expect(t('nav.overview')).not.toBe('Overview')
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
