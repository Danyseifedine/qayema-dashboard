import { cn } from '@/shared/utils/dom/cn'

export type LimitBadgeProps = {
  used: number
  /** Null means unlimited on this plan. */
  limit: number | null
  /** A larger pill in a gold hairline, for the count beside a page's add button. */
  outlined?: boolean
}

/**
 * "7 / 20" with the count of what the owner has against what the plan allows.
 * Turns gold as the ceiling approaches and red once it is reached, so running
 * out is visible before a save is rejected.
 */
export function LimitBadge({ used, limit, outlined = false }: LimitBadgeProps) {
  if (limit === null) {
    return <span className="text-[12px] tabular-nums text-[var(--muted)]">{used}</span>
  }

  // A count reads left to right in both languages; without this an Arabic
  // page shows "6 / 40" as "40 / 6".
  const full = used >= limit
  const near = !full && used >= limit * 0.8

  return (
    <span
      dir="ltr"
      className={cn(
        'inline-flex items-center rounded-full font-medium tabular-nums',
        outlined ? 'border-[0.5px] px-3 py-1 text-[13px]' : 'px-2 py-0.5 text-[11.5px]',
        full && 'border-status-danger-border bg-status-danger-wash text-status-danger',
        near && 'border-[var(--accent-border)] bg-accent-wash text-accent',
        !full &&
          !near &&
          (outlined
            ? 'border-[var(--accent-border)] bg-[var(--surface)] text-[var(--text)]'
            : 'bg-[var(--hover-wash)] text-[var(--muted)]'),
      )}
    >
      {used} / {limit}
    </span>
  )
}
