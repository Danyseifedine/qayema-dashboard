import { MAIN_LANGUAGE } from '@/shared/constants/menu-languages'

/** Text in one or more languages, keyed by language code. */
export type TranslatableValue = Record<string, string | null | undefined>

/**
 * Picks the best available text for a language.
 *
 * Menu text is required in English and optional in the second language, so
 * English is the first fallback, then whatever else there is. The fallback is
 * reported so the UI can mark it.
 */
export function translated(
  value: TranslatableValue,
  locale: string,
): { text: string; isFallback: boolean; missing: boolean; language: string | null } {
  const preferred = value[locale]?.trim()
  if (preferred) return { text: preferred, isFallback: false, missing: false, language: locale }

  const fallback = [MAIN_LANGUAGE, ...Object.keys(value)].find((code) => value[code]?.trim())
  if (fallback) {
    return { text: value[fallback]!.trim(), isFallback: true, missing: false, language: fallback }
  }

  return { text: '', isFallback: false, missing: true, language: null }
}
