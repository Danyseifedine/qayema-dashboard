import type { ReactNode } from 'react'
import { ProgressBar } from '@/shared/components/data-display'
import type { Locale } from '@/shared/constants/locales'
import { formatNumber } from '@/shared/utils/format/number'

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
  empty?: ReactNode
  /** What a full bar stands for (the funnel's visitors); left out, the largest value. */
  max?: number
  locale: Locale
  'aria-label': string
}

/** A short ranked list with a bar under each row, sized against the first or `max`. */
export function RankedList({ items, empty, max, locale, ...aria }: RankedListProps) {
  if (items.length === 0) {
    return <p className="py-2 text-[13px] text-[var(--muted)]">{empty}</p>
  }

  const top = max ?? Math.max(...items.map((item) => item.value), 1)

  return (
    <ol className="flex flex-col gap-2.5" {...aria}>
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{item.label}</span>
            {/* Side by side as boxes: two numbers in a row in Arabic would
                otherwise run together as one, "100%2". */}
            <span className="inline-flex shrink-0 items-baseline gap-2 tabular-nums">
              {item.detail ? (
                <span className="text-[12px] text-[var(--muted)]">{item.detail}</span>
              ) : null}
              <span className="font-semibold">{formatNumber(item.value, locale)}</span>
            </span>
          </div>
          {/* The number is written above it, so the bar is only a picture of it. */}
          <ProgressBar value={item.value} max={top} />
        </li>
      ))}
    </ol>
  )
}
