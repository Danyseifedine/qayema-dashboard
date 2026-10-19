import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * The dashboard's own words, in every language it speaks.
 *
 * Each language is a folder, `src/locales/<code>/`, found at build time:
 * `meta.json` names it and gives its direction, and one JSON file per area
 * (`common.json`, `menu.json`, …) holds the text. **Adding a language is
 * copying `src/locales/en/` to `src/locales/<code>/` and translating it**;
 * nothing here, nor anywhere else, has to change. Anything left untranslated
 * falls back to English, and `translations.test.ts` lists what is missing.
 */

type LanguageMeta = {
  /** The language's own name for itself, shown in the switcher's title. */
  name: string
  /** What the switcher shows: "EN", "ع". */
  short: string
  dir: 'ltr' | 'rtl'
}

type Messages = Record<string, unknown>

export const FALLBACK_LANGUAGE = 'en'

/**
 * English is built in: it is the fallback for anything untranslated, so it
 * is always needed. Every other language downloads the first time it is
 * chosen (`setLanguage`), so the first download carries one language, not
 * all of them. Each language's meta file is small and always built in, for
 * the switcher.
 */
const english = import.meta.glob<{ default: Messages }>(
  ['../../locales/en/*.json', '!../../locales/en/meta.json'],
  { eager: true },
)
const others = import.meta.glob<{ default: Messages }>([
  '../../locales/*/*.json',
  '!../../locales/en/*.json',
  '!../../locales/*/meta.json',
])
const metaFiles = import.meta.glob<{ default: LanguageMeta }>('../../locales/*/meta.json', {
  eager: true,
})

const resources: Record<string, Record<string, Messages>> = { [FALLBACK_LANGUAGE]: {} }
const metas: Record<string, LanguageMeta> = {}

/** The language and area a locale file holds, from its path (`locales/ar/menu.json`). */
function fileOf(path: string): [code: string, namespace: string] {
  const [, code, namespace] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path)!
  return [code!, namespace!]
}

for (const [path, file] of Object.entries(metaFiles)) {
  const [code] = fileOf(path)
  metas[code] = file.default
}

for (const [path, file] of Object.entries(english)) {
  const [, namespace] = fileOf(path)
  resources[FALLBACK_LANGUAGE]![namespace] = file.default
}

/** Every language the dashboard can be shown in, English first. */
export const LANGUAGES: readonly string[] = Object.keys(metas).sort((a, b) =>
  a === FALLBACK_LANGUAGE ? -1 : b === FALLBACK_LANGUAGE ? 1 : a.localeCompare(b),
)

/** Every area's file, as English has them. */
export const NAMESPACES: readonly string[] = Object.keys(resources[FALLBACK_LANGUAGE] ?? {})

export function languageMeta(code: string): LanguageMeta {
  return metas[code] ?? { name: code, short: code.toUpperCase(), dir: 'ltr' }
}

/** The raw messages of a loaded language, for the test that checks every language is complete. */
export function messagesFor(code: string): Record<string, Messages> {
  return resources[code] ?? {}
}

const loading: Record<string, Promise<void>> = {}

/** Downloads a language's text once, and hands it to i18next. */
export function loadLanguage(code: string): Promise<void> {
  if (resources[code]) return Promise.resolve()

  loading[code] ??= Promise.all(
    Object.entries(others)
      .filter(([path]) => fileOf(path)[0] === code)
      .map(async ([path, load]) => {
        const [, namespace] = fileOf(path)
        const messages = (await load()).default
        i18n.addResourceBundle(code, namespace, messages, true, true)
        return [namespace, messages] as const
      }),
  )
    .then((files) => {
      resources[code] = Object.fromEntries(files)
    })
    .finally(() => {
      delete loading[code]
    })

  return loading[code]
}

let switching: Promise<unknown> = Promise.resolve()

/**
 * Shows the dashboard in another language once its text is here. A language
 * that cannot be downloaded (the connection dropped) leaves the text in the
 * one on screen.
 */
export function setLanguage(code: string): Promise<unknown> {
  switching = loadLanguage(code).then(
    () => i18n.changeLanguage(code),
    () => undefined,
  )
  return switching
}

/** Settles once the language last asked for is on screen (or failed to load). */
export function languageReady(): Promise<unknown> {
  return switching
}

void i18n.use(initReactI18next).init({
  resources,
  // Other languages arrive later (loadLanguage), never all at once.
  partialBundledLanguages: true,
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
