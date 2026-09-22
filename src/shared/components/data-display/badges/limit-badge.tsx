import { cn } from '@/shared/utils/dom/cn'

export type LimitBadgeProps = {
  used: number
  /** Null means unlimited on this plan. */
  limit: number | null
  className?: string
}

/**
 * "7 / 20" with the count of what the owner has against what the plan allows.
 * Turns gold as the ceiling approaches and red once it is reached, so running
 * out is visible before a save is rejected.
 */
export function LimitBadge({ used, limit, className }: LimitBadgeProps) {
  if (limit === null) {
    return (
      <span className={cn('text-[12px] tabular-nums text-[var(--muted)]', className)}>{used}</span>
    )
  }

  const full = used >= limit
  const near = !full && used >= limit * 0.8

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular-nums',
        full && 'bg-status-danger-wash text-status-danger',
        near && 'bg-accent-wash text-accent',
        !full && !near && 'bg-[var(--hover-wash)] text-[var(--muted)]',
        className,
      )}
    >
      {used} / {limit}
    </span>
  )
}
