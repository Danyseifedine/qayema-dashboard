import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/components/ui'
import { languageName } from '@/shared/constants/menu-languages'

export type LocaleTabsProps = {
  /** The menu's languages, English first. */
  languages: readonly string[]
  value: string
  onChange: (language: string) => void
  /** Languages whose value is still empty or invalid, marked with a dot. */
  incomplete: string[]
}

/**
 * One tab per menu language above a translatable field. A dot marks a
 * language that still needs attention, so an owner can see at a glance that
 * the French name is missing without opening the tab.
 */
export function LocaleTabs({ languages, value, onChange, incomplete }: LocaleTabsProps) {
  const { t } = useTranslation()

  return (
    <Segmented
      aria-label={t('localeTabs.label')}
      size="sm"
      value={value}
      onChange={onChange}
      options={languages.map((code) => ({
        value: code,
        label: code.toUpperCase(),
        title: languageName(code),
        badge: incomplete.includes(code) ? '•' : undefined,
      }))}
    />
  )
}
