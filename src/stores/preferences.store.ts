import { create } from 'zustand'
import { setLanguage } from '@/lib/i18n'
import { isLocale, localeDir, type Locale } from '@/shared/constants/locales'

const LOCALE_KEY = 'qayema.dashboard.locale.v1'

function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // Blocked site data simply loses the preference.
  }
}

/**
 * Keeps <html lang/dir> in step, which every logical style depends on, and
 * switches the text the dashboard shows.
 */
function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale
  document.documentElement.dir = localeDir(locale)
  void setLanguage(locale)
}

type PreferencesState = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  locale: readStoredLocale() ?? 'en',
  setLocale: (locale) => {
    applyLocale(locale)
    persistLocale(locale)
    set({ locale })
  },
}))

// Apply once at module load so the first paint already matches.
applyLocale(usePreferencesStore.getState().locale)
