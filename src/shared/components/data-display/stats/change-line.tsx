import { IconArrowDown, IconArrowUp, IconMinus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'
import { formatNumber } from '@/shared/utils/format/number'

export type ChangeLineProps = {
  /**
   * Change against the period before, as a fraction (0.12 is 12% up); null
   * when there was nothing before (`changeBetween()`).
   */
  change: number | null
  /** What it is measured against: "vs before", "vs. yesterday". */
  against: string
  /**
   * The count now, shown as the rise ("+3") when there was nothing before.
   * Without it, nothing before says there is nothing to compare yet.
   */
  count?: number
  /** Its layout: the comparison beside the change, or under it. */
  className?: string
}

/**
 * How a number moved since the period before: "+12%" up in green, "-8%"
 * down in red, "0%" level, then what it is measured against. Every tile
 * with a "change vs before" line draws it with this.
 */
export function ChangeLine({ change, against, count, className }: ChangeLineProps) {
  const { t, i18n } = useTranslation()

  if (change === null && count === undefined) {
    return <span className="text-[var(--muted)]">{t('change.nothingToCompare')}</span>
  }

  const percent = change === null ? null : Math.round(change * 100)
  const up = percent === null || percent > 0
  const flat = percent === 0
  const Arrow = flat ? IconMinus : up ? IconArrowUp : IconArrowDown

  return (
    <span className={className}>
      <span
        dir="ltr"
        className={cn(
          'inline-flex items-center gap-0.5 self-start font-medium tabular-nums',
          flat ? 'text-[var(--muted)]' : up ? 'text-status-success' : 'text-status-danger',
        )}
      >
        <Arrow aria-hidden className="size-3" stroke={2.2} />
        {percent === null
          ? `+${formatNumber(count!, i18n.language)}`
          : `${percent > 0 ? '+' : ''}${formatNumber(percent, i18n.language)}%`}
      </span>
      <span className="text-[var(--muted)]">{against}</span>
    </span>
  )
}
