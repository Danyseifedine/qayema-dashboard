import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/shared/components/feedback/dialogs/modal'
import { Button } from '@/shared/components/ui'

export type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A modal that asks before something irreversible. The confirm button is
 * painted as destructive: every question it asks is about losing something.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onCancel} busy={loading} size="sm">
      <div className="flex flex-col gap-2 p-5">
        <h2 className="font-display text-[19px] leading-tight">{title}</h2>
        <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex justify-end gap-2.5 border-t-[0.5px] border-[var(--line)] p-3.5">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t('confirmDialog.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
