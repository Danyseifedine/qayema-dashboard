import { IconCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type CheckRowProps = {
  on: boolean
  onClick: () => void
  /** What the row names (a dish), read before `trailing`. */
  children: ReactNode
  /** Beside it at the end: a price. */
  trailing?: ReactNode
}

/**
 * One row of a list where any number may be ticked (the dishes an offer is
 * for, the dishes a build offers): a box that turns gold, the name, and
 * whatever sits at its end. When both do not fit on one line (a narrow
 * phone, a long price), the end moves under the name rather than squeezing
 * it away. Put the rows in a `role="group"` with a name.
 */
export function CheckRow({ on, onClick, children, trailing }: CheckRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tile px-2.5 py-2 text-start transition-colors focus-ring',
        on ? 'bg-accent-wash' : 'hover:bg-[var(--hover-wash)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-control border-[0.5px]',
          on ? 'border-gold bg-gold text-ink' : 'border-[var(--line-strong)]',
        )}
      >
        {on ? <IconCheck className="size-3.5" stroke={2.4} /> : null}
      </span>
      <span dir="auto" className="min-w-32 flex-1 truncate text-[14px]">
        {children}
      </span>
      {trailing ? <span className="ms-auto max-w-full text-end">{trailing}</span> : null}
    </button>
  )
}
