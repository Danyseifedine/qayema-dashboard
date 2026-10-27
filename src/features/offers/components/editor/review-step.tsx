import type { ReactNode } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { REMOVED_IMAGE } from '@/features/uploads'
import { SwitchField } from '@/shared/components/forms'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import {
  toOfferPayload,
  type OfferFormValues,
  type Placement,
} from '@/features/offers/schemas/offer.schema'
import { discountLine, discountNumber } from '@/features/offers/utils/discount'
import { joinList, scheduleSummary } from '@/features/offers/utils/offer-schedule'
import { shapeOf } from '@/features/offers/utils/picture-fit'
import { Part, type OfferControl } from '@/features/offers/components/editor/editor-parts'
import { PreviewFigure } from '@/features/offers/components/editor/offer-preview'
import { DealSummary } from '@/features/offers/components/list/deal-summary'
import type { OfferLook } from '@/features/offers/hooks/use-offer-look'
import { STEPS, type StepId } from '@/features/offers/components/editor/offer-steps'

/**
 * The whole offer before it is saved: each step's choices in a line with a
 * way back to change them, the offer drawn in every place it shows, and
 * the switch that puts it on the menu.
 */
export function ReviewStep({
  control,
  look,
  currency,
  locale,
  savedDealPhoto,
  onEdit,
}: {
  control: OfferControl
  look: OfferLook
  currency: string
  /** The menu's language, for the deal dish's name. */
  locale: Locale
  /** The saved deal dish's photo; null for none. */
  savedDealPhoto: string | null
  onEdit: (step: number) => void
}) {
  const { t } = useTranslation('offers')
  // The review is written in the dashboard's language, whatever the menu's.
  const ui = usePreferencesStore((state) => state.locale)
  const values = useWatch({ control }) as OfferFormValues

  // An ad has one shape, so it goes unsaid.
  const placementName = (placement: Placement) => {
    const name = t(`placements.${placement}.name`)
    return placement === 'ad'
      ? name
      : t('review.withShape', {
          placement: name,
          shape: t(`shapes.${shapeOf(placement, values)}.name`).toLocaleLowerCase(ui),
        })
  }
  const popup = values.placements.includes('popup')
  const ad = values.placements.includes('ad')
  const timing =
    popup || ad
      ? [
          t(`editor.showAgainOptions.${values.show_again}`),
          popup && values.delay_seconds > 0
            ? t('review.waits', { count: values.delay_seconds })
            : null,
          ad && popup ? t('review.adAfterPopup', { count: values.ad_delay_seconds }) : null,
          ad && !popup && values.ad_delay_seconds > 0
            ? t('review.waits', { count: values.ad_delay_seconds })
            : null,
          ad ? t('review.stays', { count: values.ad_seconds }) : null,
        ].filter((part): part is string => part !== null)
      : []

  const discount =
    discountLine(
      {
        type: values.discount_type,
        value: discountNumber(values.discount_value),
        dishes: values.dish_ids.length,
      },
      { locale: ui, currency },
    ) ?? t('review.noDiscount')

  const editLine = (id: StepId) => () => onEdit(STEPS.findIndex((step) => step.id === id))

  // The deal dish's photo: the offer's picture, a new one, or the one it has.
  const deal = values.deal
  const dealPhoto = deal.use_offer_image
    ? look.imageUrl
    : deal.image !== null && deal.image !== REMOVED_IMAGE
      ? deal.image.previewUrl
      : savedDealPhoto

  return (
    <>
      <dl className="inset-tile flex flex-col divide-y-[0.5px] divide-[var(--line-2)] rounded-tile px-3.5">
        <Line label={t('steps.content')} onEdit={editLine('content')}>
          <span>
            {!look.showText
              ? t('review.pictureAlone')
              : look.imageUrl
                ? t('review.pictureAndText')
                : t('review.textOnly')}
          </span>
          {look.title ? (
            <span dir="auto" className="block text-[var(--muted)] [overflow-wrap:anywhere]">
              {look.title}
            </span>
          ) : null}
        </Line>
        <Line label={t('steps.where')} onEdit={editLine('where')}>
          <span>{joinList(values.placements.map(placementName), ui)}</span>
          {timing.length > 0 ? (
            <span className="block text-[var(--muted)]">{timing.join(t('review.separator'))}</span>
          ) : null}
        </Line>
        <Line label={t('steps.tap')} onEdit={editLine('tap')}>
          {values.gives === 'deal' ? (
            <>
              <DealSummary
                name={translated(deal.name, locale).text}
                price={Number(deal.price)}
                currency={deal.currency || currency}
                photoUrl={dealPhoto}
              />
              <span className="mt-1 block text-[var(--muted)]">{t('review.dealTap')}</span>
            </>
          ) : (
            <>
              <span>
                {values.action === 'link' && values.action_url
                  ? t('review.opens', { link: values.action_url })
                  : t(`editor.actionOptions.${values.action}`)}
              </span>
              <span className="block text-[var(--muted)]">
                {values.gives === 'discount' ? discount : t('review.nothingToOrder')}
              </span>
            </>
          )}
        </Line>
        <Line label={t('steps.when')} onEdit={editLine('when')}>
          <span className="block first-letter:uppercase">
            {scheduleSummary(toOfferPayload(values), ui)}
          </span>
        </Line>
      </dl>

      <Part title={t('review.previews')}>
        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          {values.placements.map((placement) => (
            <PreviewFigure
              key={placement}
              look={look}
              placement={placement}
              shapes={values}
              caption={placementName(placement)}
            />
          ))}
        </div>
      </Part>

      <SwitchField
        control={control}
        name="is_active"
        label={t('editor.active')}
        description={t('editor.activeDescription')}
      />
    </>
  )
}

/** One step's choices, with the way back to change them. */
function Line({
  label,
  onEdit,
  children,
}: {
  label: string
  onEdit: () => void
  children: ReactNode
}) {
  const { t } = useTranslation('offers')

  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-[12.5px] text-[var(--muted)] sm:w-32 sm:pt-px">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-start justify-between gap-3 text-[13.5px] leading-snug">
        <span className="min-w-0">{children}</span>
        <Button
          variant="link"
          size="xs"
          className="h-auto shrink-0 px-0"
          onClick={onEdit}
          aria-label={t('review.editStep', { step: label })}
        >
          {t('review.edit')}
        </Button>
      </dd>
    </div>
  )
}
