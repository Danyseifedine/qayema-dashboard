import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/components/feedback'

export type CancelOrderDialogProps = {
  open: boolean
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before an order is called off: the guest following it sees it cancelled. */
export function CancelOrderDialog(props: CancelOrderDialogProps) {
  const { t } = useTranslation('orders')

  return (
    <ConfirmDialog
      {...props}
      title={t('cancelDialog.title')}
      description={t('cancelDialog.description')}
      confirmLabel={t('cancelDialog.confirm')}
    />
  )
}
