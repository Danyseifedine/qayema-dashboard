import { Toaster } from 'sonner'
import { LOCALE_DIR } from '@/shared/constants/locales'
import { usePreferencesStore } from '@/stores/preferences.store'

/**
 * Mounts the toaster.
 *
 * It sits in the top outer corner, which mirrors with the language: top right
 * in English, top left in Arabic. Colours come from the token layer, so it
 * follows the theme.
 */
export function ToastProvider() {
  const theme = usePreferencesStore((state) => state.theme)
  const locale = usePreferencesStore((state) => state.locale)

  return (
    <Toaster
      theme={theme}
      dir={LOCALE_DIR[locale]}
      position={locale === 'ar' ? 'top-left' : 'top-right'}
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '0.5px solid var(--line)',
          borderRadius: 'var(--radius-field)',
          fontFamily: 'var(--font-sans)',
        },
      }}
    />
  )
}
