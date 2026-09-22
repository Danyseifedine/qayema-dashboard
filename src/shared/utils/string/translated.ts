import type { Locale } from '@/shared/constants/locales'

export type TranslatableValue = { en: string | null; ar: string | null }

/**
 * Picks the best available text for the current language.
 *
 * A dish may be named in Arabic only, or in English only, so falling back to
 * the other locale is better than showing an empty card. The fallback is
 * reported so the UI can mark it.
 */
export function translated(
  value: TranslatableValue,
  locale: Locale,
): { text: string; isFallback: boolean; missing: boolean } {
  const preferred = value[locale]?.trim()
  if (preferred) return { text: preferred, isFallback: false, missing: false }

  const other = value[locale === 'en' ? 'ar' : 'en']?.trim()
  if (other) return { text: other, isFallback: true, missing: false }

  return { text: '', isFallback: false, missing: true }
}
