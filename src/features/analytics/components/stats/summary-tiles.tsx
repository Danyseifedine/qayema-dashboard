import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { changeBetween } from '@/shared/utils/format/change'
import { formatNumber } from '@/shared/utils/format/number'
import type { StatsSummary } from '@/features/analytics/schemas/analytics.schema'

export type SummaryTilesProps = {
  totals: StatsSummary['totals']
  /** What the orders tile counts (StatsSummary['order_channel']). */
  channel: StatsSummary['order_channel']
  /**
   * The period before (shown with advanced analytics). Left out, the tiles
   * show no change line at all; null ("All time") says there is nothing to
   * compare.
   */
  previous?: StatsSummary['previous']
  /** "N today" under the views; left out when the range is today itself. */
  showToday?: boolean
  locale: Locale
}

/** The headline numbers for the range. */
export function SummaryTiles({
  totals,
  channel,
  previous,
  showToday = true,
  locale,
}: SummaryTilesProps) {
  const { t } = useTranslation('analytics')
  const change = (key: 'views' | 'unique_visitors' | 'qr_scans' | 'orders', current: number) => {
    if (previous === undefined) return undefined
    const before = previous?.[key]
    return before === null || before === undefined ? null : changeBetween(current, before)
  }

  // Without orders there are three tiles: they share the row, and on a phone
  // the third takes the full width, so no gap is left beside them.
  const withOrders = totals.orders !== null

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-2.5',
        withOrders ? 'lg:grid-cols-4' : 'lg:grid-cols-3 max-lg:*:last:col-span-2',
      )}
    >
      <StatTile
        standalone
        label={t('summary.views')}
        value={formatNumber(totals.views, locale)}
        change={change('views', totals.views)}
        hint={
          showToday
            ? t('summary.viewsToday', { views: formatNumber(totals.views_today, locale) })
            : undefined
        }
      />
      <StatTile
        standalone
        label={t('summary.visitors')}
        value={formatNumber(totals.unique_visitors, locale)}
        change={change('unique_visitors', totals.unique_visitors)}
      />
      <StatTile
        standalone
        label={t('summary.qrScans')}
        value={formatNumber(totals.qr_scans, locale)}
        change={change('qr_scans', totals.qr_scans)}
      />
      {totals.orders !== null ? (
        // A WhatsApp order is a guest who opened WhatsApp with it, which
        // is all we can know; the tile says exactly that.
        <StatTile
          standalone
          label={t(channel === 'whatsapp' ? 'summary.sentToWhatsapp' : 'summary.orders')}
          value={formatNumber(totals.orders, locale)}
          hint={
            channel === 'whatsapp'
              ? t('summary.whatsappHint')
              : totals.orders_done !== null
                ? t('summary.ordersDone', { count: totals.orders_done })
                : undefined
          }
          change={change('orders', totals.orders)}
        />
      ) : null}
    </dl>
  )
}
