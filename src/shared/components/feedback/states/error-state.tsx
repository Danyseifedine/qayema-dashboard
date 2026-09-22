import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'

export type ErrorStateProps = {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/** Shown when a query fails. Always offers a way to try again. */
export function ErrorState({
  title = 'That did not load',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-[14px] border-[0.5px] border-status-danger-border',
        'bg-status-danger-wash px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle aria-hidden className="size-5 text-status-danger" />
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-status-danger">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
