import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import { FormSection } from '@/shared/components/forms'
import type { Locale } from '@/shared/constants/locales'
import { changeBetween } from '@/shared/utils/format/change'
import { formatMoney } from '@/shared/utils/format/money'
import { formatNumber } from '@/shared/utils/format/number'
import { BusyTimesChart } from '@/features/analytics/components/charts/busy-times-chart'
import { RankedList } from '@/features/analytics/components/charts/ranked-list'
import type { AdvancedStats } from '@/features/analytics/schemas/analytics.schema'

export type MenuOrdersProps = {
  orders: NonNullable<AdvancedStats['menu_orders']>
  locale: Locale
}

/**
 * The orders placed in the menu: what they came to, who came back, how fast
 * they were taken on, what was ordered and when. Only a restaurant taking
 * orders in the menu has these; a WhatsApp order is a tap with no total.
 */
export function MenuOrders({ orders, locale }: MenuOrdersProps) {
  const { t } = useTranslation('analytics')
  const money = (amount: number) => formatMoney(amount, orders.currency, locale)
  const { statuses } = orders
  const outcomes = [
    { id: 'done', value: statuses.done },
    { id: 'open', value: statuses.placed + statuses.accepted + statuses.ready },
    { id: 'cancelled', value: statuses.cancelled },
  ] as const
  const placed = outcomes.reduce((sum, outcome) => sum + outcome.value, 0)
  const share = (value: number, total: number) => `${Math.round((value / total) * 100)}%`
  const delivered = orders.fulfilment.reduce((sum, row) => sum + row.count, 0)

  return (
    <FormSection title={t('menuOrders.title')} description={t('menuOrders.description')}>
      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile
            label={t('menuOrders.sales')}
            value={money(orders.sales)}
            change={
              orders.previous_sales === null
                ? null
                : changeBetween(orders.sales, orders.previous_sales)
            }
          />
          <StatTile
            label={t('menuOrders.average')}
            value={orders.average === null ? t('menuOrders.none') : money(orders.average)}
          />
          <StatTile
            label={t('menuOrders.returning')}
            value={formatNumber(orders.returning_guests, locale)}
            hint={t('menuOrders.ofGuests', { count: orders.guests })}
          />
          <StatTile
            label={t('menuOrders.toAccept')}
            value={
              orders.minutes_to_accept === null
                ? t('menuOrders.none')
                : duration(orders.minutes_to_accept, t)
            }
            hint={t('menuOrders.toAcceptHint')}
          />
        </dl>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Group title={t('menuOrders.topOrdered.title')}>
            <RankedList
              aria-label={t('menuOrders.topOrdered.title')}
              empty={t('menuOrders.topOrdered.empty')}
              items={orders.top_ordered.map((dish) => ({
                id: dish.name,
                label: dish.name,
                value: dish.quantity,
                detail: money(dish.sales),
              }))}
            />
          </Group>
          <Group title={t('menuOrders.outcomes.title')}>
            <RankedList
              aria-label={t('menuOrders.outcomes.title')}
              empty={t('menuOrders.outcomes.empty')}
              items={
                placed === 0
                  ? []
                  : outcomes.map((outcome) => ({
                      id: outcome.id,
                      label: t(`menuOrders.outcomes.${outcome.id}`),
                      value: outcome.value,
                      detail: share(outcome.value, placed),
                    }))
              }
            />
          </Group>
          <Group title={t('menuOrders.fulfilment.title')}>
            <RankedList
              aria-label={t('menuOrders.fulfilment.title')}
              empty={t('menuOrders.fulfilment.empty')}
              items={orders.fulfilment.map((row) => ({
                id: row.key,
                label:
                  row.key === 'delivery' || row.key === 'pickup' || row.key === 'dine_in'
                    ? t(`menuOrders.fulfilment.${row.key}`)
                    : row.key,
                value: row.count,
                detail: share(row.count, delivered),
              }))}
            />
          </Group>
        </div>

        <Group
          title={t('menuOrders.busiest.title')}
          description={t('menuOrders.busiest.description')}
        >
          <BusyTimesChart
            hours={orders.hours}
            weekdays={orders.weekdays}
            locale={locale}
            valueLabel={t('menuOrders.busiest.orders')}
            notEnough={t('menuOrders.busiest.notEnough')}
          />
        </Group>
      </div>
    </FormSection>
  )
}

/** A titled part of the section, lighter than a section of its own. */
function Group({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div>
        <h4 className="text-[13px] font-semibold">{title}</h4>
        {description ? (
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** "4 min", or "1 h 20 min" from an hour up. */
function duration(minutes: number, t: TFunction<'analytics'>): string {
  if (minutes < 60) return t('menuOrders.minutes', { count: minutes })
  return t('menuOrders.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
}
