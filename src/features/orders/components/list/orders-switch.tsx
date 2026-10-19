import { useTranslation } from 'react-i18next'
import { PageSwitch } from '@/shared/components/ui'

/**
 * Delivery and pickup, and Table orders, side by side at the top of both
 * pages on a phone: the Orders tab holds the two. Shown only while the
 * restaurant takes both; with one kind the tab simply opens it.
 */
export function OrdersSwitch({
  value,
  onOpen,
}: {
  value: 'orders' | 'table-orders'
  onOpen: () => void
}) {
  const { t } = useTranslation()

  return (
    <PageSwitch
      label={t('nav.ordersGroup')}
      value={value}
      options={[
        { value: 'orders', label: t('nav.orders') },
        { value: 'table-orders', label: t('nav.tableOrders') },
      ]}
      onOpen={onOpen}
    />
  )
}
