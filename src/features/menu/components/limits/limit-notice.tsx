import type { ReactNode } from 'react'
import { LimitBadge } from '@/shared/components/data-display'
import { cn } from '@/shared/utils/dom/cn'

export type LimitNoticeProps = {
  label: string
  used: number
  /** Null means unlimited on this package. */
  limit: number | null
  /** One line under the heading saying what the section is for. */
  description?: ReactNode
  className?: string
}

/**
 * Section heading with the plan usage beside it, and its own subtitle.
 *
 * The subtitle belongs here rather than beside the heading in the page, so the
 * whole block is one flex item and whatever sits opposite it — the add button —
 * centres against both lines instead of only the heading.
 */
export function LimitNotice({ label, used, limit, description, className }: LimitNoticeProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-[19px] leading-tight">{label}</h2>
        <LimitBadge used={used} limit={limit} />
      </div>
      {description ? (
        <p className="text-[13px] leading-snug text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  )
}
