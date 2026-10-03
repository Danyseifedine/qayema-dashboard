import {
  Bike,
  Check,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/utils/dom/cn'
import { formatDateTime, formatTime } from '@/shared/utils/format/date'
import { usePreferencesStore } from '@/stores/preferences.store'
import type { Order, OrderStatus } from '@/features/orders/schemas/order.schema'

export type OrderCardProps = {
  order: Order
  busy?: boolean
  /** These take the order back, so the page can pass stable callbacks. */
  onMove: (order: Order, status: OrderStatus) => void
  onCancel: (order: Order) => void
}

const TONE: Record<Order['status'], string> = {
  placed: 'border-accent-border bg-accent-wash text-accent',
  accepted: 'border-status-info-border bg-status-info-wash text-status-info',
  ready: 'border-status-info-border bg-status-info-wash text-status-info',
  done: 'border-status-success-border bg-status-success-wash text-status-success',
  cancelled: 'border-[var(--line)] bg-[var(--hover-wash)] text-[var(--muted)]',
}

/**
 * One order, with everything the owner needs to read it at a glance and act
 * on it without opening anything.
 */
export const OrderCard = memo(function OrderCard({
  order,
  busy = false,
  onMove,
  onCancel,
}: OrderCardProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)
  const next = nextStep(order)

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] p-4 transition-colors hover:border-[var(--line-strong)]',
        order.status === 'cancelled' && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="force-ltr font-display text-[17px] leading-tight">{order.reference}</p>
          {order.placed_at !== null ? (
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {formatDateTime(order.placed_at, locale)}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'rounded-full border-[0.5px] px-2.5 py-1 text-[11.5px] font-medium',
            TONE[order.status],
          )}
        >
          {t(statusLabel(order))}
        </span>
      </div>

      {order.guest_updated_at !== null ? (
        <p
          className={cn(
            'flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-medium',
            // Loud while it still waits to be accepted (a guest can only
            // change it until then): the kitchen must read the new version.
            order.status === 'placed'
              ? 'border-[0.5px] border-status-warn-border bg-status-warn-wash text-status-warn'
              : 'text-[var(--muted)]',
          )}
        >
          <Pencil aria-hidden className="size-3.5 shrink-0" />
          {t('card.changed', {
            count: order.guest_updates,
            time: formatTime(order.guest_updated_at, locale),
          })}
        </p>
      ) : null}

      {order.fulfilment !== null ? <GuestDetails order={order} /> : null}

      <ul className="flex flex-col gap-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="min-w-0">
              <span className="tabular-nums text-[var(--muted)]">{item.quantity}×</span>{' '}
              <span>{item.name}</span>
              {item.options ? (
                <span className="block text-[12.5px] text-[var(--muted)]">
                  {[
                    ...item.options.variants.map((variant) => `${variant.name}: ${variant.choice}`),
                    ...item.options.addons.map((addon) => `+ ${addon.name}`),
                  ].join(' · ')}
                </span>
              ) : null}
            </span>
            <Money
              amount={Number(item.line_total)}
              currency={order.currency}
              className="shrink-0 text-[13px] text-[var(--muted)]"
            />
          </li>
        ))}
      </ul>

      {order.note !== null ? (
        <p className="rounded-[10px] bg-[var(--field)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={next.status === 'done' ? 'secondary' : 'primary'}
              loading={busy}
              leadingIcon={<next.icon className="size-3.5" />}
              onClick={() => onMove(order, next.status)}
            >
              {t(next.label)}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              leadingIcon={<X className="size-3.5" />}
              onClick={() => onCancel(order)}
              className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
            >
              {t('card.cancel')}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
})

type NextStep = {
  status: OrderStatus
  label: 'card.accept' | 'card.onItsWay' | 'card.ready' | 'card.markDone'
  icon: LucideIcon
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
      return order.fulfilment === null
        ? { status: 'done', label: 'card.markDone', icon: Check }
        : { status: 'accepted', label: 'card.accept', icon: Check }
    case 'accepted':
      return delivery
        ? { status: 'ready', label: 'card.onItsWay', icon: Bike }
        : { status: 'ready', label: 'card.ready', icon: ShoppingBag }
    case 'ready':
      return { status: 'done', label: 'card.markDone', icon: Check }
    default:
      return null
  }
}

/** "Ready" is "On its way" for a delivery. */
function statusLabel(order: Order): `status.${OrderStatus}` | 'status.onItsWay' {
  return order.status === 'ready' && order.fulfilment === 'delivery'
    ? 'status.onItsWay'
    : `status.${order.status}`
}

/**
 * Who ordered, how to reach them and where the food goes, for an order
 * placed in the menu. The name, phone and address leave an order after 90
 * days, so any of them may be gone on an old one.
 */
function GuestDetails({ order }: { order: Order }) {
  const { t } = useTranslation('orders')
  const Icon = order.fulfilment === 'delivery' ? Bike : ShoppingBag
  const link = 'inline-flex items-center gap-1.5 text-accent hover:underline'

  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] bg-[var(--field)] px-3 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {order.name !== null ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
            <User aria-hidden className="size-3.5 shrink-0" />
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
            <Phone aria-hidden className="size-3.5" />
            {order.phone}
          </a>
          <a
            href={`https://wa.me/${order.phone.replace(/\D+/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            <MessageCircle aria-hidden className="size-3.5" />
            {t('card.whatsapp')}
          </a>
        </div>
      ) : null}
      {order.address !== null ? (
        <p className="flex items-start gap-1.5 leading-snug text-[var(--muted)]">
          <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
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
