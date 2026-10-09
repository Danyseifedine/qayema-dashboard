/**
 * What a restaurant's menu can be written in: a main language the owner
 * picks (English unless they choose another), plus at most one second
 * language. Mirrors `config('locales.menu')` in ../qayema.
 *
 * Separate from `locales.ts`, which is the dashboard's own interface language.
 * An owner can run the dashboard in English and write their menu in French.
 */

import { t } from '@/lib/i18n'

/** A new menu's main language, and the one used before the session loads. */
export const DEFAULT_MAIN_LANGUAGE = 'en'

/**
 * The main language of a menu's languages: the first, as `/api/user` and
 * `useMenuLanguages()` give them. The one every name is required in.
 */
export function mainLanguageOf(languages: readonly string[]): string {
  return languages[0] ?? DEFAULT_MAIN_LANGUAGE
}

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
