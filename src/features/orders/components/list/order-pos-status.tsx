import { IconCashRegister } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/shared/components/data-display'
import { Alert } from '@/shared/components/ui'
import { useSendOrderToPos } from '@/features/orders/hooks/use-orders'
import type { Order } from '@/features/orders/schemas/order.schema'

/**
 * Where an order sent to the restaurant's POS stands: on its way, in the POS
 * with its number (the POS moves it on from there, so the card offers no
 * steps), or not sent, with why and Try again. Also why the POS called it
 * off, when it said. Nothing for an order that was never sent.
 */
export function OrderPosStatus({ order }: { order: Order }) {
  const { t } = useTranslation('orders')
  const pos = order.pos
  const reason =
    order.status === 'cancelled' && order.cancel_reason !== null ? (
      <Alert size="sm" variant="info" title={t('pos.cancelledBecause')}>
        <span dir="auto">{order.cancel_reason}</span>
      </Alert>
    ) : null

  if (pos === null) return reason

  if (pos.status === 'failed') {
    return (
      <>
        <NotSent order={order} error={pos.error} />
        {reason}
      </>
    )
  }

  return (
    <>
      <p
        className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--muted)]"
        data-pos-order
      >
        <StatusChip tone={pos.status === 'sent' ? 'info' : 'neutral'} className="gap-1">
          <IconCashRegister aria-hidden className="size-3.5" />
          {pos.status === 'sent'
            ? pos.number !== null
              ? t('pos.inPosNumber', { number: pos.number })
              : t('pos.inPos')
            : t('pos.sending')}
        </StatusChip>
        <span>{t('pos.handledThere')}</span>
      </p>
      {reason}
    </>
  )
}

/** Not sent to the POS, why, and Try again while the order is still open. */
function NotSent({ order, error }: { order: Order; error: string | null }) {
  const { t } = useTranslation('orders')
  const retry = useSendOrderToPos()
  const open = order.status !== 'cancelled' && order.status !== 'done'

  return (
    <Alert
      size="sm"
      variant="warning"
      title={t('pos.notSent')}
      action={
        open
          ? {
              label: t('pos.tryAgain'),
              loading: retry.isPending,
              onClick: () => retry.mutate(order),
            }
          : undefined
      }
    >
      <span dir="auto" data-pos-error>
        {error ?? t('pos.noAnswer')}
      </span>
    </Alert>
  )
}
