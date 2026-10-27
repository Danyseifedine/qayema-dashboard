import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type ToggleChipProps = {
  on: boolean
  children: ReactNode
  /** A fuller name for a screen reader and a hover tooltip. */
  title?: string
  'aria-label'?: string
  onClick: () => void
}

/**
 * A round chip that is on or off on its own, solid gold while on: one of a
 * row where any number may be picked (an offer's weekdays, the part counts
 * a build allows). A row where only one is picked is `FilterChips` or
 * `Segmented` instead.
 */
export function ToggleChip({ on, children, title, onClick, ...aria }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={cn(
        'h-9 min-w-9 rounded-full border-[0.5px] px-2.5 text-[13px] tabular-nums transition-colors focus-ring',
        on
          ? 'border-gold bg-gold text-ink'
          : 'border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]',
      )}
      {...aria}
    >
      {children}
    </button>
  )
}
