import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChangeLine } from '@/shared/components/data-display/stats/change-line'
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
  /** On its own on the page, a glass card; inside a card (the default), a panel set into it. */
  standalone?: boolean
}

/**
 * One number with its label: a scan count, a total, a share. Rendered as a
 * `<div>` holding a `<dt>`/`<dd>` pair, so a group of tiles belongs inside a
 * `<dl>`.
 */
export function StatTile({ label, value, hint, change, standalone = false }: StatTileProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('px-3.5 py-3', standalone ? 'glass-card rounded-card' : 'inset-tile')}>
      <dt className="text-[12px] text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-[-0.02em]">{value}</dd>
      {change !== undefined ? (
        <dd className="mt-0.5 text-[12px]">
          <ChangeLine
            change={change}
            against={t('change.vsBefore')}
            className="flex flex-wrap items-center gap-x-1"
          />
        </dd>
      ) : null}
      {hint ? <dd className="mt-0.5 text-[12px] text-[var(--muted)]">{hint}</dd> : null}
    </div>
  )
}
