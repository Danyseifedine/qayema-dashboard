import { IconChevronDown, type TablerIcon } from '@tabler/icons-react'
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState, SkeletonList } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { StatusFilter } from '@/features/orders/components/filters/status-filter'
import { WhatsAppNotice } from '@/features/orders/components/notices/whatsapp-notice'
import { CancelOrderDialog } from '@/features/orders/components/dialogs/cancel-order-dialog'
import { DeleteOrderDialog } from '@/features/orders/components/dialogs/delete-order-dialog'
import { OrderCard } from '@/features/orders/components/list/order-card'
import { useOrderActions } from '@/features/orders/hooks/use-order-actions'
import { useOrders } from '@/features/orders/hooks/use-orders'
import type { Order, OrderKind, OrderStatus } from '@/features/orders/schemas/order.schema'

/**
 * The order editor (its dish and build pickers) loads the first time an
 * order is edited: the Orders page is part of the first download.
 */
const EditOrderDialog = lazy(() =>
  import('@/features/orders/components/edit/edit-order-dialog').then((module) => ({
    default: module.EditOrderDialog,
  })),
)

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
 * their ⋮. The newest 30 come first, "Show more" adds the next 30. While new
 * ones go to WhatsApp it says so, and still lists those placed here before
 * the switch, so they can be finished.
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
  // Once loaded it stays mounted, so closing it is as before.
  const [editorWanted, setEditorWanted] = useState(false)
  if (actions.editDialog.order && !editorWanted) setEditorWanted(true)

  const list = useMemo(() => {
    const received = orders.data?.orders ?? []
    return sort ? sort(received) : received
  }, [orders.data, sort])
  const openCount = orders.data?.open ?? 0
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
          className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-[106rem]:grid-cols-3"
          itemClassName="h-48"
        />
      ) : orders.isError ? (
        <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />
      ) : list.length === 0 && filter === null ? (
        empty
      ) : list.length === 0 ? (
        <EmptyState
          icon={filteredIcon}
          title={t('empty.filteredTitle')}
          description={t('empty.filteredDescription')}
        />
      ) : (
        <>
          {openCount > 0 && filter !== 'placed' ? (
            // A tap shows only those.
            <Alert variant="warning" onClick={() => setFilter('placed')}>
              {t('waiting', { count: openCount })}
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-[106rem]:grid-cols-3">
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

          {orders.hasNextPage ? (
            <Button
              variant="secondary"
              className="self-center"
              loading={orders.isFetchingNextPage}
              leadingIcon={<IconChevronDown aria-hidden className="size-4" />}
              onClick={() => void orders.fetchNextPage()}
            >
              {t('showMore')}
            </Button>
          ) : null}
        </>
      )}

      <CancelOrderDialog {...actions.cancelDialog} />
      <DeleteOrderDialog {...actions.deleteDialog} />
      {editorWanted ? (
        <Suspense fallback={null}>
          <EditOrderDialog {...actions.editDialog} />
        </Suspense>
      ) : null}
    </div>
  )
}
