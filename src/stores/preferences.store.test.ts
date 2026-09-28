import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/lib/i18n'

const THEME_KEY = 'qayema.dashboard.theme.v1'
const LOCALE_KEY = 'qayema.dashboard.locale.v1'

// The store reads storage and applies itself when the module loads, so each
// case loads it fresh.
async function loadStore() {
  vi.resetModules()
  const { usePreferencesStore } = await import('@/stores/preferences.store')
  return usePreferencesStore
}

function prefersDark(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches, media: query }) as MediaQueryList),
  )
}

const html = document.documentElement

describe('usePreferencesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    prefersDark(false)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    delete html.dataset.theme
    html.lang = 'en'
    html.dir = 'ltr'
    await i18n.changeLanguage('en')
  })

  it('follows the system theme when nothing is stored', async () => {
    prefersDark(true)
    let store = await loadStore()
    expect(store.getState().theme).toBe('dark')
    expect(html.dataset.theme).toBe('dark')

    prefersDark(false)
    store = await loadStore()
    expect(store.getState().theme).toBe('light')
    expect(html.dataset.theme).toBe('light')
  })

  it('prefers a stored theme over the system, and ignores a stored oddity', async () => {
    prefersDark(true)
    localStorage.setItem(THEME_KEY, 'light')
    expect((await loadStore()).getState().theme).toBe('light')

    prefersDark(false)
    localStorage.setItem(THEME_KEY, 'dark')
    expect((await loadStore()).getState().theme).toBe('dark')

    localStorage.setItem(THEME_KEY, 'sepia')
    expect((await loadStore()).getState().theme).toBe('light')
  })

  it('sets and remembers the theme on <html>', async () => {
    const store = await loadStore()

    store.getState().setTheme('dark')
    expect(html.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')

    store.getState().setTheme('light')
    expect(store.getState().theme).toBe('light')
    expect(html.dataset.theme).toBe('light')
  })

  it('starts in English, left to right, with nothing stored', async () => {
    const store = await loadStore()

    expect(store.getState().locale).toBe('en')
    expect(html.lang).toBe('en')
    expect(html.dir).toBe('ltr')
  })

  it('opens in a stored language, and ignores one it does not speak', async () => {
    localStorage.setItem(LOCALE_KEY, 'ar')
    const store = await loadStore()

    expect(store.getState().locale).toBe('ar')
    expect(html.lang).toBe('ar')
    expect(html.dir).toBe('rtl')

    localStorage.setItem(LOCALE_KEY, 'xx')
    expect((await loadStore()).getState().locale).toBe('en')
  })

  it('switches the language, direction and text, and remembers it', async () => {
    const store = await loadStore()
    const { i18n: loaded } = await import('@/lib/i18n')

    store.getState().setLocale('ar')

    expect(store.getState().locale).toBe('ar')
    expect(html.lang).toBe('ar')
    expect(html.dir).toBe('rtl')
    expect(localStorage.getItem(LOCALE_KEY)).toBe('ar')
    await vi.waitFor(() => expect(loaded.language).toBe('ar'))

    store.getState().setLocale('en')
    expect(html.dir).toBe('ltr')
    await loaded.changeLanguage('en')
  })

  it('works, without remembering, when storage is blocked', async () => {
    prefersDark(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    const store = await loadStore()
    expect(store.getState().theme).toBe('dark')
    expect(store.getState().locale).toBe('en')

    expect(() => store.getState().setTheme('light')).not.toThrow()
    expect(() => store.getState().setLocale('ar')).not.toThrow()
    expect(store.getState().theme).toBe('light')
    expect(store.getState().locale).toBe('ar')
    expect(setItem).toHaveBeenCalled()
  })
})
