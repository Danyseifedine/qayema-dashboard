import { ReceiptText } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ConfirmDialog, EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert } from '@/shared/components/ui'
import { StatusFilter } from '../components/detail/status-filter'
import { OrderCard } from '../components/list/order-card'
import { useOrders, useSetOrderStatus } from '../hooks/use-orders'
import type { Order, OrderStatus } from '../schemas/order.schema'

/**
 * Orders guests placed from the public menu.
 *
 * Nothing here pushes: a guest is also sent to WhatsApp when they order, which
 * is what actually reaches the owner. This page is the record and the place to
 * tick things off, and it refreshes itself while it is open.
 */
export function OrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | null>(null)
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null)

  const orders = useOrders(filter)
  const setStatus = useSetOrderStatus()

  const markDone = useCallback(
    (order: Order) => setStatus.mutate({ id: order.id, status: 'done' }),
    [setStatus],
  )
  const confirmCancel = useCallback((order: Order) => setPendingCancel(order), [])

  const list = orders.data?.data ?? []
  const openCount = orders.data?.meta.open ?? 0

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">Orders</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
          What guests ordered from your menu. Each one also reaches you on WhatsApp.
        </p>
      </div>

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
          title={filter === null ? 'No orders yet' : 'Nothing with that status'}
          description={
            filter === null
              ? 'When a guest orders from your menu it lands here, and on your WhatsApp.'
              : 'Try another status, or All.'
          }
        />
      ) : (
        <>
          {openCount > 0 && filter !== 'placed' ? (
            <Alert variant="info">
              {openCount === 1 ? '1 order is' : `${openCount} orders are`} still waiting.
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {list.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={setStatus.isPending && setStatus.variables?.id === order.id}
                onMarkDone={markDone}
                onCancel={confirmCancel}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        destructive
        loading={setStatus.isPending}
        title="Cancel this order?"
        description="It stays in your history, marked cancelled. The guest is not told, so let them know yourself."
        confirmLabel="Cancel order"
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
