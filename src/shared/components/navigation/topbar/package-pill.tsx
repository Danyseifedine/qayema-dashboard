import { Crown } from 'lucide-react'
import { cn } from '@/shared/utils/dom/cn'

export type PackagePillProps = {
  /** The package's name in the current language. */
  label: string
  onClick?: () => void
  className?: string
}

/**
 * Which package the restaurant is on, always visible because every limit in
 * the dashboard comes from it. Clicking it opens the package page.
 */
export function PackagePill({ label, onClick, className }: PackagePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} package. Open your package.`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border-[0.5px] px-3 py-1.5',
        'border-accent-border bg-accent-wash text-[12.5px] font-medium text-accent',
        'transition-colors duration-200 hover:bg-accent-wash-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        className,
      )}
    >
      <Crown aria-hidden className="size-3.5" />
      <span>{label}</span>
    </button>
  )
}
