import { useTranslation } from 'react-i18next'
import type { Locale } from '@/shared/constants/locales'
import { formatShare } from '@/shared/utils/format/number'
import { RankedList } from '@/features/analytics/components/charts/ranked-list'
import type { AdvancedStats } from '@/features/analytics/schemas/analytics.schema'

export type OrderFunnelProps = {
  funnel: NonNullable<AdvancedStats['funnel']>
  locale: Locale
}

/**
 * From opening the menu to ordering. Each step says what share of the
 * visitors got that far, its bar measured against them.
 */
export function OrderFunnel({ funnel, locale }: OrderFunnelProps) {
  const { t } = useTranslation('analytics')
  const step = (id: string, label: string, value: number) => ({
    id,
    label,
    value,
    detail: formatShare(funnel.visitors > 0 ? Math.min(value / funnel.visitors, 1) : 0),
  })

  return (
    <RankedList
      aria-label={t('funnel.title')}
      locale={locale}
      max={funnel.visitors}
      items={[
        step('visitors', t('funnel.visitors'), funnel.visitors),
        step('carted', t('funnel.carted'), funnel.carted),
        step(
          'ordered',
          t(funnel.channel === 'whatsapp' ? 'funnel.sentToWhatsapp' : 'funnel.ordered'),
          funnel.ordered,
        ),
      ]}
    />
  )
}
