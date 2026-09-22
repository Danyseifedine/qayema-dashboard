import { Segmented } from '@/shared/components/ui'
import { LOCALES, LOCALE_SHORT, type Locale } from '@/shared/constants/locales'

export type LanguageSwitcherProps = {
  value: Locale
  onChange: (locale: Locale) => void
  className?: string
}

/**
 * EN / ع switch, matching the portal navbar's `.seg.lang`. Arabic shows its
 * own glyph rather than a transliteration.
 */
export function LanguageSwitcher({ value, onChange, className }: LanguageSwitcherProps) {
  return (
    <Segmented
      aria-label="Interface language"
      size="sm"
      value={value}
      onChange={onChange}
      className={className}
      options={LOCALES.map((locale) => ({
        value: locale,
        label: locale === 'ar' ? 'ع' : LOCALE_SHORT[locale],
      }))}
    />
  )
}
