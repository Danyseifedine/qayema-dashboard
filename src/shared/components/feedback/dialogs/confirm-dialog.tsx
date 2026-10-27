import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@/shared/components/feedback/dialogs/modal'
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
      <ModalBody>
        <ModalHeader title={title} description={description} />
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t('dialog.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} autoFocus>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
