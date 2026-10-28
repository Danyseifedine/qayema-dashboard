import { useState } from 'react'
import { useWatch, type UseFormSetValue } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/features/auth'
import { ConfirmDialog } from '@/shared/components/feedback'
import { Field, TextField } from '@/shared/components/forms'
import { Segmented } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { isAtLimit } from '@/shared/utils/limits/is-at-limit'
import {
  ACTIONS,
  DISCOUNTS,
  FREE,
  GIVES,
  type Gives,
  type OfferFormValues,
} from '@/features/offers/schemas/offer.schema'
import { DealFields } from '@/features/offers/components/editor/deal-fields'
import { DishPicker } from '@/features/offers/components/editor/dish-picker'
import { SegmentedField, type OfferControl } from '@/features/offers/components/editor/editor-parts'
import { useOfferParts } from '@/features/offers/hooks/use-offer-parts'
import { discountNumber } from '@/features/offers/utils/discount'

export type TapStepProps = {
  control: OfferControl
  setValue: UseFormSetValue<OfferFormValues>
  languages: readonly string[]
  /** The main currency, which an amount off is in. */
  currency: string
  /** The one other currency a dish may be priced in; null for none. */
  secondCurrency: string | null
  /** Main per one of the second currency; null without one. */
  exchangeRate: string | null
  locale: Locale
  /** The saved deal dish's photo; null for none. */
  savedDealPhoto: string | null
  onOpenCategories: () => void
}

/**
 * What the offer gives guests, first: nothing to order (a tap does nothing
 * or opens a link), a discount on the owner's dishes (the discount, its
 * dishes, then what a tap does), or a deal dish of its own, which a tap opens. A discount
 * is a percent or an amount off each dish, or the second of a pair free or
 * a percent off ("2nd item", starting free). Without
 * discounts on the package only "None" can be picked; with the package's
 * dishes all used, a new deal dish cannot. Leaving a saved deal dish asks
 * first, since saving then takes it off the menu.
 */
