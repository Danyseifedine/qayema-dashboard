import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * The dashboard's own words, in every language it speaks.
 *
 * Each language is a folder, `src/locales/<code>/`, found at build time:
 * `meta.json` names it and gives its direction, and one JSON file per area
 * (`common.json`, `menu.json`, …) holds the text. **Adding a language is
 * copying `src/locales/en/` to `src/locales/<code>/` and translating it** —
 * nothing here, nor anywhere else, has to change. Anything left untranslated
 * falls back to English, and `translations.test.ts` lists what is missing.
 */

export type LanguageMeta = {
  /** The language's own name for itself, shown in the switcher's title. */
  name: string
  /** What the switcher shows: "EN", "ع". */
  short: string
  dir: 'ltr' | 'rtl'
}

type Messages = Record<string, unknown>

const files = import.meta.glob<{ default: Messages }>('../../locales/*/*.json', { eager: true })

const resources: Record<string, Record<string, Messages>> = {}
const metas: Record<string, LanguageMeta> = {}

for (const [path, file] of Object.entries(files)) {
  const match = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path)
  if (!match) continue
  const [, code, namespace] = match as unknown as [string, string, string]

  if (namespace === 'meta') {
    metas[code] = file.default as unknown as LanguageMeta
  } else {
    ;(resources[code] ??= {})[namespace] = file.default
  }
}

export const FALLBACK_LANGUAGE = 'en'

/** Every language the dashboard can be shown in, English first. */
export const LANGUAGES: readonly string[] = Object.keys(metas).sort((a, b) =>
  a === FALLBACK_LANGUAGE ? -1 : b === FALLBACK_LANGUAGE ? 1 : a.localeCompare(b),
)

/** Every area's file, as English has them. */
export const NAMESPACES: readonly string[] = Object.keys(resources[FALLBACK_LANGUAGE] ?? {})

export function languageMeta(code: string): LanguageMeta {
  return metas[code] ?? { name: code, short: code.toUpperCase(), dir: 'ltr' }
}

/** The raw messages, for the test that checks every language is complete. */
export function messagesFor(code: string): Record<string, Messages> {
  return resources[code] ?? {}
}

void i18n.use(initReactI18next).init({
  resources,
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  ns: NAMESPACES as string[],
  defaultNS: 'common',
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
  returnNull: false,
})

export { i18n }

/** For code outside React (zod messages, toasts in hooks): the current language's text. */
export const t = i18n.t.bind(i18n)
