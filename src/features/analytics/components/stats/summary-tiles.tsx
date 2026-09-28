import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import { changeBetween } from '@/shared/utils/format/change'
import { formatNumber } from '@/shared/utils/format/number'
import type { AdvancedStats, StatsSummary } from '@/features/analytics/schemas/analytics.schema'
import { usePreferencesStore } from '@/stores/preferences.store'

export type SummaryTilesProps = {
  totals: StatsSummary['totals']
  /**
   * The period before, from advanced analytics. Left out, the tiles show no
   * change line at all; null ("All time") says there is nothing to compare.
   */
  previous?: AdvancedStats['previous']
}

/** The headline numbers for the range. */
export function SummaryTiles({ totals, previous }: SummaryTilesProps) {
  const { t } = useTranslation('analytics')
  const locale = usePreferencesStore((state) => state.locale)
  const change = (key: 'views' | 'unique_visitors' | 'qr_scans' | 'orders', current: number) => {
    if (previous === undefined) return undefined
    const before = previous?.[key]
    return before === null || before === undefined ? null : changeBetween(current, before)
  }

  return (
    <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <StatTile
        label={t('summary.views')}
        value={formatNumber(totals.views, locale)}
        change={change('views', totals.views)}
        hint={t('summary.viewsToday', { views: formatNumber(totals.views_today, locale) })}
      />
      <StatTile
        label={t('summary.visitors')}
        value={formatNumber(totals.unique_visitors, locale)}
        change={change('unique_visitors', totals.unique_visitors)}
      />
      <StatTile
        label={t('summary.qrScans')}
        value={formatNumber(totals.qr_scans, locale)}
        change={change('qr_scans', totals.qr_scans)}
      />
      {totals.orders !== null ? (
        <StatTile
          label={t('summary.orders')}
          value={formatNumber(totals.orders, locale)}
          change={change('orders', totals.orders)}
        />
      ) : null}
    </dl>
  )
}
