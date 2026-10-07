import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/shared/components/feedback'
import type { Order } from '@/features/orders/schemas/order.schema'

export type DeleteOrderDialogProps = {
  /** Null keeps it closed. */
  order: Order | null
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before an order goes for good: its lines, its place in the analytics, the guest's tracking. */
export function DeleteOrderDialog({ order, ...props }: DeleteOrderDialogProps) {
  const { t } = useTranslation('orders')

  return (
    <ConfirmDialog
      {...props}
      open={order !== null}
      title={t('deleteDialog.title', { reference: order?.reference ?? '' })}
      description={t('deleteDialog.description')}
      confirmLabel={t('deleteDialog.confirm')}
    />
  )
}
