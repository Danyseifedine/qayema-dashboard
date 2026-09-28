import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'

export type PackagePillProps = {
  /** The package's name in the current language. */
  label: string
  /** The package ends within a week: a dot asks the owner to look. */
  endingSoon?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Which package the restaurant is on, always visible because every limit in
 * the dashboard comes from it. Clicking it opens the package page.
 */
export function PackagePill({ label, endingSoon = false, onClick, className }: PackagePillProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        endingSoon
          ? t('packagePill.labelEndingSoon', { name: label })
          : t('packagePill.label', { name: label })
      }
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[0.5px] px-3.5',
        'border-accent-border bg-accent-wash text-[12.5px] font-medium text-accent',
        'transition-colors duration-200 hover:bg-accent-wash-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        className,
      )}
    >
      <Crown aria-hidden className="size-3.5" />
      <span>{label}</span>
      {endingSoon ? (
        <span aria-hidden className="size-1.5 rounded-full bg-[var(--status-warn)]" />
      ) : null}
    </button>
  )
}
