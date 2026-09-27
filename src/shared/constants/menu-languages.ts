/**
 * What a restaurant's menu can be written in: English, always, plus at most
 * one second language the owner picks in Settings. Mirrors
 * `config('locales.menu')` in ../qayema.
 *
 * Separate from `locales.ts`, which is the dashboard's own interface language.
 * An owner can run the dashboard in English and write their menu in French.
 */

import { t } from '@/lib/i18n'

export const MAIN_LANGUAGE = 'en'

type LanguageInfo = {
  /** The language's own name for itself. */
  name: string
  /** Its name in English, for the dashboard. */
  english: string
  dir: 'ltr' | 'rtl'
}

export const MENU_LANGUAGES: Record<string, LanguageInfo> = {
  en: { name: 'English', english: 'English', dir: 'ltr' },
  ar: { name: 'العربية', english: 'Arabic', dir: 'rtl' },
  fr: { name: 'Français', english: 'French', dir: 'ltr' },
  es: { name: 'Español', english: 'Spanish', dir: 'ltr' },
  tr: { name: 'Türkçe', english: 'Turkish', dir: 'ltr' },
  de: { name: 'Deutsch', english: 'German', dir: 'ltr' },
  it: { name: 'Italiano', english: 'Italian', dir: 'ltr' },
  ru: { name: 'Русский', english: 'Russian', dir: 'ltr' },
  zh: { name: '中文', english: 'Chinese', dir: 'ltr' },
  hi: { name: 'हिन्दी', english: 'Hindi', dir: 'ltr' },
  pt: { name: 'Português', english: 'Portuguese', dir: 'ltr' },
}

/**
 * "French" (or "الفرنسية" when the dashboard is in Arabic), or the code itself
 * for a language the dashboard does not know yet.
 */
export function languageName(code: string): string {
  const info = MENU_LANGUAGES[code]
  if (!info) return code.toUpperCase()
  const names = t('menuLanguages', { returnObjects: true }) as Record<string, string | undefined>
  return names[code] ?? info.english
}

export function languageDir(code: string): 'ltr' | 'rtl' {
  return MENU_LANGUAGES[code]?.dir ?? 'ltr'
}
