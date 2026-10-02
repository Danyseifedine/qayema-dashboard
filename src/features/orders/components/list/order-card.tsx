import { Check, X } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { formatDateTime } from '@/shared/utils/format/date'
import { usePreferencesStore } from '@/stores/preferences.store'
import type { Order } from '@/features/orders/schemas/order.schema'

export type OrderCardProps = {
  order: Order
  busy?: boolean
  /** These take the order back, so the page can pass stable callbacks. */
  onMarkDone: (order: Order) => void
  onCancel: (order: Order) => void
}

const TONE: Record<Order['status'], string> = {
  placed: 'border-accent-border bg-accent-wash text-accent',
  done: 'border-status-success-border bg-status-success-wash text-status-success',
  cancelled: 'border-[var(--line)] bg-[var(--hover-wash)] text-[var(--muted)]',
}

/**
 * One order, with everything the owner needs to read it at a glance and act
 * on it without opening anything.
 */
export const OrderCard = memo(function OrderCard({
  order,
  busy = false,
  onMarkDone,
  onCancel,
}: OrderCardProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] p-4 transition-colors hover:border-[var(--line-strong)]',
        order.status === 'cancelled' && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="force-ltr font-display text-[17px] leading-tight">{order.reference}</p>
          {order.placed_at !== null ? (
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {formatDateTime(order.placed_at, locale)}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'rounded-full border-[0.5px] px-2.5 py-1 text-[11.5px] font-medium',
            TONE[order.status],
          )}
        >
          {t(`status.${order.status}`)}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="min-w-0">
              <span className="tabular-nums text-[var(--muted)]">{item.quantity}×</span>{' '}
              <span>{item.name}</span>
              {item.options ? (
                <span className="block text-[12.5px] text-[var(--muted)]">
                  {[
                    ...item.options.variants.map((variant) => `${variant.name}: ${variant.choice}`),
                    ...item.options.addons.map((addon) => `+ ${addon.name}`),
                  ].join(' · ')}
                </span>
              ) : null}
            </span>
            <Money
              amount={Number(item.line_total)}
              currency={order.currency}
              className="shrink-0 text-[13px] text-[var(--muted)]"
            />
          </li>
        ))}
      </ul>

      {order.note !== null ? (
        <p className="rounded-[10px] bg-[var(--field)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
          {order.note}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t-[0.5px] border-[var(--line)] pt-3">
        <Money
          amount={Number(order.total)}
          currency={order.currency}
          className="text-[15px] font-medium text-accent"
        />

        {order.status === 'placed' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              leadingIcon={<Check className="size-3.5" />}
              onClick={() => onMarkDone(order)}
            >
              {t('card.markDone')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              leadingIcon={<X className="size-3.5" />}
              onClick={() => onCancel(order)}
              className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
            >
              {t('card.cancel')}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
})
