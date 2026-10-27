import { useTranslation } from 'react-i18next'
import { PageSwitch } from '@/shared/components/ui'

type MenuSwitchProps = {
  /** The page it sits on. */
  value: 'dishes' | 'categories'
  /** Opens the other one. */
  onOpen: () => void
}

/** Dishes and Categories side by side at the top of both: the Menu tab holds the two. */
export function MenuSwitch({ value, onOpen }: MenuSwitchProps) {
  const { t } = useTranslation()

  return (
    <PageSwitch
      label={t('nav.menu')}
      value={value}
      options={[
        { value: 'dishes', label: t('nav.dishes') },
        { value: 'categories', label: t('nav.categories') },
      ]}
      onOpen={onOpen}
    />
  )
}
