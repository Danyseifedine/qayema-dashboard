import { useTranslation } from 'react-i18next'
import { LimitBadge, StatTile } from '@/shared/components/data-display'
import type { AuthRestaurant } from '@/features/auth'
type Limits = AuthRestaurant['limits']

const ITEMS: { key: keyof Limits; label: 'dishes' | 'categories' | 'socialLinks' }[] = [
  { key: 'dishes', label: 'dishes' },
  { key: 'categories', label: 'categories' },
  { key: 'social_links', label: 'socialLinks' },
]

/** How much is on the menu, each against what the package allows. */
export function ContentCounts({ limits }: { limits: Limits }) {
  const { t } = useTranslation('overview')

  return (
    <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {ITEMS.map(({ key, label }) => {
        const { used, limit } = limits[key]
        return (
          <StatTile
            key={key}
            label={t(`counts.${label}`)}
            value={used.toLocaleString()}
            hint={
              limit === null ? (
                t('counts.noLimit')
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <LimitBadge used={used} limit={limit} />
                  {t('counts.onYourPackage')}
                </span>
              )
            }
          />
        )
      })}
    </dl>
  )
}
