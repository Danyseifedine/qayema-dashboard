import {
  IconArrowDown,
  IconArrowUp,
  IconBrandWhatsapp,
  IconEye,
  IconMinus,
  IconQrcode,
  IconReceipt,
  type TablerIcon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useStatsSummary } from '@/features/analytics'
import { changeBetween } from '@/shared/utils/format/change'
import { formatNumber } from '@/shared/utils/format/number'
import { cn } from '@/shared/utils/dom/cn'
import type { Locale } from '@/shared/constants/locales'
import { usePreferencesStore } from '@/stores/preferences.store'

export type TodayNumbersProps = {
  /** Opens the Analytics page, where each number is in full. */
  onOpen: () => void
}

type Tile = {
  id: string
  label: string
  icon: TablerIcon
  /** The icon circle's wash, and the icon's colour. */
  wash: string
  ink: string
  value: number
  before: number | null
}

/**
 * Today on the menu, in three numbers (views, QR scans, orders), each against
 * yesterday up to the same time, and
 * each one tap from Analytics. Asked again every minute while Home is open.
 * Nothing shows while they first load or if they cannot: the rest of Home
 * does not wait on them.
 */
export function TodayNumbers({ onOpen }: TodayNumbersProps) {
  const { t } = useTranslation('overview')
  const locale = usePreferencesStore((state) => state.locale)
  const summary = useStatsSummary('today', { live: true })

  if (summary.isPending) {
    return <div className="h-[118px] animate-pulse rounded-[16px] bg-[var(--hover-wash)]" />
  }
  if (summary.isError) return null

  const { totals, previous, order_channel: channel } = summary.data
  const whatsapp = channel === 'whatsapp'
  const tiles: Tile[] = [
    {
      id: 'views',
      label: t('today.views'),
      icon: IconEye,
      wash: 'bg-accent-wash',
      ink: 'text-accent',
      value: totals.views,
      before: previous?.views ?? null,
    },
    {
      id: 'scans',
      label: t('today.scans'),
      icon: IconQrcode,
      wash: 'bg-[var(--tint-violet-wash)]',
      ink: 'text-[var(--tint-violet)]',
      value: totals.qr_scans,
      before: previous?.qr_scans ?? null,
    },
    ...(totals.orders !== null
      ? [
          {
            id: 'orders',
            label: t(whatsapp ? 'today.sentToWhatsapp' : 'today.orders'),
            icon: whatsapp ? IconBrandWhatsapp : IconReceipt,
            wash: 'bg-[var(--live-wash)]',
            ink: 'text-[var(--live)]',
            value: totals.orders,
            before: previous?.orders ?? null,
          },
        ]
      : []),
  ]

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h3
          id="today-title"
          className="font-sans text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase"
        >
          {t('today.title')}
        </h3>
        <p className="text-[11px] text-[var(--muted)]">{t('today.live')}</p>
      </div>
      <div
        className={cn(
          'grid gap-1.5 min-[380px]:gap-2',
          tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        {tiles.map((tile) => (
          <TodayTile key={tile.id} tile={tile} locale={locale} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function TodayTile({ tile, locale, onOpen }: { tile: Tile; locale: Locale; onOpen: () => void }) {
  const { t } = useTranslation('overview')
  const Icon = tile.icon

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        '@container flex min-w-0 flex-col gap-2 glass-card rounded-[16px] p-2 text-start min-[380px]:p-2.5',
        'transition-colors hover:bg-[var(--hover-wash)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      )}
    >
      {/* The label and the number beside the icon; in a narrow tile the icon
          steps down, and on the narrowest phones they go under it, so no
          word breaks. */}
      <span className="grid grid-cols-1 gap-y-1 @min-[5rem]:grid-cols-[auto_minmax(0,1fr)] @min-[5rem]:items-center @min-[5rem]:gap-x-1.5 @min-[5rem]:gap-y-0.5">
        <span
          aria-hidden
          className={cn(
            'grid size-6 shrink-0 @min-[5rem]:row-span-2 place-items-center rounded-full @min-[6rem]:size-8',
            tile.wash,
            tile.ink,
          )}
        >
          <Icon className="size-3 @min-[6rem]:size-4" stroke={1.7} />
        </span>
        <span className="text-[11px] leading-tight [overflow-wrap:anywhere] @min-[6rem]:text-[11.5px]">
          {tile.label}
        </span>
        <span className="text-[22px] leading-none font-semibold tabular-nums">
          {formatNumber(tile.value, locale)}
        </span>
      </span>
      {/* At the tile's foot, so the three line up when a label takes two lines. */}
      {tile.before !== null ? (
        <span className="mt-auto flex flex-col text-[11px] leading-snug">
          <Change value={tile.value} before={tile.before} locale={locale} />
          <span className="text-[var(--muted)]">{t('today.vsYesterday')}</span>
        </span>
      ) : null}
    </button>
  )
}

/** "↑ +50%"; from nothing yesterday, the count itself ("↑ +3"). */
function Change({ value, before, locale }: { value: number; before: number; locale: Locale }) {
  const change = changeBetween(value, before)
  const percent = change === null ? null : Math.round(change * 100)
  const up = change === null || (percent ?? 0) > 0
  const flat = percent === 0
  const Arrow = flat ? IconMinus : up ? IconArrowUp : IconArrowDown

  return (
    <span
      dir="ltr"
      className={cn(
        'inline-flex items-center gap-0.5 self-start font-medium tabular-nums',
        flat ? 'text-[var(--muted)]' : up ? 'text-[var(--live)]' : 'text-[var(--status-danger)]',
      )}
    >
      <Arrow aria-hidden className="size-3" stroke={2.2} />
      {percent === null
        ? `+${formatNumber(value, locale)}`
        : `${percent > 0 ? '+' : ''}${formatNumber(percent, locale)}%`}
    </span>
  )
}
