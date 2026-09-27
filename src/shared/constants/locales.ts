import { LANGUAGES, languageMeta } from '@/lib/i18n'

/**
 * The dashboard's own interface languages: one per folder in `src/locales/`
 * (see `lib/i18n`). The languages a *menu* is written in are a separate list,
 * per restaurant — see `menu-languages.ts`.
 */
export const LOCALES = LANGUAGES

/** A language the dashboard can be shown in, by its code ("en", "ar"). */
export type Locale = string

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value)
}

/** The language's own name for itself: "English", "العربية". */
export function localeLabel(locale: Locale): string {
  return languageMeta(locale).name
}

/** What the language switcher shows: "EN", "ع". */
export function localeShort(locale: Locale): string {
  return languageMeta(locale).short
}

export function localeDir(locale: Locale): 'ltr' | 'rtl' {
  return languageMeta(locale).dir
}
