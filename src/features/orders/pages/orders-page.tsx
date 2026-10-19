import { IconReceipt } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useOrderingMode } from '@/features/auth'
import { EmptyState } from '@/shared/components/feedback'
import { OrderBoard } from '@/features/orders/components/list/order-board'
import { OrdersSwitch } from '@/features/orders/components/list/orders-switch'

export type OrdersPageProps = {
  /** Opens the Features page, where the owner picks how orders come in. */
  onOpenFeatures: () => void
  /** Opens Table orders, while the restaurant takes those too. */
  onOpenTableOrders?: () => void
}

/**
 * Orders guests placed in the menu to be delivered or picked up, to call
 * back, prepare and tick off; orders to a table have their own page. The
 * dashboard watches for new ones (useOrderPulse) and this page refreshes
 * itself while it is open.
 */
export function OrdersPage({ onOpenFeatures, onOpenTableOrders }: OrdersPageProps) {
  const { t } = useTranslation('orders')
  const onWhatsApp = useOrderingMode() === 'whatsapp'

  return (
    <div className="flex flex-1 flex-col gap-4">
      {onOpenTableOrders ? <OrdersSwitch value="orders" onOpen={onOpenTableOrders} /> : null}
      <OrderBoard
        kind="away"
        onWhatsApp={onWhatsApp}
        whatsApp={{
          titleKey: 'whatsapp.title',
          alone: t('whatsapp.description'),
          earlier: t('whatsapp.earlier'),
        }}
        onOpenFeatures={onOpenFeatures}
        filteredIcon={IconReceipt}
        empty={
          <EmptyState
            fill
            icon={IconReceipt}
            title={t('empty.title')}
            description={t('empty.description')}
          />
        }
      />
    </div>
  )
}
