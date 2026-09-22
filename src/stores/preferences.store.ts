import { create } from 'zustand'
import { LOCALE_DIR, type Locale } from '@/shared/constants/locales'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'qayema.dashboard.theme.v1'
const LOCALE_KEY = 'qayema.dashboard.locale.v1'

/** Reads the stored theme, tolerating private mode and blocked storage. */
function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // A viewer with site data blocked simply loses the preference.
  }
}

/** Mirrors the choice onto <html>, which is what the token layer switches on. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

function initialTheme(): Theme {
  const stored = readStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_KEY)
    return value === 'en' || value === 'ar' ? value : null
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

/** Keeps <html lang/dir> in step, which every logical style depends on. */
function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale
  document.documentElement.dir = LOCALE_DIR[locale]
}

type PreferencesState = {
  theme: Theme
  locale: Locale
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLocale: (locale: Locale) => void
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  theme: initialTheme(),
  locale: readStoredLocale() ?? 'en',
  setTheme: (theme) => {
    applyTheme(theme)
    persistTheme(theme)
    set({ theme })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  setLocale: (locale) => {
    applyLocale(locale)
    persistLocale(locale)
    set({ locale })
  },
}))

// Apply once at module load so the first paint already matches.
applyTheme(usePreferencesStore.getState().theme)
applyLocale(usePreferencesStore.getState().locale)
