import { IconAlertTriangle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'

export type ErrorStateProps = {
  description: ReactNode
  onRetry: () => void
}

/** Shown when a query fails. Always offers a way to try again. */
export function ErrorState({ description, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[14px] border-[0.5px] border-status-danger-border bg-status-danger-wash px-6 py-10 text-center"
    >
      <IconAlertTriangle aria-hidden className="size-5 text-status-danger" />
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-status-danger">{t('errorState.title')}</p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('errorState.retry')}
      </Button>
    </div>
  )
}
