import { cn } from '@/shared/utils/dom/cn'

/**
 * How far along something is, as a thin gold bar: the menu's set-up, a
 * dish's share of orders. `label` names it for a screen reader; a bar that
 * only illustrates numbers written beside it passes none and stays hidden
 * from one.
 */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number
  max: number
  label?: string
  className?: string
}) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  return (
    <div
      {...(label
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': max,
            'aria-valuenow': value,
          }
        : { 'aria-hidden': true })}
      className={cn('h-1.5 overflow-hidden rounded-full bg-[var(--hover-wash)]', className)}
    >
      <div
        className="h-full rounded-full bg-gold transition-[width] duration-500"
        style={{ width: `${share * 100}%` }}
      />
    </div>
  )
}
