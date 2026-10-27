import { useEffect, useMemo } from 'react'
import { useWatch, type UseFormSetValue } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useCategories } from '@/features/menu'
import { ImageField } from '@/features/uploads'
import {
  ComboboxField,
  FieldGroup,
  PriceField,
  SwitchField,
  TranslatableTextField,
} from '@/shared/components/forms'
import { Alert, Segmented } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { tidyIngredients } from '@/shared/utils/string/ingredients'
import { nameOr } from '@/shared/utils/string/translated'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'
import type { OfferControl } from '@/features/offers/components/editor/editor-parts'

export type DealFieldsProps = {
  control: OfferControl
  setValue: UseFormSetValue<OfferFormValues>
  languages: readonly string[]
  /** The main currency. */
  currency: string
  /** The one other currency a dish may be priced in; null for none. */
  secondCurrency: string | null
  /** The menu's language, for the categories' names. */
  locale: Locale
  /** The saved deal dish's photo; null for none. */
  savedPhotoUrl: string | null
  /** A deal dish goes in a category: this sends the owner off to make one. */
  onOpenCategories: () => void
}

/**
 * The offer's own dish, written like any dish: its name (the offer's title
 * until the owner writes one), what is in it, its price (in either currency
 * when the restaurant has two), its category (the only one picked for it)
 * and its photo, the offer's picture unless it keeps or gets one of its own. It is on
 * the menu only while the offer runs, said under it.
 */
export function DealFields({
  control,
  setValue,
  languages,
  currency,
  secondCurrency,
  locale,
  savedPhotoUrl,
  onOpenCategories,
}: DealFieldsProps) {
  const { t } = useTranslation('offers')
  const categories = useCategories()
  const list = useMemo(() => categories.data?.data ?? [], [categories.data])
  const [dealCurrency, useOfferImage, categoryId] = useWatch({
    control,
    name: ['deal.currency', 'deal.use_offer_image', 'deal.category_id'],
  })
  const priceCurrency = dealCurrency || currency
  const noCategories = categories.data !== undefined && list.length === 0

  // A menu's only category is the deal's, once the categories are in.
  const only = list.length === 1 ? list[0]!.id : null
  useEffect(() => {
    if (only !== null && categoryId === null) setValue('deal.category_id', only)
  }, [only, categoryId, setValue])

  return (
    <div className="flex flex-col gap-3 border-t-[0.5px] border-[var(--line)] pt-4">
      <TranslatableTextField
        control={control}
        languages={languages}
        name="deal.name"
        label={t('deal.name')}
        required
        maxLength={MENU_TEXT_LIMITS.dishName}
        placeholder={{ en: 'Family meal', ar: 'وجبة العائلة' }}
      />
      <TranslatableTextField
        control={control}
        languages={languages}
        name="deal.ingredients"
        label={t('deal.ingredients')}
        multiline
        rows={2}
        maxLength={MENU_TEXT_LIMITS.ingredients}
        optionalText={t('editor.optional')}
        hint={t('deal.ingredientsHint')}
        tidy={tidyIngredients}
        placeholder={{
          en: '2 large pizzas, 4 soft drinks',
          ar: 'بيتزا كبيرة عدد 2، 4 مشروبات غازية',
        }}
      />
      <FieldGroup>
        <PriceField
          control={control}
          name="deal.price"
          currency={priceCurrency}
          label={t('deal.price')}
          currencyPicker={
            secondCurrency === null ? undefined : (
              <Segmented
                size="sm"
                aria-label={t('deal.currency')}
                value={priceCurrency}
                onChange={(next) =>
                  setValue('deal.currency', next === currency ? '' : next, { shouldDirty: true })
                }
                options={[
                  { value: currency, label: currency },
                  { value: secondCurrency, label: secondCurrency },
                ]}
              />
            )
          }
        />
        <ComboboxField
          control={control}
          name="deal.category_id"
          label={t('deal.category')}
          required
          numeric
          searchable={false}
          disabled={noCategories}
          placeholder={noCategories ? t('deal.addCategoryFirst') : t('deal.categoryPlaceholder')}
          options={list.map((category) => ({
            value: String(category.id),
            label: nameOr(category.name, locale, t('deal.untitledCategory')),
          }))}
        />
      </FieldGroup>
      {noCategories ? (
        <Alert
          variant="warning"
          size="sm"
          title={t('deal.addCategoryFirst')}
          action={{ label: t('deal.goToCategories'), onClick: onOpenCategories }}
        >
          {t('deal.needsCategory')}
        </Alert>
      ) : null}
      <SwitchField
        control={control}
        name="deal.use_offer_image"
        label={t('deal.useOfferImage')}
        description={t('deal.useOfferImageDescription')}
      />
      {useOfferImage ? null : (
        <ImageField
          control={control}
          name="deal.image"
          label={t('deal.photo')}
          optionalText={t('editor.optional')}
          context="dish"
          currentUrl={savedPhotoUrl}
          hint={t('deal.photoHint')}
          // The offer keeps or replaces the dish's photo; removing it is the Dishes page's.
          removable={false}
        />
      )}
      <p className="text-[12.5px] leading-snug text-[var(--muted)]">{t('deal.onlyWhileLive')}</p>
    </div>
  )
}
