import { IconWorldOff } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import type { AuthRestaurant } from '@/features/auth'
import { LockedState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { formatDate } from '@/shared/utils/format/date'
import { nameOr } from '@/shared/utils/string/translated'

/** What renewing brings back, one line each, in common.json. */
const COMES_BACK = ['one', 'two', 'three'] as const

type Lapsed = NonNullable<AuthRestaurant['lapsed']>

export type MenuOfflineProps = {
  lapsed: Lapsed
  locale: Locale
  onOpenPackage: () => void
}

function useEnded(lapsed: Lapsed, locale: Locale) {
  return {
    name: nameOr(lapsed.name, locale, lapsed.slug ?? ''),
    date: lapsed.ended_at ? formatDate(lapsed.ended_at, locale) : '',
    offline: lapsed.offline_at ? formatDate(lapsed.offline_at, locale) : '',
  }
}

/**
 * Every page but Package and Account once the package ended and its grace
 * days passed: guests cannot open the menu, nothing is lost, and the way to
 * ask for it back.
 */
export function MenuOfflinePage({ lapsed, locale, onOpenPackage }: MenuOfflineProps) {
  const { t } = useTranslation()
  const ended = useEnded(lapsed, locale)

  return (
    <LockedState
      icon={IconWorldOff}
      title={t('menuOffline.title')}
      description={t('menuOffline.body', { name: ended.name, date: ended.date })}
      includes={COMES_BACK.map((line) => t(`menuOffline.comesBack.${line}`))}
      action={{ label: t('menuOffline.renew'), onClick: onOpenPackage }}
    />
  )
}

/** Above every page in the grace days: when the menu goes offline, and the way to renew. */
export function MenuGoingOffline({ lapsed, locale, onOpenPackage }: MenuOfflineProps) {
  const { t } = useTranslation()
  const ended = useEnded(lapsed, locale)

  return (
    <Alert
      variant="warning"
      title={t('menuOffline.soonTitle', { name: ended.name, date: ended.date })}
      action={{ label: t('menuOffline.renew'), onClick: onOpenPackage }}
      className="mb-4"
    >
      {t('menuOffline.soonBody', { date: ended.offline })}
    </Alert>
  )
}
