import { Check, X } from 'lucide-react'
import { memo } from 'react'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { ORDER_STATUS_LABELS, type Order } from '../../schemas/order.schema'

export type OrderCardProps = {
  order: Order
  busy?: boolean
  /** These take the order back, so the page can pass stable callbacks. */
  onMarkDone: (order: Order) => void
  onCancel: (order: Order) => void
  className?: string
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
  className,
}: OrderCardProps) {
  const placed = order.placed_at === null ? null : new Date(order.placed_at)

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] p-4 transition-colors hover:border-[var(--line-strong)]',
        order.status === 'cancelled' && 'opacity-70',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="force-ltr font-display text-[17px] leading-tight">{order.reference}</p>
          {placed !== null ? (
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {placed.toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'rounded-full border-[0.5px] px-2.5 py-1 text-[11.5px] font-medium',
            TONE[order.status],
          )}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="min-w-0">
              <span className="tabular-nums text-[var(--muted)]">{item.quantity}×</span>{' '}
              <span>{item.name}</span>
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
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              leadingIcon={<X className="size-3.5" />}
              onClick={() => onCancel(order)}
              className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
})
