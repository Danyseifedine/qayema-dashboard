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
 * whatever sits at its end. Put the rows in a `role="group"` with a name.
 */
export function CheckRow({ on, onClick, children, trailing }: CheckRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-tile px-2.5 py-2 text-start transition-colors focus-ring',
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
      <span dir="auto" className="min-w-0 flex-1 truncate text-[14px]">
        {children}
      </span>
      {trailing}
    </button>
  )
}
