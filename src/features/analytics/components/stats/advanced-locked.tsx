import { IconTrendingUp } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useTurnedOff } from '@/features/auth'
import { TurnedOffNotice, usePackageFor } from '@/features/package'
import { LockedState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'

const INCLUDES = ['compare', 'busiest', 'taps', 'searches', 'funnel'] as const

export type AdvancedLockedProps = {
  locale: Locale
  onOpenPackage: () => void
}

/**
 * Where the advanced analytics would be, on a package without them, or the
 * notice that an admin turned them off for this restaurant.
 */
export function AdvancedLocked({ locale, onOpenPackage }: AdvancedLockedProps) {
  const { t } = useTranslation('analytics')
  const unlockedBy = usePackageFor('advanced_analytics', locale)
  const turnedOff = useTurnedOff('advanced_analytics')

  if (turnedOff) return <TurnedOffNotice flag="advanced_analytics" locale={locale} />

  return (
    <LockedState
      icon={IconTrendingUp}
      title={t('locked.title')}
      description={t('locked.description')}
      includes={INCLUDES.map((line) => t(`locked.includes.${line}`))}
      unlockedBy={unlockedBy ?? undefined}
      action={{ label: t('locked.cta'), onClick: onOpenPackage }}
    />
  )
}
