import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_LANGUAGE,
  LANGUAGES,
  i18n,
  languageMeta,
  languageReady,
  loadLanguage,
  messagesFor,
  setLanguage,
  t,
} from '@/lib/i18n'

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

  it('switches language once its text is here, and says when it is on screen', async () => {
    const switching = setLanguage('ar')
    expect(languageReady()).toBe(switching)

    await languageReady()
    try {
      expect(i18n.language).toBe('ar')
      expect(t('nav.overview')).not.toBe('Overview')
    } finally {
      await setLanguage('en')
    }
    expect(t('nav.overview')).toBe('Overview')
  })
})

/**
 * A fresh copy of the module, as a first visit has it: English only, every
 * other language still to download.
 */
async function freshI18n() {
  vi.resetModules()
  return import('@/lib/i18n')
}

describe('i18n, downloading a language', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    await i18n.changeLanguage('en')
  })

  it('starts with English only, and downloads another language once', async () => {
    const fresh = await freshI18n()
    expect(fresh.messagesFor('en')).toHaveProperty('common')
    expect(fresh.messagesFor('ar')).toEqual({})

    const first = fresh.loadLanguage('ar')
    expect(fresh.loadLanguage('ar')).toBe(first)
    await first

    expect(Object.keys(fresh.messagesFor('ar')).sort()).toEqual(
      Object.keys(fresh.messagesFor('en')).sort(),
    )
    await expect(fresh.loadLanguage('ar')).resolves.toBeUndefined()
    await expect(loadLanguage(FALLBACK_LANGUAGE)).resolves.toBeUndefined()
  })

  it('keeps the language on screen when another cannot be downloaded', async () => {
    const fresh = await freshI18n()
    vi.spyOn(fresh.i18n, 'addResourceBundle').mockImplementation(() => {
      throw new Error('Failed to fetch dynamically imported module')
    })

    await expect(fresh.setLanguage('ar')).resolves.toBeUndefined()
    expect(fresh.i18n.language).toBe('en')
    expect(fresh.messagesFor('ar')).toEqual({})
  })
})
