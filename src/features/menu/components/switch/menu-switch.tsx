import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/components/ui'

export type MenuSwitchProps = {
  /** The page it sits on. */
  value: 'dishes' | 'categories'
  /** Opens the other one. */
  onChange: (page: 'dishes' | 'categories') => void
}

/**
 * Dishes and Categories side by side at the top of both pages, on a phone:
 * the Menu tab holds the two, so neither needs a trip through More. A wider
 * screen has both in the sidebar and does without it.
 */
export function MenuSwitch({ value, onChange }: MenuSwitchProps) {
  const { t } = useTranslation()

  return (
    <div className="lg:hidden">
      <Segmented
        block
        aria-label={t('nav.menu')}
        value={value}
        onChange={onChange}
        options={[
          { value: 'dishes', label: t('nav.dishes') },
          { value: 'categories', label: t('nav.categories') },
        ]}
      />
    </div>
  )
}
