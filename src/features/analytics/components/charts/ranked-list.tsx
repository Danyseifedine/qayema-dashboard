import type { ReactNode } from 'react'

export type RankedItem = {
  /** Unique within the list. */
  id: string
  label: ReactNode
  value: number
  /** What sits beside the number, e.g. a share or an amount. */
  detail?: ReactNode
}

export type RankedListProps = {
  items: RankedItem[]
  /** Said when there is nothing to rank. */
  empty: ReactNode
  'aria-label': string
}

/** A short ranked list with a bar under each row, sized against the first. */
export function RankedList({ items, empty, ...aria }: RankedListProps) {
  if (items.length === 0) {
    return <p className="py-2 text-[13px] text-[var(--muted)]">{empty}</p>
  }

  const top = Math.max(...items.map((item) => item.value), 1)

  return (
    <ol className="flex flex-col gap-2.5" {...aria}>
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              {item.detail ? (
                <span className="me-2 text-[12px] text-[var(--muted)]">{item.detail}</span>
              ) : null}
              <span className="font-semibold">{item.value.toLocaleString()}</span>
            </span>
          </div>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-[var(--hover-wash)]">
            <div
              className="h-full rounded-full bg-[var(--accent-text)] transition-[width] duration-500"
              style={{ width: `${(item.value / top) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
