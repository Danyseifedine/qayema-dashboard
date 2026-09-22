import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type AlertVariant = 'error' | 'warning' | 'success' | 'info'

const ICONS: Record<AlertVariant, typeof Info> = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}

const STYLES: Record<AlertVariant, string> = {
  // One alpha convention across all four (wash .10 light / .14 dark, border
  // .30 / .38), and four distinct hues. Info is blue rather than gold so it
  // can never be mistaken for a warning.
  error: 'border-status-danger-border bg-status-danger-wash text-status-danger',
  warning: 'border-status-warn-border bg-status-warn-wash text-status-warn',
  success: 'border-status-success-border bg-status-success-wash text-status-success',
  info: 'border-status-info-border bg-status-info-wash text-status-info',
}

export type AlertProps = {
  variant?: AlertVariant
  title?: ReactNode
  children?: ReactNode
  /** Renders a dismiss button on the trailing side. */
  onDismiss?: () => void
  dismissLabel?: string
  className?: string
}

/**
 * Form-level message block. Validation errors that belong to no single field
 * (and 402/429 responses) surface here rather than under a control.
 */
export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
}: AlertProps) {
  const Icon = ICONS[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-field)] border-[0.5px] p-3.5',
        'text-[13.5px] leading-[1.5]',
        STYLES[variant],
        className,
      )}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-1 opacity-90')}>{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="-m-1 shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
