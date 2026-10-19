import { IconPlus, IconToolsKitchen2 } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useTableOrderingMode } from '@/features/auth'
import { PictureEmptyState } from '@/shared/components/feedback'
import { Button } from '@/shared/components/ui'
import { OrderBoard } from '@/features/orders/components/list/order-board'
import { OrdersSwitch } from '@/features/orders/components/list/orders-switch'
import type { Order } from '@/features/orders/schemas/order.schema'

/** A tent card waiting on an empty table: before the first table order. */
const NO_ORDERS = '/assets/images/dashboard/no-orders.webp'

export type TableOrdersPageProps = {
  /** Opens the Tables page, where tables and their QR codes are set up. */
  onOpenTables: () => void
  /** Opens the Features page, where table orders can come here instead of WhatsApp. */
  onOpenFeatures: () => void
  /** Opens Delivery and pickup, while the restaurant takes those too. */
  onOpenOrders?: () => void
}

/**
 * Orders guests placed from their table's QR code, a table at a time so the
 * floor sees at a glance which table is waiting. A page of its own, with
 * its own way in, whichever way delivery and pickup come in.
 */
export function TableOrdersPage({
  onOpenTables,
  onOpenFeatures,
  onOpenOrders,
}: TableOrdersPageProps) {
  const { t } = useTranslation('orders')
  const onWhatsApp = useTableOrderingMode() === 'whatsapp'

  return (
    <div className="flex flex-1 flex-col gap-4">
      {onOpenOrders ? <OrdersSwitch value="table-orders" onOpen={onOpenOrders} /> : null}
      <OrderBoard
        kind="table"
        onWhatsApp={onWhatsApp}
        whatsApp={{
          titleKey: 'tables.whatsappTitle',
          alone: t('tables.whatsappDescription'),
          earlier: t('tables.whatsappEarlier'),
        }}
        onOpenFeatures={onOpenFeatures}
        filteredIcon={IconToolsKitchen2}
        sort={byTable}
        empty={
          <PictureEmptyState
            picture={NO_ORDERS}
            title={t('tables.emptyTitle')}
            description={t('tables.emptyDescription')}
            action={
              <Button
                block
                leadingIcon={<IconPlus aria-hidden className="size-4" />}
                onClick={onOpenTables}
              >
                {t('tables.openTables')}
              </Button>
            }
          />
        }
      />
    </div>
  )
}

/**
 * The orders a table at a time, each card naming its table: the table
 * waiting longest first (the one whose oldest open order came in earliest),
 * then the rest by name.
 */
function byTable(orders: readonly Order[]): Order[] {
  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const name = order.table ?? '-'
    const group = groups.get(name)
    if (group) group.push(order)
    else groups.set(name, [order])
  }

  const waitingSince = (list: Order[]) =>
    Math.min(
      ...list
        .filter((order) => order.status === 'placed' || order.status === 'accepted')
        .map((order) => Date.parse(order.placed_at ?? '') || Infinity),
      Infinity,
    )

  return [...groups.entries()]
    .sort(
      ([nameA, a], [nameB, b]) =>
        waitingSince(a) - waitingSince(b) ||
        nameA.localeCompare(nameB, undefined, { numeric: true }),
    )
    .flatMap(([, list]) => list)
}
