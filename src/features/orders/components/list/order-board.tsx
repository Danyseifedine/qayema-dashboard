import type { TablerIcon } from '@tabler/icons-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState, SkeletonList } from '@/shared/components/feedback'
import { StatusFilter } from '@/features/orders/components/filters/status-filter'
import { WaitingBar } from '@/features/orders/components/notices/waiting-bar'
import { WhatsAppNotice } from '@/features/orders/components/notices/whatsapp-notice'
import { EditOrderDialog } from '@/features/orders/components/edit/edit-order-dialog'
import { CancelOrderDialog } from '@/features/orders/components/dialogs/cancel-order-dialog'
import { DeleteOrderDialog } from '@/features/orders/components/dialogs/delete-order-dialog'
import { OrderCard } from '@/features/orders/components/list/order-card'
import { useOrderActions } from '@/features/orders/hooks/use-order-actions'
import { useOrders } from '@/features/orders/hooks/use-orders'
import type { Order, OrderKind, OrderStatus } from '@/features/orders/schemas/order.schema'

export type OrderBoardProps = {
  kind: OrderKind
  /** New orders of this kind go to WhatsApp, so they are never listed here. */
  onWhatsApp: boolean
  whatsApp: {
    titleKey: 'whatsapp.title' | 'tables.whatsappTitle'
    /** With nothing to list: where the orders go, and how to change it. */
    alone: string
    /** Above the orders placed here before the switch. */
    earlier: string
  }
  onOpenFeatures: () => void
  /** Before the first order of this kind. */
  empty: ReactNode
  /** The picture on "nothing with that status". */
  filteredIcon: TablerIcon
  /** The order the cards are in; as the server sends them without it. */
  sort?: (orders: readonly Order[]) => Order[]
}

/**
 * A page of orders of one kind, to work through: the status filter, how many
 * are waiting, the cards with their one next step, and the dialogs behind
 * their ⋮. While new ones go to WhatsApp it says so, and still lists those
 * placed here before the switch, so they can be finished.
 */
export function OrderBoard({
  kind,
  onWhatsApp,
  whatsApp,
  onOpenFeatures,
  empty,
  filteredIcon,
  sort,
}: OrderBoardProps) {
  const { t } = useTranslation('orders')
  const [filter, setFilter] = useState<OrderStatus | null>(null)
  const orders = useOrders(kind, filter)
  const actions = useOrderActions()

  const list = useMemo(() => {
    const received = orders.data?.data ?? []
    return sort ? sort(received) : received
  }, [orders.data, sort])
  const openCount = orders.data?.meta.open ?? 0
  const nothingHere = orders.isSuccess && list.length === 0 && filter === null

  const notice = (description: string) => (
    <WhatsAppNotice
      titleKey={whatsApp.titleKey}
      description={description}
      onOpenFeatures={onOpenFeatures}
    />
  )

  // Nothing to list: the whole page says where the orders went.
  if (onWhatsApp && nothingHere) {
    return <div className="flex flex-1 flex-col gap-4">{notice(whatsApp.alone)}</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {onWhatsApp ? notice(whatsApp.earlier) : null}

      <StatusFilter value={filter} onChange={setFilter} openCount={openCount} kind={kind} />

      {orders.isPending ? (
        <SkeletonList
          count={2}
          className="grid grid-cols-1 gap-3 lg:grid-cols-2"
          itemClassName="h-48"
        />
      ) : orders.isError ? (
        <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : list.length === 0 && filter === null ? (
        empty
      ) : list.length === 0 ? (
        <EmptyState
          fill
          icon={filteredIcon}
          title={t('empty.filteredTitle')}
          description={t('empty.filteredDescription')}
        />
      ) : (
        <>
          {openCount > 0 && filter !== 'placed' ? (
            <WaitingBar
              text={t('waiting', { count: openCount })}
              onShow={() => setFilter('placed')}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={actions.busy(order)}
                onMove={actions.move}
                onCancel={actions.askCancel}
                onEdit={actions.startEdit}
                onDelete={actions.askDelete}
              />
            ))}
          </div>
        </>
      )}

      <CancelOrderDialog {...actions.cancelDialog} />
      <DeleteOrderDialog {...actions.deleteDialog} />
      <EditOrderDialog {...actions.editDialog} />
    </div>
  )
}
