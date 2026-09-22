import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type FieldTone = 'default' | 'error' | 'success'

/**
 * The bordered box every text-like control sits in.
 *
 * The portal puts the focus ring on this wrapper and suppresses it on the
 * control itself, so a leading icon, a prefix and a trailing adornment all sit
 * inside one continuous field. We keep that convention, but use the gold ring
 * from the login page rather than the stale olive-green one left in ui.css.
 */
export function FieldShell({
  tone = 'default',
  disabled = false,
  className,
  children,
}: {
  tone?: FieldTone
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-disabled={disabled || undefined}
      className={cn(
        'relative flex items-center rounded-[var(--radius-field)] border-[0.5px]',
        'bg-[var(--field)] transition-[border-color,box-shadow,background-color] duration-200',
        '[transition-timing-function:var(--ease-qayema)]',
        tone === 'default' && [
          'border-[var(--line)] hover:border-[var(--line-strong)]',
          'focus-within:border-gold focus-within:bg-[var(--surface)]',
          'focus-within:shadow-[0_0_0_3px_var(--ring-accent)]',
        ],
        tone === 'error' && [
          'border-danger shadow-[0_0_0_3px_var(--ring-danger)]',
          'focus-within:bg-[var(--surface)]',
        ],
        tone === 'success' && [
          'border-status-success shadow-[0_0_0_3px_var(--ring-success)]',
          'focus-within:bg-[var(--surface)]',
        ],
        disabled && 'pointer-events-none bg-[var(--disabled-wash)] opacity-55',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Leading icon slot. Sits inside the shell, before the control. */
export function FieldLeading({ children }: { children: ReactNode }) {
  return (
    <span className="ms-3.5 me-1.5 inline-flex shrink-0 text-[var(--muted)] [&>svg]:size-4">
      {children}
    </span>
  )
}

/** Static text before the control, e.g. a currency code or `https://`. */
export function FieldPrefix({ children }: { children: ReactNode }) {
  return (
    <span className="ms-3.5 shrink-0 select-none text-[14px] text-[var(--faint)]">{children}</span>
  )
}

/** Trailing slot: counters, units, or a small icon button. */
export function FieldTrailing({ children }: { children: ReactNode }) {
  return (
    <span className="mx-3.5 inline-flex shrink-0 items-center gap-1.5 text-[12px] text-[var(--muted)]">
      {children}
    </span>
  )
}

/** Icon button living in the trailing slot, e.g. reveal-password. */
export function FieldTrailingButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid shrink-0 place-items-center rounded-lg p-1.5 text-[var(--muted)]',
        'transition-[color,background-color] duration-150 hover:bg-[var(--hover-wash)] hover:text-[var(--text)]',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--gold-on)]',
        '[&>svg]:size-4',
      )}
    >
      {children}
    </button>
  )
}
