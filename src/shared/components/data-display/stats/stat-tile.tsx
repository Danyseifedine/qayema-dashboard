import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type StatTileProps = {
  label: ReactNode
  value: ReactNode
  /** A line under the number, e.g. "4 today". */
  hint?: ReactNode
  /**
   * Change against the period before, as a fraction (0.12 is 12% up). Null
   * when there is nothing to compare with; left out, no line is shown.
   */
  change?: number | null
  className?: string
}

/**
 * One number with its label: a scan count, a total, a share. Rendered as a
 * `<div>` holding a `<dt>`/`<dd>` pair, so a group of tiles belongs inside a
 * `<dl>`.
 */
export function StatTile({ label, value, hint, change, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] px-3.5 py-3',
        className,
      )}
    >
      <dt className="text-[12px] text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-[-0.02em]">{value}</dd>
      {change !== undefined ? (
        <dd className="mt-0.5 text-[12px]">
          <Change value={change} />
        </dd>
      ) : null}
      {hint ? <dd className="mt-0.5 text-[12px] text-[var(--muted)]">{hint}</dd> : null}
    </div>
  )
}

function Change({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[var(--muted)]">Nothing to compare yet</span>
  }

  const percent = Math.round(value * 100)

  if (percent === 0) {
    return <span className="text-[var(--muted)]">Same as before</span>
  }

  return (
    <span
      dir="ltr"
      className={cn(
        'font-medium tabular-nums',
        percent > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]',
      )}
    >
      {percent > 0 ? '↑' : '↓'} {Math.abs(percent)}%
      <span className="font-normal text-[var(--muted)]"> vs before</span>
    </span>
  )
}
