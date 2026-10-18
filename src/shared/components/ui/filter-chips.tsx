import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type FilterChip<T> = {
  value: T
  label: ReactNode
  /** A quiet count after the label: how many it holds. */
  count?: number
  /** A count in a gold dot, for what is waiting on the owner. Hidden at 0. */
  badge?: number
  /** A longer explanation on hover. */
  title?: string
}

export type FilterChipsProps<T> = {
  /** What the row filters, for screen readers. */
  label: string
  value: T
  onChange: (value: T) => void
  chips: FilterChip<T>[]
}

/**
 * A row of round chips that picks what a list shows, the picked one in solid
 * gold. Chips rather than a dropdown: on a phone a dropdown hides every
 * option behind a tap, while the row is one thumb-swipe; it scrolls sideways
 * edge to edge when it runs out of room.
 */
export function FilterChips<T extends string | number | null>({
  label,
  value,
  onChange,
  chips,
}: FilterChipsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = chip.value === value
        return (
          <button
            key={String(chip.value)}
            type="button"
            role="tab"
            aria-selected={active}
            title={chip.title}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[0.5px] px-4 text-[13.5px] transition-colors focus-ring',
              active
                ? 'border-transparent bg-gold font-medium text-ink'
                : 'border-[var(--line-strong)] text-[var(--text)] hover:bg-[var(--hover-wash)]',
            )}
          >
            {chip.label}
            {chip.count !== undefined ? (
              <span className="tabular-nums opacity-60">{chip.count}</span>
            ) : null}
            {chip.badge ? (
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11.5px] font-semibold tabular-nums',
                  active ? 'bg-ink/15 text-ink' : 'bg-accent-wash text-accent',
                )}
              >
                {chip.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
