import { IconDiscount2 } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SortableCard, SortableList } from '@/features/menu'
import { StatusChip } from '@/shared/components/data-display'
import {
  ConfirmDialog,
  ErrorState,
  PictureEmptyState,
  SkeletonList,
  toast,
} from '@/shared/components/feedback'
import { Alert, Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { isAtLimit } from '@/shared/utils/limits/is-at-limit'
import { useUiStore } from '@/stores/ui.store'
import { OfferEditor } from '@/features/offers/components/editor/offer-editor'
import { OfferCard } from '@/features/offers/components/list/offer-card'
import {
  useDeleteOffer,
  useOffers,
  useReorderOffers,
  useSetOfferActive,
} from '@/features/offers/hooks/use-offers'
import { PLACEMENTS, type Offer } from '@/features/offers/schemas/offer.schema'
import { offerWarnings } from '@/features/offers/utils/offer-warnings'
import { fullPlacesFor, offPackage, slotUse } from '@/features/offers/utils/slots'
import { useOfferParts } from '@/features/offers/hooks/use-offer-parts'
import { usePricedDishes } from '@/features/offers/hooks/use-priced-dishes'

export type OffersPageProps = {
  /** Menu text's language, for the offers' titles. */
  locale: Locale
  /** A deal dish goes in a category: the editor's way to make one. */
  onOpenCategories: () => void
}

/**
 * The restaurant's offers (Premium), in the order guests meet them: drag to
 * reorder (the first live pop-up or ad is the one a visit shows), a switch
 * to pause one. Above them, how many of each place the package allows
 * switched on at a time; switching one on past that is refused at once.
 * Each card says what may go wrong on the menu (no dishes left, all hidden,
 * a discount bigger than a price, a pop-up waiting behind another). Making
 * or changing one swaps the list for the editor's steps, and back.
 */
export function OffersPage({ locale, onOpenCategories }: OffersPageProps) {
  const { t } = useTranslation('offers')
  const offers = useOffers()
  const remove = useDeleteOffer()
  const reorder = useReorderOffers()
  const setActive = useSetOfferActive()

  // The offer open in the editor: null for a new one, undefined for the list.
  const [editing, setEditing] = useState<Offer | null | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Offer | null>(null)

  const openEdit = useCallback((offer: Offer) => setEditing(offer), [])
  const confirmDelete = useCallback((offer: Offer) => setPendingDelete(offer), [])
  const list = useMemo(() => offers.data?.data ?? [], [offers.data])
  const meta = offers.data?.meta
  const slots = meta?.slots

  // A deal dish's window sent the owner here: its offer opens in the editor once.
  const offerToEdit = useUiStore((state) => state.offerToEdit)
  const editOffer = useUiStore((state) => state.editOffer)
  const loaded = offers.data !== undefined
  useEffect(() => {
    if (offerToEdit === null || !loaded) return
    const wanted = list.find((offer) => offer.id === offerToEdit)
    if (wanted) setEditing(wanted)
    editOffer(null)
  }, [offerToEdit, loaded, list, editOffer])

  const { mutate: mutateActive } = setActive
  const changeActive = useCallback(
    (offer: Offer, active: boolean) => {
      // A place already full turns it down here, before the server would.
      const full = active && slots ? fullPlacesFor(list, slots, offer) : []
      if (full[0] !== undefined) {
        toast.error(t(`slots.noRoom.${full[0]}`))
        return
      }
      mutateActive({ id: offer.id, active })
    },
    [mutateActive, list, slots, t],
  )

  const { data: menuDishes } = usePricedDishes({
    locale,
    currency: meta?.currency ?? 'USD',
    exchangeRate: meta?.exchange_rate ?? null,
  })
  const parts = useOfferParts()
  const warnings = useMemo(
    () =>
      new Map(
        list.map((offer) => [offer.id, offerWarnings(offer, list, menuDishes, { parts, slots })]),
      ),
    [list, menuDishes, parts, slots],
  )
  const limits = meta ? { used: list.length, limit: meta.limit } : undefined
  const atLimit = isAtLimit(limits)

  if (editing !== undefined) {
    return (
      <OfferEditor
        key={editing?.id ?? 'new'}
        offer={editing}
        offers={list}
        slots={slots}
        currency={meta?.currency ?? 'USD'}
        secondCurrency={meta?.second_currency ?? null}
        exchangeRate={meta?.exchange_rate ?? null}
        timezone={meta?.timezone ?? ''}
        locale={locale}
        onClose={() => setEditing(undefined)}
        onOpenCategories={onOpenCategories}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {slots && list.length > 0 ? (
          <ul aria-label={t('slots.label')} className="flex flex-wrap items-center gap-1.5">
            <li aria-hidden className="pe-0.5 text-[12px] text-[var(--faint)]">
              {t('slots.label')}
            </li>
            {/* A place the package leaves out (a count of 0) is not counted. */}
            {PLACEMENTS.filter((placement) => !offPackage(slots, placement)).map((placement) => {
              const use = slotUse(list, slots, placement)
              const place = t(`slots.${placement}`)
              const full = use.limit !== null && use.used >= use.limit
              return (
                <li key={placement}>
                  <StatusChip tone={full ? 'warning' : 'neutral'} className="tabular-nums">
                    {use.limit === null
                      ? t('slots.unlimited', { place, used: use.used })
                      : t('slots.usage', { place, used: use.used, limit: use.limit })}
                  </StatusChip>
                </li>
              )
            })}
          </ul>
        ) : null}
        <Button
          className="ms-auto"
          leadingIcon={<IconDiscount2 className="size-[18px]" />}
          disabled={offers.data === undefined || atLimit}
          onClick={() => setEditing(null)}
        >
          {t('page.add')}
        </Button>
      </div>

      {atLimit ? (
        <Alert variant="warning">{t('page.atLimit', { limit: meta?.limit })}</Alert>
      ) : null}

      {offers.isPending ? (
        <SkeletonList
          count={2}
          className="grid grid-cols-1 gap-3 xl:grid-cols-2"
          itemClassName="h-[188px]"
        />
      ) : offers.isError ? (
        <ErrorState description={offers.error.message} onRetry={() => void offers.refetch()} />
      ) : list.length === 0 ? (
        <PictureEmptyState
          fill
          picture="/assets/images/dashboard/no_offers.webp"
          title={t('page.emptyTitle')}
          description={t('page.emptyDescription')}
          action={
            <Button block onClick={() => setEditing(null)}>
              {t('page.addFirst')}
            </Button>
          }
        />
      ) : (
        // Two columns on a wide screen; dragging works across both.
        <SortableList items={list} layout="grid" onReorder={(ordered) => reorder.mutate(ordered)}>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {list.map((offer) => (
              <SortableCard key={offer.id} id={offer.id}>
                {({ handle }) => (
                  <OfferCard
                    offer={offer}
                    locale={locale}
                    currency={meta?.currency ?? 'USD'}
                    stats={meta?.stats[String(offer.id)]}
                    warnings={warnings.get(offer.id) ?? []}
                    handle={handle}
                    onEdit={openEdit}
                    onDelete={confirmDelete}
                    onActive={changeActive}
                  />
                )}
              </SortableCard>
            ))}
          </div>
        </SortableList>
      )}

      {meta ? (
        <p className="text-[12px] text-[var(--faint)]">
          {t('page.timezone', { timezone: meta.timezone })}
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        loading={remove.isPending}
        title={t('page.removeTitle')}
        description={t('page.removeDescription')}
        confirmLabel={t('page.removeConfirm')}
        onConfirm={() => {
          if (pendingDelete) {
            remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
