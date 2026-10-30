import {
  IconBike,
  IconBrandWhatsapp,
  IconCheck,
  type TablerIcon,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconTrash,
  IconShoppingBag,
  IconToolsKitchen2,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import { memo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Money, StatusChip, type ChipTone } from '@/shared/components/data-display'
import { ActionMenu, Alert, Button, type ActionMenuItem } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { formatDateTime, formatTime } from '@/shared/utils/format/date'
import { formatMoney, formatRate } from '@/shared/utils/format/money'
import { usePreferencesStore } from '@/stores/preferences.store'
import { OrderPosStatus } from '@/features/orders/components/list/order-pos-status'
import { TableTent } from '@/features/orders/components/list/table-tent'
import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'
import { choiceParts, isInPos, statusLabel } from '@/features/orders/utils/order-text'

export type OrderCardProps = {
  order: Order
  busy?: boolean
  /** These take the order back, so the page can pass stable callbacks. */
  onMove: (order: Order, status: OrderStatus) => void
  onCancel: (order: Order) => void
  onEdit: (order: Order) => void
  onDelete: (order: Order) => void
}

/** New is the loudest; one being made is green; a finished one goes quiet. */
const TONE: Record<OrderStatus, ChipTone> = {
  placed: 'gold',
  accepted: 'success',
  ready: 'success',
  done: 'faded',
  cancelled: 'neutral',
}

/**
 * One order, with everything the owner needs to read it at a glance: an
 * order to a table leads with the table, its tent card beside it. The one
 * step that moves it on is a button; editing, cancelling and deleting wait
 * behind the ⋮.
 */
export const OrderCard = memo(function OrderCard({
  order,
  busy = false,
  onMove,
  onCancel,
  onEdit,
  onDelete,
}: OrderCardProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)
  const titleId = useId()
  // In the restaurant's POS, it is moved on there: no steps and no edits here.
  const inPos = isInPos(order)
  const next = inPos ? null : nextStep(order)
  const table = order.table
  // A line in the restaurant's second currency, whose rate the card then says.
  const second = order.items.find((item) => item.currency !== order.currency)?.currency

  const more: ActionMenuItem[] = [
    // A cancelled order is no longer anyone's to change.
    ...(order.status !== 'cancelled' && !inPos
      ? [
          {
            label: t('card.editShort'),
            ariaLabel: t('card.edit', { reference: order.reference }),
            icon: IconPencil,
            onSelect: () => onEdit(order),
          },
        ]
      : []),
    ...(next !== null
      ? [{ label: t('card.cancel'), icon: IconX, onSelect: () => onCancel(order) }]
      : []),
    {
      label: t('card.deleteShort'),
      ariaLabel: t('card.delete', { reference: order.reference }),
      icon: IconTrash,
      onSelect: () => onDelete(order),
      danger: true,
    },
  ]

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        '@container glass-card rounded-card p-3.5 sm:p-4',
        order.status === 'cancelled' && 'opacity-70',
      )}
    >
      <div className="flex gap-4">
        {/* Beside everything on a roomy card; beside the title on a narrow one. */}
        {table !== null ? (
          <TableTent
            name={table}
            className="hidden aspect-[9/10] w-36 shrink-0 self-start @min-[28rem]:block"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start gap-3">
            {table !== null ? (
              <TableTent name={table} className="size-16 shrink-0 @min-[28rem]:hidden" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span
                  id={titleId}
                  className={cn(
                    'font-display text-[19px] leading-tight',
                    table === null && 'force-ltr',
                  )}
                >
                  {table ?? order.reference}
                </span>
                <StatusChip tone={TONE[order.status]}>{t(statusLabel(order))}</StatusChip>
              </p>
              {order.placed_at !== null || table !== null ? (
                <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                  {order.placed_at !== null ? formatDateTime(order.placed_at, locale) : null}
                  {/* The table leads; the reference is still there to match a guest's. */}
                  {table !== null ? (
                    <>
                      {order.placed_at !== null ? ' · ' : null}
                      <span className="force-ltr">{order.reference}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
            <ActionMenu
              label={t('card.actions', { reference: order.reference })}
              items={more}
              disabled={busy}
            />
          </div>

          {order.guest_updated_at !== null ? (
            // Loud while it still waits to be accepted (a guest can only
            // change it until then): the kitchen must read the new version.
            <Alert size="sm" variant={order.status === 'placed' ? 'warning' : 'info'}>
              {t('card.changed', {
                count: order.guest_updates,
                time: formatTime(order.guest_updated_at, locale),
              })}
            </Alert>
          ) : null}

          {order.owner_updated_at !== null ? (
            <Alert variant="info">
              {t('card.ownerChanged', { time: formatTime(order.owner_updated_at, locale) })}
            </Alert>
          ) : null}

          <OrderPosStatus order={order} />

          {order.fulfilment !== null ? <GuestDetails order={order} /> : null}

          <ul className="flex flex-col gap-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0">
                  <span className="tabular-nums text-[var(--muted)]">{item.quantity}×</span>{' '}
                  <span>{item.name}</span>
                  {item.options ? (
                    <span className="block text-[12.5px] text-[var(--muted)]">
                      {choiceParts(
                        item.options.variants,
                        item.options.addons,
                        item.options.builds,
                      ).join(' · ')}
                    </span>
                  ) : null}
                  {item.offer ? (
                    <span className="block text-[12.5px] text-accent">
                      {t('card.onOffer', {
                        offer: item.offer.title,
                        was: formatMoney(
                          Number(item.offer.full_price) * item.quantity,
                          item.currency,
                        ),
                      })}
                    </span>
                  ) : null}
                </span>
                <Money
                  amount={Number(item.line_total)}
                  currency={item.currency}
                  className="shrink-0 text-[14px]"
                />
              </li>
            ))}
          </ul>

          {second !== undefined && order.exchange_rate !== null ? (
            // Lines in the second currency count in the total at this rate.
            <p className="text-[12px] text-[var(--muted)]">
              {t('card.rate', { rate: formatRate(order.currency, second, order.exchange_rate) })}
            </p>
          ) : null}

          {order.note !== null ? (
            <p className="inset-tile px-3 py-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
              {order.note}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t-[0.5px] border-[var(--line)] pt-3">
            <Money
              amount={Number(order.total)}
              currency={order.currency}
              className="text-[15px] font-medium text-accent"
            />
            {next !== null ? (
              <Button
                size="sm"
                variant={next.status === 'done' ? 'secondary' : 'primary'}
                loading={busy}
                leadingIcon={<next.icon className="size-3.5" />}
                onClick={() => onMove(order, next.status)}
              >
                {t(next.label)}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
})

type NextStep = {
  status: OrderStatus
  label:
    | 'card.accept'
    | 'card.startPreparing'
    | 'card.onItsWay'
    | 'card.ready'
    | 'card.served'
    | 'card.markDone'
  icon: TablerIcon
}

/**
 * The one button that moves an order on. One placed in the menu is accepted
 * first (the guest sees a person took it), then sent out or made ready, then
 * done; the guest's page follows each step. An order without a way to follow
 * it goes straight to done.
 */
function nextStep(order: Order): NextStep | null {
  const delivery = order.fulfilment === 'delivery'

  switch (order.status) {
    case 'placed':
      if (order.fulfilment === 'dine_in') {
        return { status: 'accepted', label: 'card.startPreparing', icon: IconCheck }
      }
      return order.fulfilment === null
        ? { status: 'done', label: 'card.markDone', icon: IconCheck }
        : { status: 'accepted', label: 'card.accept', icon: IconCheck }
    case 'accepted':
      // At a table there is no "ready" for the guest to hear: served is next.
      if (order.fulfilment === 'dine_in') {
        return { status: 'done', label: 'card.served', icon: IconToolsKitchen2 }
      }
      return delivery
        ? { status: 'ready', label: 'card.onItsWay', icon: IconBike }
        : { status: 'ready', label: 'card.ready', icon: IconShoppingBag }
    case 'ready':
      return order.fulfilment === 'dine_in'
        ? { status: 'done', label: 'card.served', icon: IconToolsKitchen2 }
        : { status: 'done', label: 'card.markDone', icon: IconCheck }
    default:
      return null
  }
}

/**
 * Who ordered, how to reach them and where the food goes, for an order
 * placed in the menu. The name, phone and address leave an order after 90
 * days, so any of them may be gone on an old one.
 */
function GuestDetails({ order }: { order: Order }) {
  const { t } = useTranslation('orders')
  const Icon =
    order.fulfilment === 'delivery'
      ? IconBike
      : order.fulfilment === 'dine_in'
        ? IconToolsKitchen2
        : IconShoppingBag
  const link = 'inline-flex items-center gap-1.5 text-accent hover:underline'

  return (
    <div className="flex flex-col gap-1.5 inset-tile px-3 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {order.name !== null ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
            <IconUser aria-hidden className="size-3.5 shrink-0" />
            <span className="break-words">{order.name}</span>
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          <Icon aria-hidden className="size-3.5" />
          {t(`card.${order.fulfilment ?? 'pickup'}`)}
        </span>
      </div>
      {order.phone !== null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={`tel:${order.phone}`} className={cn(link, 'force-ltr tabular-nums')}>
            <IconPhone aria-hidden className="size-3.5" />
            {order.phone}
          </a>
          <a
            href={`https://wa.me/${order.phone.replace(/\D+/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            <IconBrandWhatsapp aria-hidden className="size-4" />
            {t('card.whatsapp')}
          </a>
        </div>
      ) : null}
      {order.address !== null ? (
        <p className="flex items-start gap-1.5 leading-snug text-[var(--muted)]">
          <IconMapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{order.address}</span>
        </p>
      ) : null}
      {order.map_url !== null ? (
        <a href={order.map_url} target="_blank" rel="noreferrer" className={cn(link, 'self-start')}>
          {t('card.openMap')}
        </a>
      ) : null}
    </div>
  )
}
