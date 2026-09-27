import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import { changeBetween } from '@/shared/utils/format/change'
import type { AdvancedStats, StatsSummary } from '../../schemas/stats.schema'

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
  const { t } = useTranslation('overview')
  const change = (key: 'views' | 'unique_visitors' | 'qr_scans' | 'orders', current: number) => {
    if (previous === undefined) return undefined
    const before = previous?.[key]
    return before === null || before === undefined ? null : changeBetween(current, before)
  }

  return (
    <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <StatTile
        label={t('analytics.summary.views')}
        value={totals.views.toLocaleString()}
        change={change('views', totals.views)}
        hint={t('analytics.summary.viewsToday', { views: totals.views_today.toLocaleString() })}
      />
      <StatTile
        label={t('analytics.summary.visitors')}
        value={totals.unique_visitors.toLocaleString()}
        change={change('unique_visitors', totals.unique_visitors)}
      />
      <StatTile
        label={t('analytics.summary.qrScans')}
        value={totals.qr_scans.toLocaleString()}
        change={change('qr_scans', totals.qr_scans)}
      />
      {totals.orders !== null ? (
        <StatTile
          label={t('analytics.summary.orders')}
          value={totals.orders.toLocaleString()}
          change={change('orders', totals.orders)}
        />
      ) : null}
    </dl>
  )
}
