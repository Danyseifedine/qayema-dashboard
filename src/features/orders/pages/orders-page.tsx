import { MessageCircle, ReceiptText } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { useOrderingMode } from '@/features/auth'
import { Alert, Button } from '@/shared/components/ui'
import { StatusFilter } from '@/features/orders/components/filters/status-filter'
import { OrderCard } from '@/features/orders/components/list/order-card'
import { useOrders, useSetOrderStatus } from '@/features/orders/hooks/use-orders'
import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'

export type OrdersPageProps = {
  /** Opens the Features page, where the owner picks how orders come in. */
  onOpenFeatures: () => void
}

/**
 * Orders guests placed in the menu, to call back, prepare and tick off. The
 * dashboard watches for new ones (useOrderPulse) and this page refreshes
 * itself while it is open.
 *
 * While orders go to WhatsApp they are handled there and never listed here:
 * we only know the guest opened WhatsApp. The page says so, and still lists
 * any orders placed in the menu before the switch, so they can be finished.
 */
export function OrdersPage({ onOpenFeatures }: OrdersPageProps) {
  const { t } = useTranslation('orders')
  const onWhatsApp = useOrderingMode() === 'whatsapp'
  const [filter, setFilter] = useState<OrderStatus | null>(null)
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)

  const orders = useOrders(filter)
  const setStatus = useSetOrderStatus()

  const move = useCallback(
    (order: Order, status: OrderStatus) =>
      setStatus.mutate({
        id: order.id,
        status,
        // Taking on a new order means the version on this card.
        guestUpdates: order.status === 'placed' ? order.guest_updates : undefined,
      }),
    [setStatus],
  )
  const confirmCancel = useCallback((order: Order) => setPendingCancel(order), [])

  const list = orders.data?.data ?? []
  const openCount = orders.data?.meta.open ?? 0
  const nothingHere = orders.isSuccess && list.length === 0 && filter === null

  const openFeatures = (
    <Button size="sm" variant="secondary" onClick={onOpenFeatures}>
      {t('whatsapp.action')}
    </Button>
  )

  // Nothing to list: the whole page says where the orders went.
  if (onWhatsApp && nothingHere) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        </div>
        <EmptyState
          fill
          icon={MessageCircle}
          title={t('whatsapp.title')}
          description={t('whatsapp.description')}
          action={openFeatures}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{t('page.description')}</p>
      </div>

      {/* Orders placed in the menu before the switch still need finishing;
          a short note above them says where new ones go. */}
      {onWhatsApp ? (
        // No title prop: the Alert fades a body under a title, which the
        // info colour cannot afford for contrast.
        <Alert variant="info">
          <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span>
              <span className="font-medium">{t('whatsapp.title')}.</span> {t('whatsapp.earlier')}
            </span>
            {openFeatures}
          </span>
        </Alert>
      ) : null}

      <StatusFilter value={filter} onChange={setFilter} openCount={openCount} />

      {orders.isPending ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-[14px] bg-[var(--hover-wash)]" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={ReceiptText}
          title={filter === null ? t('empty.title') : t('empty.filteredTitle')}
          description={filter === null ? t('empty.description') : t('empty.filteredDescription')}
        />
      ) : (
        <>
          {openCount > 0 && filter !== 'placed' ? (
            <Alert variant="info">{t('waiting', { count: openCount })}</Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {list.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={setStatus.isPending && setStatus.variables?.id === order.id}
                onMove={move}
                onCancel={confirmCancel}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        loading={setStatus.isPending}
        title={t('cancelDialog.title')}
        description={t('cancelDialog.description')}
        confirmLabel={t('cancelDialog.confirm')}
        onConfirm={() => {
          if (pendingCancel) {
            setStatus.mutate(
              { id: pendingCancel.id, status: 'cancelled' },
              { onSuccess: () => setPendingCancel(null) },
            )
          }
        }}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  )
}
