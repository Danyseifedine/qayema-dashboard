import {
  IconBrandWhatsapp,
  IconEye,
  IconQrcode,
  IconReceipt,
  type TablerIcon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { ChangeLine } from '@/shared/components/data-display'
import { Skeleton } from '@/shared/components/feedback'
import { useStatsSummary } from '@/features/analytics'
import { changeBetween } from '@/shared/utils/format/change'
import { formatNumber } from '@/shared/utils/format/number'
import { usePreferencesStore } from '@/stores/preferences.store'
import { HomeTile, HomeTiles } from '@/features/overview/components/counts/home-tile'

export type TodayNumbersProps = {
  /** Opens the Analytics page, where each number is in full. */
  onOpen: () => void
}

type Tile = {
  id: string
  label: string
  icon: TablerIcon
  /** The icon circle's wash and the icon's colour. */
  tint: string
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
    return <Skeleton className="h-[118px]" />
  }
  if (summary.isError) return null

  const { totals, previous, order_channel: channel } = summary.data
  const whatsapp = channel === 'whatsapp'
  const tiles: Tile[] = [
    {
      id: 'views',
      label: t('today.views'),
      icon: IconEye,
      tint: 'bg-accent-wash text-accent',
      value: totals.views,
      before: previous?.views ?? null,
    },
    {
      id: 'scans',
      label: t('today.scans'),
      icon: IconQrcode,
      tint: 'bg-[var(--tint-violet-wash)] text-[var(--tint-violet)]',
      value: totals.qr_scans,
      before: previous?.qr_scans ?? null,
    },
    ...(totals.orders !== null
      ? [
          {
            id: 'orders',
            label: t(whatsapp ? 'today.sentToWhatsapp' : 'today.orders'),
            icon: whatsapp ? IconBrandWhatsapp : IconReceipt,
            tint: 'bg-[var(--live-wash)] text-[var(--live)]',
            value: totals.orders,
            before: previous?.orders ?? null,
          },
        ]
      : []),
  ]

  return (
    <HomeTiles title={t('today.title')} note={t('today.live')} columns={tiles.length === 3 ? 3 : 2}>
      {tiles.map((tile) => (
        <HomeTile
          key={tile.id}
          icon={tile.icon}
          tint={tile.tint}
          label={tile.label}
          value={formatNumber(tile.value, locale)}
          onClick={onOpen}
          foot={
            tile.before !== null ? (
              <ChangeLine
                change={changeBetween(tile.value, tile.before)}
                count={tile.value}
                against={t('today.vsYesterday')}
                className="flex flex-col"
              />
            ) : null
          }
        />
      ))}
    </HomeTiles>
  )
}
