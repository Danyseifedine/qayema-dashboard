import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/lib/i18n'

const LOCALE_KEY = 'qayema.dashboard.locale.v1'

// The store reads storage and applies itself when the module loads, so each
// case loads it fresh.
async function loadStore() {
  vi.resetModules()
  const { usePreferencesStore } = await import('@/stores/preferences.store')
  return usePreferencesStore
}

const html = document.documentElement

describe('usePreferencesStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    html.lang = 'en'
    html.dir = 'ltr'
    await i18n.changeLanguage('en')
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
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    const store = await loadStore()
    expect(store.getState().locale).toBe('en')

    expect(() => store.getState().setLocale('ar')).not.toThrow()
    expect(store.getState().locale).toBe('ar')
    expect(setItem).toHaveBeenCalled()
  })
})
