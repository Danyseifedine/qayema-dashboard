import { Segmented } from '@/shared/components/ui'
import { LOCALES, LOCALE_SHORT, type Locale } from '@/shared/constants/locales'

/** Stable empty default, so the prop does not change identity per render. */
const NONE: Locale[] = []

export type LocaleTabsProps = {
  value: Locale
  onChange: (locale: Locale) => void
  /** Locales whose value is still empty, marked with a dot. */
  incomplete?: Locale[]
  className?: string
}

/**
 * EN/AR switch above a translatable field. A dot marks a locale that has no
 * text yet, so an owner can see at a glance that the Arabic name is missing
 * without opening the tab.
 */
export function LocaleTabs({ value, onChange, incomplete = NONE, className }: LocaleTabsProps) {
  return (
    <Segmented
      aria-label="Content language"
      size="sm"
      value={value}
      onChange={onChange}
      className={className}
      options={LOCALES.map((locale) => ({
        value: locale,
        label: LOCALE_SHORT[locale],
        badge: incomplete.includes(locale) ? '•' : undefined,
      }))}
    />
  )
}
