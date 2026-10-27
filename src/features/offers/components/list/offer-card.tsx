import {
  IconCalendarTime,
  IconDiscount2,
  IconEye,
  IconLayoutBoard,
  IconTag,
  type TablerIcon,
} from '@tabler/icons-react'
import type { TFunction } from 'i18next'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusChip, type ChipTone } from '@/shared/components/data-display'
import { Alert, RowActions, Switch } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import type { Offer } from '@/features/offers/schemas/offer.schema'
import { discountLine, discountNumber } from '@/features/offers/utils/discount'
import type { OfferWarning } from '@/features/offers/utils/offer-warnings'
import { joinList, scheduleSummary, statusLine } from '@/features/offers/utils/offer-schedule'
import { DealSummary } from '@/features/offers/components/list/deal-summary'

const STATUS_TONE: Record<Offer['status'], ChipTone> = {
  live: 'success',
  scheduled: 'info',
  paused: 'warning',
  ended: 'neutral',
  off: 'warning',
}

export type OfferCardProps = {
  offer: Offer
  locale: Locale
  currency: string
  stats: { shown: number; taps: number } | undefined
  /** What may go wrong with it on the menu (offerWarnings). */
  warnings: readonly OfferWarning[]
  /** The drag grip, supplied by the sortable wrapper. */
  handle: ReactNode
  /** These take the offer back, so the page passes callbacks that never change. */
  onEdit: (offer: Offer) => void
  onDelete: (offer: Offer) => void
  onActive: (offer: Offer, active: boolean) => void
}

/**
 * One offer: its picture, name and whether it is live now or when it starts,
 * with the switch that pauses it; then a line each for where it shows, its
 * schedule and its discount; what may go wrong with it, in its own box; and
 * at its foot how often guests saw and tapped it, with edit and delete.
 * Stacked like this it reads the same on a phone as on a wide screen.
 */
export const OfferCard = memo(function OfferCard({
  offer,
  locale,
  currency,
  stats,
  warnings,
  handle,
  onEdit,
  onDelete,
  onActive,
}: OfferCardProps) {
  const { t } = useTranslation('offers')
  // The offer's own words are in the menu's language; the card's are the
  // dashboard's, and so is how they are joined and dated.
  const ui = usePreferencesStore((state) => state.locale)
  const name = nameOf(offer, locale, t)
  const title = translated(offer.title, locale)
  const warningText = (warning: OfferWarning): string => {
    switch (warning.kind) {
      case 'noDishes':
        return t('warnings.noDishes')
      case 'allHidden':
        return t('warnings.allHidden')
      case 'tooBig':
        return t('warnings.tooBig', { dishes: joinList(warning.dishes, ui) })
      case 'waits':
        return t('warnings.waits', { title: nameOf(warning.behind, locale, t) })
      case 'schedulesOff':
        return t('warnings.schedulesOff')
      case 'placesOff':
        return t('warnings.placesOff')
      case 'placeOff':
        return t(`warnings.placeOff.${warning.place}`)
      case 'discountOff':
        return t('warnings.discountOff')
    }
  }
  const discount = discountLine(
    {
      type: offer.discount_type,
      value: discountNumber(offer.discount_value ?? ''),
      dishes: offer.dish_ids.length,
    },
    { locale: ui, currency },
  )

  return (
    <div className="flex flex-col gap-3 glass-card rounded-card p-3.5 sm:p-4">
      {/* Who it is: the picture, the name and whether it is on now, with its switch. */}
      <div className="flex items-start gap-2">
        <div className="-ms-1.5 flex h-[54px] items-center">{handle}</div>
        <button
          type="button"
          onClick={() => onEdit(offer)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-tile text-start focus-ring"
        >
          <span className="inset-tile grid h-[54px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-tile">
            {offer.image_url ? (
              <img src={offer.image_url} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <IconDiscount2 aria-hidden className="size-6 text-[var(--muted)]" stroke={1.5} />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span
              dir="auto"
              className={cn(
                'line-clamp-2 text-[15px] leading-tight font-medium tracking-[-0.012em] [overflow-wrap:anywhere]',
                title.missing && 'text-[var(--muted)]',
              )}
            >
              {name}
            </span>
            <StatusChip tone={STATUS_TONE[offer.status]}>{statusLine(offer, ui)}</StatusChip>
          </span>
        </button>
        <div className="flex h-[54px] items-center">
          <Switch
            checked={offer.is_active}
            onChange={(active) => onActive(offer, active)}
            aria-label={t('card.active', { title: name })}
          />
        </div>
      </div>

      {/* What it does, a line each, across the card's width. */}
      <ul className="flex flex-col gap-1.5 text-[12.5px] leading-snug text-[var(--muted)]">
        <Line icon={IconLayoutBoard}>
          {joinList(
            offer.placements.map((placement) => t(`placements.${placement}.name`)),
            ui,
          )}
        </Line>
        <Line icon={IconCalendarTime}>
          <span className="block first-letter:uppercase">{scheduleSummary(offer, ui)}</span>
        </Line>
        {offer.deal ? (
          // Its own dish, in place of a discount on others.
          <li className="text-accent">
            <DealSummary
              name={translated(offer.deal.name, locale).text}
              price={Number(offer.deal.price)}
              currency={offer.deal.currency ?? currency}
              photoUrl={offer.deal.thumb_url}
            />
          </li>
        ) : discount ? (
          <Line icon={IconTag} tone="text-accent">
            {discount}
          </Line>
        ) : null}
      </ul>

      {warnings.length > 0 ? (
        <Alert variant="warning" size="sm">
          <ul className="flex flex-col gap-1.5">
            {warnings.map((warning) => (
              <li
                key={warning.kind === 'placeOff' ? `placeOff-${warning.place}` : warning.kind}
                dir="auto"
              >
                {warningText(warning)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* How it did, and the rarer actions. */}
      <div className="flex items-center gap-2 border-t-[0.5px] border-[var(--line)] pt-2">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11.5px] text-[var(--faint)]">
          <IconEye aria-hidden className="size-3.5 shrink-0" stroke={1.7} />
          <span className="truncate">
            {stats
              ? `${t('card.shown', { count: stats.shown })} · ${t('card.taps', { count: stats.taps })}`
              : t('card.shown', { count: 0 })}
          </span>
        </span>
        <div className="-me-1.5 flex items-center">
          <RowActions
            editLabel={t('card.edit', { title: name })}
            deleteLabel={t('card.remove', { title: name })}
            onEdit={() => onEdit(offer)}
            onDelete={() => onDelete(offer)}
          />
        </div>
      </div>
    </div>
  )
})

/** One fact about the offer, behind its small icon. */
function Line({
  icon: Icon,
  tone,
  children,
}: {
  icon: TablerIcon
  tone?: string
  children: ReactNode
}) {
  return (
    <li className={cn('flex items-start gap-2', tone)}>
      <Icon aria-hidden className="mt-px size-4 shrink-0 opacity-80" stroke={1.6} />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </li>
  )
}

/** The offer's name in the list: its title, or what it is without one. */
function nameOf(offer: Offer, locale: Locale, t: TFunction<'offers'>): string {
  const title = translated(offer.title, locale)
  if (!title.missing) return title.text
  return offer.show_text ? t('card.untitled') : t('card.pictureOnly')
}