export function TapStep({
  control,
  setValue,
  languages,
  currency,
  secondCurrency,
  exchangeRate,
  locale,
  savedDealPhoto,
  onOpenCategories,
}: TapStepProps) {
  const { t } = useTranslation('offers')
  const parts = useOfferParts()
  const dishes = useSession().data?.restaurant?.limits.dishes
  const [gives, hasDeal, action, discountType, discountValue] = useWatch({
    control,
    name: ['gives', 'has_deal', 'action', 'discount_type', 'discount_value'],
  })
  // The choice the owner is asked to confirm, leaving a saved deal dish.
  const [leaving, setLeaving] = useState<Gives | null>(null)
  const dishesFull = isAtLimit(dishes) && !hasDeal
  const discount =
    discountType === 'none' ? null : { type: discountType, value: discountNumber(discountValue) }
  // Free or a percent off the second one, as picked: typing 100 or more in
  // the percent box keeps the box (and its message), never flips to Free.
  const [secondPercent, setSecondPercent] = useState(
    discountType === 'second' && discountNumber(discountValue) < FREE,
  )
  const secondFree = discountType === 'second' && !secondPercent

  /** Another kind of discount: the 2nd item starts free, and leaving it starts empty. */
  const pickDiscount = (next: OfferFormValues['discount_type']) => {
    if (next === discountType) return
    setValue('discount_type', next, { shouldDirty: true })
    setSecondPercent(false)
    if (next === 'second') setValue('discount_value', String(FREE))
    else if (discountType === 'second') setValue('discount_value', '')
  }

  /**
   * The choice, with what goes with it: a deal is opened by a tap and takes
   * no discount; a discount's tap shows its dishes unless a link was chosen.
   */
  const choose = (next: Gives) => {
    setValue('gives', next, { shouldDirty: true })
    if (next !== 'discount') {
      setValue('discount_type', 'none')
      if (next === 'deal') setValue('action', 'dishes')
      else if (action === 'dishes') setValue('action', 'none')
      return
    }
    if (action === 'none') setValue('action', 'dishes')
    if (parts.discounts) setValue('discount_type', 'percent')
  }

  return (
    <div className="flex flex-col gap-1">
      <SegmentedField
        control={control}
        name="gives"
        label={t('editor.gives')}
        hint={dishesFull ? t('deal.dishesFull') : undefined}
        onPick={(next) => {
          if (next === gives) return
          if (gives === 'deal' && hasDeal) setLeaving(next)
          else choose(next)
        }}
        options={GIVES.map((value) => ({
          value,
          label: t(`editor.givesOptions.${value}`),
          disabled: value === 'deal' && dishesFull && gives !== 'deal',
        }))}
      />
      {gives === 'discount' ? (
        <>
          <SegmentedField
            control={control}
            name="discount_type"
            label={t('editor.discount')}
            hint={parts.discounts ? undefined : t('editor.discountsOff')}
            onPick={pickDiscount}
            options={DISCOUNTS.map((value) => ({
              value,
              label: t(`editor.discountOptions.${value}`),
              disabled: !parts.discounts && value !== 'none' && value !== discountType,
            }))}
          />
          {discountType === 'second' ? (
            <Field
              label={t('editor.secondValue')}
              hint={secondFree ? t('editor.secondHint') : undefined}
            >
              {() => (
                <Segmented<string>
                  block
                  value={secondFree ? 'free' : 'percent'}
                  onChange={(mode) => {
                    if (mode === (secondFree ? 'free' : 'percent')) return
                    setSecondPercent(mode === 'percent')
                    setValue('discount_value', mode === 'free' ? String(FREE) : '50', {
                      shouldDirty: true,
                    })
                  }}
                  aria-label={t('editor.secondValue')}
                  options={(['free', 'percent'] as const).map((mode) => ({
                    value: mode,
                    label: t(`editor.secondModes.${mode}`),
                  }))}
                />
              )}
            </Field>
          ) : null}
          {discountType === 'second' && !secondFree ? (
            <TextField
              control={control}
              name="discount_value"
              label={t('editor.secondPercent')}
              hint={t('editor.secondHint')}
              inputMode="decimal"
              placeholder="50"
              forceLtr
              leadingIcon={<span className="text-[13px] text-[var(--muted)]">%</span>}
            />
          ) : null}
          {discountType === 'percent' || discountType === 'amount' ? (
            <TextField
              control={control}
              name="discount_value"
              label={
                discountType === 'percent' ? t('editor.percentValue') : t('editor.amountValue')
              }
              hint={t('editor.discountHint')}
              inputMode="decimal"
              placeholder={discountType === 'percent' ? '20' : '2'}
              forceLtr
              leadingIcon={
                <span className="text-[13px] text-[var(--muted)]">
                  {discountType === 'percent' ? '%' : currency}
                </span>
              }
            />
          ) : null}
          <DishPicker
            control={control}
            currency={currency}
            exchangeRate={exchangeRate}
            locale={locale}
            discount={discount}
          />
        </>
      ) : null}

      {gives === 'deal' ? (
        <DealFields
          control={control}
          setValue={setValue}
          languages={languages}
          currency={currency}
          secondCurrency={secondCurrency}
          locale={locale}
          savedPhotoUrl={savedDealPhoto}
          onOpenCategories={onOpenCategories}
        />
      ) : (
        <>
          <SegmentedField
            control={control}
            name="action"
            label={t('editor.tap')}
            options={ACTIONS.filter((value) => gives === 'discount' || value !== 'dishes').map(
              (value) => ({ value, label: t(`editor.actionOptions.${value}`) }),
            )}
          />
          {action === 'link' ? (
            <TextField
              control={control}
              name="action_url"
              label={t('editor.link')}
              hint={t('editor.linkHint')}
              placeholder="https://"
              type="url"
              inputMode="url"
              forceLtr
            />
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={leaving !== null}
        loading={false}
        title={t('deal.removeTitle')}
        description={t('deal.removeDescription')}
        confirmLabel={t('deal.removeConfirm')}
        onConfirm={() => {
          choose(leaving!)
          setLeaving(null)
        }}
        onCancel={() => setLeaving(null)}
      />
    </div>
  )
}
