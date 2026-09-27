import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/components/ui'
import { LOCALES, localeLabel, localeShort, type Locale } from '@/shared/constants/locales'

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
  const { t } = useTranslation()

  return (
    <Segmented
      aria-label={t('languageSwitcher.label')}
      size="sm"
      value={value}
      onChange={onChange}
      className={className}
      options={LOCALES.map((locale) => ({
        value: locale,
        label: localeShort(locale),
        title: localeLabel(locale),
      }))}
    />
  )
}
