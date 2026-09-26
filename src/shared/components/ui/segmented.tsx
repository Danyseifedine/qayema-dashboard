import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  /** Optional trailing marker, e.g. a dot when a locale has unsaved text. */
  badge?: string
  /** Shown but not choosable, e.g. a range the package does not include. */
  disabled?: boolean
  /** A small icon after the label, e.g. a lock on a disabled option. */
  icon?: ReactNode
  /** Extra words for a screen reader and a hover tooltip. */
  title?: string
}

export type SegmentedProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  'aria-label': string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * The portal's `.ui-seg` pill, with a gold active state instead of the
 * ink-black one (which was never wired up to any markup). Used for the EN/AR
 * locale tabs on translatable fields and the analytics range.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  ...aria
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-[var(--radius-control)] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-1',
        className,
      )}
      {...aria}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[8px] font-medium',
              'transition-[background-color,color,border-color] duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--gold-on)]',
              size === 'sm' ? 'px-3 py-1 text-[12px]' : 'px-4 py-2 text-[13px]',
              active
                ? 'bg-accent-wash text-accent'
                : 'text-[var(--muted)] hover:text-[var(--text)]',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[var(--muted)]',
            )}
          >
            {option.label}
            {option.icon}
            {option.badge ? (
              <span aria-hidden className="text-[10px] text-accent">
                {option.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
