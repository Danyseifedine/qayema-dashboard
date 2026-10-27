import { IconChevronRight, IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/dom/cn'

/**
 * The kinds of banner: `warning` (amber) for anything that wants the
 * owner to act, orders waiting, a feature turned off, a limit reached;
 * `error` (red) when something failed or was refused; `info`, small and
 * quiet, for a helpful word that asks nothing (one language is enough).
 */
type AlertVariant = 'error' | 'warning' | 'info'

const STYLES: Record<AlertVariant, string> = {
  error: 'border-status-danger-border bg-status-danger-wash text-status-danger',
  warning: 'border-status-warn-border bg-status-warn-wash text-status-warn',
  info: 'border-transparent bg-[var(--hover-wash)] text-[var(--muted)]',
}

export type AlertProps = {
  variant: AlertVariant
  title?: ReactNode
  children: ReactNode
  /**
   * `sm` is the banner inside a card (an order changed, an offer that will
   * not show): smaller, its message medium rather than bold. `info` is
   * always small.
   */
  size?: 'md' | 'sm'
  /** One button under the message, always the same: what to do about it. */
  action?: { label: ReactNode; onClick: () => void }
  /** Makes the whole banner one button, with an arrow at its end. */
  onClick?: () => void
  /** Renders a dismiss button on the trailing side. */
  onDismiss?: () => void
  className?: string
}

/**
 * The dashboard's one banner, everywhere one is needed: a dot, then the
 * message, its first line (the title, or the message itself) in bold, on a
 * wash of its colour inside a hairline border. Orders waiting, a feature
 * turned off, a limit reached, a form error that belongs to no field (and
 * 429 responses): all the same shape, so a banner always reads as one.
 */
export function Alert({
  variant,
  title,
  children,
  size = 'md',
  action,
  onClick,
  onDismiss,
  className,
}: AlertProps) {
  const { t } = useTranslation()
  const quiet = variant === 'info'
  const small = quiet || size === 'sm'
  const strong = small ? 'font-medium' : 'font-semibold'

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'shrink-0 rounded-full',
          quiet
            ? 'mt-[0.5em] size-1.5 bg-gold'
            : small
              ? 'mt-[0.4em] size-2 bg-current'
              : 'mt-[0.45em] size-2.5 bg-current',
        )}
      />
      <div className="min-w-0 flex-1">
        {title ? <p className={cn(!quiet && strong)}>{title}</p> : null}
        <div
          className={cn(title ? (small ? 'mt-0.5 opacity-90' : 'mt-0.5 text-[13.5px] opacity-90') : !quiet && strong)}
        >
          {children}
        </div>
        {action ? (
          <Button size="sm" variant="secondary" className="mt-2.5" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </>
  )
  const shell = cn(
    'flex w-full items-start border-[0.5px] text-start',
    small
      ? 'gap-2 rounded-tile px-3 py-2 text-[12.5px] leading-snug'
      : 'gap-3 rounded-card px-4 py-3 text-[14px] leading-[1.45]',
    STYLES[variant],
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shell, 'transition-[filter] hover:brightness-110 focus-ring')}
      >
        {body}
        <IconChevronRight aria-hidden className="mt-0.5 size-[18px] shrink-0 rtl:rotate-180" />
      </button>
    )
  }

  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={shell}>
      {body}
      {onDismiss ? (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('alert.dismiss')}
          onClick={onDismiss}
          className="-my-1 -me-1.5 text-current opacity-70 hover:bg-current/10 hover:opacity-100"
        >
          <IconX aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}
