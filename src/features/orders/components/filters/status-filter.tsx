import { useTranslation } from 'react-i18next'
import { FilterChips } from '@/shared/components/ui'
import { ORDER_STATUSES, type OrderStatus } from '@/features/orders/schemas/order.schema'

export type StatusFilterProps = {
  /** Null means every status. */
  value: OrderStatus | null
  onChange: (value: OrderStatus | null) => void
  /** How many are still waiting, shown on the New chip. */
  openCount: number
  /**
   * `table`: an order at a table goes new, preparing, served, so only those
   * steps are offered, named as the table cards name them.
   */
  kind?: 'away' | 'table'
}

/** At a table there is no "ready": accepted reads "Preparing", done "Served". */
const TABLE_STEPS: {
  status: OrderStatus
  label: 'status.placed' | 'status.preparing' | 'status.served' | 'status.cancelled'
}[] = [
  { status: 'placed', label: 'status.placed' },
  { status: 'accepted', label: 'status.preparing' },
  { status: 'done', label: 'status.served' },
  { status: 'cancelled', label: 'status.cancelled' },
]

/** Every order, or one step of it; New carries how many are waiting. */
export function StatusFilter({ value, onChange, openCount, kind = 'away' }: StatusFilterProps) {
  const { t } = useTranslation('orders')
  const steps =
    kind === 'table'
      ? TABLE_STEPS
      : ORDER_STATUSES.map((status) => ({ status, label: `status.${status}` as const }))

  return (
    <FilterChips
      label={t('filter.label')}
      value={value}
      onChange={onChange}
      chips={[
        { value: null, label: t('filter.all') },
        ...steps.map(({ status, label }) => ({
          value: status,
          label: t(label),
          badge: status === 'placed' ? openCount : undefined,
        })),
      ]}
    />
  )
}
