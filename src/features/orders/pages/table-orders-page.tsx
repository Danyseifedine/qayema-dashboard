import { IconToolsKitchen2 } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState } from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import { StatusFilter } from '@/features/orders/components/filters/status-filter'
import { EditOrderDialog } from '@/features/orders/components/edit/edit-order-dialog'
import { CancelOrderDialog } from '@/features/orders/components/list/cancel-order-dialog'
import { DeleteOrderDialog } from '@/features/orders/components/list/delete-order-dialog'
import { OrderCard } from '@/features/orders/components/list/order-card'
import { useOrderActions } from '@/features/orders/hooks/use-order-actions'
import { useOrders } from '@/features/orders/hooks/use-orders'
import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'

export type TableOrdersPageProps = {
  /** Opens the Tables page, where tables and their QR codes are set up. */
  onOpenTables: () => void
}

/**
 * Orders guests placed from their table's QR code, grouped by table so the
 * floor sees at a glance which table is waiting. A page of its own: these
 * are placed in the menu whichever way delivery and pickup come in.
 */
export function TableOrdersPage({ onOpenTables }: TableOrdersPageProps) {
  const { t } = useTranslation('orders')
  const [filter, setFilter] = useState<OrderStatus | null>(null)

  const orders = useOrders('table', filter)
  const actions = useOrderActions()

  const list = useMemo(() => orders.data?.data ?? [], [orders.data])
  const openCount = orders.data?.meta.open ?? 0
  const groups = useMemo(() => byTable(list), [list])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('tables.title')}</h2>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
          {t('tables.description')}
        </p>
      </div>

      <StatusFilter value={filter} onChange={setFilter} openCount={openCount} kind="table" />

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
          icon={IconToolsKitchen2}
          title={filter === null ? t('tables.emptyTitle') : t('empty.filteredTitle')}
          description={
            filter === null ? t('tables.emptyDescription') : t('empty.filteredDescription')
          }
          action={
            filter === null ? (
              <Button variant="secondary" onClick={onOpenTables}>
                {t('tables.openTables')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {openCount > 0 && filter !== 'placed' ? (
            <Alert variant="info">{t('waiting', { count: openCount })}</Alert>
          ) : null}

          {groups.map((group) => (
            <section key={group.name} aria-label={group.name} className="flex flex-col gap-2.5">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold">
                <IconToolsKitchen2 aria-hidden className="size-4 text-[var(--muted)]" />
                {group.name}
                <span className="text-[12.5px] font-normal text-[var(--muted)]">
                  {t('tables.count', { count: group.orders.length })}
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {group.orders.map((order) => (
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
            </section>
          ))}
        </>
      )}

      <CancelOrderDialog {...actions.cancelDialog} />
      <DeleteOrderDialog {...actions.deleteDialog} />
      <EditOrderDialog {...actions.editDialog} />
    </div>
  )
}

/**
 * The orders by the table they went to, a table waiting longest first: the
 * one whose oldest open order came in earliest, then the rest by name.
 */
function byTable(orders: readonly Order[]): { name: string; orders: Order[] }[] {
  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const name = order.table ?? '-'
    groups.set(name, [...(groups.get(name) ?? []), order])
  }

  const waitingSince = (list: Order[]) =>
    Math.min(
      ...list
        .filter((order) => order.status === 'placed' || order.status === 'accepted')
        .map((order) => Date.parse(order.placed_at ?? '') || Infinity),
      Infinity,
    )

  return [...groups.entries()]
    .map(([name, list]) => ({ name, orders: list }))
    .sort(
      (a, b) =>
        waitingSince(a.orders) - waitingSince(b.orders) ||
        a.name.localeCompare(b.name, undefined, { numeric: true }),
    )
}
