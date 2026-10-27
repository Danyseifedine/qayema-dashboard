/** Text in one or more languages, keyed by language code. */
export type TranslatableValue = Record<string, string | null | undefined>

/**
 * Picks the best available text for a language.
 *
 * Menu text is required in the menu's main language and optional in the
 * second, and the API sends the main one first, so the fallback is the first
 * language that has text, in that order. Platform content (`{en, ar}`) falls
 * back to English the same way. The fallback is reported so the UI can mark it.
 */
export function translated(
  value: TranslatableValue,
  locale: string,
): { text: string; isFallback: boolean; missing: boolean; language: string | null } {
  const preferred = value[locale]?.trim()
  if (preferred) return { text: preferred, isFallback: false, missing: false, language: locale }

  const fallback = Object.keys(value).find((code) => value[code]?.trim())
  if (fallback) {
    return { text: value[fallback]!.trim(), isFallback: true, missing: false, language: fallback }
  }

  return { text: '', isFallback: false, missing: true, language: null }
}

/** The text for a language, or `fallback` (a slug, "Untitled") when it has none in any. */
export function nameOr(value: TranslatableValue, locale: string, fallback: string): string {
  const name = translated(value, locale)
  return name.missing ? fallback : name.text
}
