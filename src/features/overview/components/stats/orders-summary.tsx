import { Money, StatTile } from '@/shared/components/data-display'
import type { Locale } from '@/shared/constants/locales'
import type { AdvancedStats } from '../../schemas/stats.schema'
import { RankedList } from '../charts/ranked-list'

export type OrdersSummaryProps = {
  orders: NonNullable<AdvancedStats['orders']>
  locale: Locale
}

/** What was ordered and what it came to. Cancelled orders stay out of the money. */
export function OrdersSummary({ orders, locale }: OrdersSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile
          label="Order value"
          value={<Money amount={orders.revenue} currency={orders.currency} locale={locale} />}
        />
        <StatTile label="Orders" value={orders.count.toLocaleString()} />
        <StatTile
          label="Average order"
          value={<Money amount={orders.average} currency={orders.currency} locale={locale} />}
        />
        <StatTile label="Cancelled" value={orders.cancelled.toLocaleString()} />
      </dl>
      <div>
        <h4 className="pb-2 text-[12px] text-[var(--muted)]">Most ordered</h4>
        <RankedList
          aria-label="Most ordered dishes"
          empty="No orders in this range."
          items={orders.top_dishes.map((dish) => ({
            id: dish.name,
            label: dish.name,
            value: dish.quantity,
            detail: <Money amount={dish.revenue} currency={orders.currency} locale={locale} />,
          }))}
        />
      </div>
    </div>
  )
}
