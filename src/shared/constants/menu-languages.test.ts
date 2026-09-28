import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/lib/i18n'
import {
  languageDir,
  languageName,
  MAIN_LANGUAGE,
  MENU_LANGUAGES,
} from '@/shared/constants/menu-languages'

describe('menu languages', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('writes every menu in English first', () => {
    expect(MAIN_LANGUAGE).toBe('en')
    expect(MENU_LANGUAGES[MAIN_LANGUAGE]?.dir).toBe('ltr')
  })

  it('names a known language in the dashboard’s language', async () => {
    expect(languageName('fr')).toBe('French')

    await i18n.changeLanguage('ar')
    expect(languageName('fr')).not.toBe('French')
  })

  it('falls back to the English name when the copy has none', () => {
    // A language on the list that no translation file names yet.
    MENU_LANGUAGES.nb = { name: 'Norsk', english: 'Norwegian', dir: 'ltr' }
    try {
      expect(languageName('nb')).toBe('Norwegian')
    } finally {
      delete MENU_LANGUAGES.nb
    }
  })

  it('shows the code itself for a language it does not know', () => {
    expect(languageName('sw')).toBe('SW')
  })

  it('knows which way each menu language reads', () => {
    expect(languageDir('ar')).toBe('rtl')
    expect(languageDir('fr')).toBe('ltr')
    expect(languageDir('sw')).toBe('ltr')
  })
})
