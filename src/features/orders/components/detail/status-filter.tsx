import { cn } from '@/shared/utils/dom/cn'
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from '../../schemas/order.schema'

export type StatusFilterProps = {
  /** Null means every status. */
  value: OrderStatus | null
  onChange: (value: OrderStatus | null) => void
  /** How many are still waiting, shown on the New chip. */
  openCount: number
}

/**
 * Chips rather than a dropdown, matching the category filter on the menu
 * pages: on a phone a dropdown hides every option behind a tap.
 */
export function StatusFilter({ value, onChange, openCount }: StatusFilterProps) {
  const chip = (active: boolean) =>
    cn(
      'inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] border-[0.5px] px-3.5 py-2 text-[13px] transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      active
        ? 'border-accent-border bg-accent-wash font-medium text-accent'
        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]',
    )

  return (
    <div
      role="tablist"
      aria-label="Filter orders by status"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === null}
        onClick={() => onChange(null)}
        className={chip(value === null)}
      >
        All
      </button>

      {ORDER_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={value === status}
          onClick={() => onChange(status)}
          className={chip(value === status)}
        >
          {ORDER_STATUS_LABELS[status]}
          {status === 'placed' && openCount > 0 ? (
            <span className="rounded-full bg-accent-wash px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-accent">
              {openCount}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
