/**
 * The two locales the product ships in. Translatable API fields arrive as
 * `{en, ar}` objects (see ../qayema/app/Http/Resources/SettingsResource.php),
 * so this list drives the locale tabs on translatable form fields.
 */
export const LOCALES = ['en', 'ar'] as const

export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
}

/** Short badge text for the locale tabs. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  ar: 'AR',
}

export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
}

/** A value that carries one string per locale. */
export type Translatable = Record<Locale, string>

export const emptyTranslatable = (): Translatable => ({ en: '', ar: '' })
