import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/components/ui'
import { languageName } from '@/shared/constants/menu-languages'

/** Stable empty default, so the prop does not change identity per render. */
const NONE: string[] = []

export type LocaleTabsProps = {
  /** The menu's languages, English first. */
  languages: readonly string[]
  value: string
  onChange: (language: string) => void
  /** Languages whose value is still empty or invalid, marked with a dot. */
  incomplete?: string[]
  className?: string
}

/**
 * One tab per menu language above a translatable field. A dot marks a
 * language that still needs attention, so an owner can see at a glance that
 * the French name is missing without opening the tab.
 */
export function LocaleTabs({
  languages,
  value,
  onChange,
  incomplete = NONE,
  className,
}: LocaleTabsProps) {
  const { t } = useTranslation()

  return (
    <Segmented
      aria-label={t('localeTabs.label')}
      size="sm"
      value={value}
      onChange={onChange}
      className={className}
      options={languages.map((code) => ({
        value: code,
        label: code.toUpperCase(),
        title: languageName(code),
        badge: incomplete.includes(code) ? '•' : undefined,
      }))}
    />
  )
}
