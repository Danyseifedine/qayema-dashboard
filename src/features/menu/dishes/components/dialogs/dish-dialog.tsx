import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/shared/components/feedback'
import {
  ComboboxField,
  FieldGroup,
  PriceField,
  SwitchField,
  OneLanguageNote,
  TranslatableTextField,
} from '@/shared/components/forms'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { ImageField, imageChanges } from '@/features/uploads'
import { Alert, Segmented } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useTranslateOnSave } from '@/shared/hooks/use-translate-on-save'
import { cn } from '@/shared/utils/dom/cn'
import { nameOr } from '@/shared/utils/string/translated'
import type { Category } from '@/features/menu/categories/schemas/category.schema'
import { useSaveDish } from '@/features/menu/dishes/hooks/use-dishes'
import { useDishBuilds, useDishChoices, useMenuLanguages } from '@/features/auth'
import { toMenuTextForm } from '@/shared/utils/string/menu-text'
import { AddonGroupsList } from '@/features/menu/dishes/components/options/addon-groups-list'
import { DishChoicesSection } from '@/features/menu/dishes/components/options/dish-choices-section'
import {
  toAddonsPayload,
  toChoicesForm,
  toVariantsPayload,
} from '@/features/menu/dishes/schemas/dish-choices.schema'
import {
  makeDishFormSchema,
  type Dish,
  type DishFormInput,
  type DishFormValues,
} from '@/features/menu/dishes/schemas/dish.schema'
import { missingDishTranslations } from '@/features/menu/dishes/utils/dish-translations'
import { tidyIngredients } from '@/shared/utils/string/ingredients'
import { useUiStore } from '@/stores/ui.store'

/** A line above a part of the form, so the parts read apart. */
const PART = 'mt-5 border-t-[0.5px] border-[var(--line)] pt-3'

export type DishDialogProps = {
  open: boolean
  /** Null creates a new dish. */
  dish: Dish | null
  /** The restaurant's dishes, to copy variants and add-ons from. */
  dishes: Dish[]
  categories: Category[]
  /** Preselected category when adding from a filtered view. */
  defaultCategoryId: number | null
  /** The restaurant's main currency. */
  currency: string
  /** The one other currency a dish may be priced in; null for none. */
  secondCurrency: string | null
  locale: Locale
  onClose: () => void
  /** A dish needs a category; this sends the owner off to make one. */
  onOpenCategories: () => void
  /** A dish guests build is changed on the Build your own page. */
  onOpenBuilds: () => void
  /** A deal dish's offer is changed on the Offers page. */
  onOpenOffers: () => void
}

export function DishDialog({
  open,
  dish,
  dishes,
  categories,
  defaultCategoryId,
  currency,
  secondCurrency,
  locale,
  onClose,
  onOpenCategories,
  onOpenBuilds,
  onOpenOffers,
}: DishDialogProps) {
  const { t } = useTranslation('menu')
  const save = useSaveDish(dish?.id ?? null)
  const languages = useMenuLanguages()
  const show = useDishChoices()
  const withChoices = show.variants || show.addons
  // Its saved builds price a dish with none of its own, while they are on;
  // the Build your own page changes them, the form never sends them.
  const builtByGuests = useDishBuilds() && (dish?.builds.length ?? 0) > 0
  const showBuildsOf = useUiStore((state) => state.showBuildsOf)
  const editOffer = useUiStore((state) => state.editOffer)
  // A deal dish is on the menu only while the offer that made it runs.
  const madeBy = dish?.offer ?? null

  const translation = useTranslateOnSave(languages)
  // While saving translates, a name in either language will do: the AI
  // fills the main one in (the form reads this on every render).
  const resolver = useMemo(
    () => zodResolver(makeDishFormSchema(translation.on, builtByGuests)),
    [translation.on, builtByGuests],
  )
  const form = useForm<DishFormInput, unknown, DishFormValues>({
    resolver,
    defaultValues: {
      name: toMenuTextForm(null, languages),
      ingredients: toMenuTextForm(null, languages),
      price: null,
      category_id: defaultCategoryId ?? categories[0]?.id ?? null,
      is_available: true,
      currency,
      image: null,
      variants: [],
      addons: [],
    },
  })

  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  // The price hint follows the variants: with one, an empty price means the
  // first variant's options are the prices (a sandwich by size alone).
  const [watchedPrice, watchedVariants, watchedCurrency] = useWatch({
    control: form.control,
    name: ['price', 'variants', 'currency'],
  })
  // The price, its variants and its add-ons are all in the dish's currency.
  const dishCurrency = watchedCurrency || currency
  const firstVariant =
    watchedVariants[0]?.name[mainLanguageOf(languages)]?.trim() ||
    t('choices.variantNumber', { number: 1 })
  const unpriced = watchedPrice === null || watchedPrice === undefined
  // A dish with no price of its own is priced by its builds first.
  const priceHint = builtByGuests
    ? t(unpriced ? 'dishDialog.priceHintFromBuild' : 'dishDialog.priceHintWithBuild')
    : !show.variants || watchedVariants.length === 0
      ? t('dishDialog.priceHint')
      : unpriced
        ? t('dishDialog.priceHintFromVariant', { variant: firstVariant })
        : t('dishDialog.priceHintWithVariant', { variant: firstVariant })

  // Kept current every render so the reset below can read them without
  // taking them as dependencies.
  const categoriesRef = useRef(categories)
  const dishRef = useRef(dish)
  useEffect(() => {
    categoriesRef.current = categories
    dishRef.current = dish
  })

  // Only a genuine open, or a switch to a different dish, refills the form.
  // Depending on the `categories` array re-ran this on every parent render
  // and silently wiped whatever the owner had typed.
  const dishId = dish?.id ?? null
  useEffect(() => {
    if (!open) return
    const current = dishRef.current
    // A list that is switched off is left out of the form, and so out of
    // the save: it stays on the dish as it was.
    const choices = toChoicesForm(current, languages)
    clearFormError()
    form.reset({
      name: toMenuTextForm(current?.name, languages),
      ingredients: toMenuTextForm(current?.ingredients, languages),
      price: current?.price === null || current?.price === undefined ? null : Number(current.price),
      category_id:
        current?.category_id ?? defaultCategoryId ?? categoriesRef.current[0]?.id ?? null,
      is_available: current?.is_available ?? true,
      // A new dish is priced in the main currency.
      currency: current?.currency ?? currency,
      image: null,
      variants: show.variants ? choices.variants : [],
      addons: show.addons ? choices.addons : [],
    })
  }, [open, dishId, defaultCategoryId, languages, show, form, clearFormError, currency])

  // Opened before the categories arrived (a slow connection), the form had
  // none to preselect. Fill the empty choice once they are here, touching
  // nothing the owner typed.
  const firstCategoryId = categories[0]?.id ?? null
  useEffect(() => {
    if (!open || firstCategoryId === null) return
    if (form.getValues('category_id') !== null) return
    form.setValue('category_id', defaultCategoryId ?? firstCategoryId, { shouldValidate: false })
  }, [open, firstCategoryId, defaultCategoryId, form])

  const once = useSubmitOnce()
  const busy = save.isPending || translation.busy

  const send = (values: DishFormValues, done: () => void) => {
    save.mutate(
      {
        name: values.name,
        ingredients: values.ingredients,
        price: values.price,
        category_id: values.category_id,
        is_available: values.is_available,
        // Only once the restaurant has a second currency to choose.
        ...(secondCurrency === null ? {} : { currency: values.currency }),
        // A key only for an image uploaded in this session; the flag only
        // when the saved one was removed.
        ...imageChanges(values.image, 'image_key', 'delete_image'),
        ...(show.variants ? { variants: toVariantsPayload(values.variants) } : {}),
        ...(show.addons ? { addons: toAddonsPayload(values.addons) } : {}),
      },
      { onSuccess: onClose, onError: (error) => applyApiError(error), onSettled: done },
    )
  }

  // Saving fills in, with the writing help, everything written in one
  // language only (the name, the ingredients, every choice), in one AI use;
  // the form shows them too, should the save be refused.
  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      clearFormError()
      translation.fill(values, missingDishTranslations(values, languages), {
        save: (filled) => send(filled, done),
        show: (path, text) => form.setValue(path as FieldPath<DishFormInput>, text),
        tidy: (piece, text) =>
          piece.path.startsWith('ingredients.') ? tidyIngredients(text, piece.to) : text,
      })
    }),
  )

  const options = categories.map((category) => ({
    value: String(category.id),
    label: nameOr(category.name, locale, t('dishDialog.untitledCategory')),
  }))
  const noCategories = options.length === 0

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={busy}
      className={cn(
        'overflow-y-auto',
        // Variant and add-on rows want the room for a name and a price.
        withChoices ? 'w-[min(calc(100vw-24px),640px)]' : 'w-[min(calc(100vw-24px),560px)]',
      )}
      title={dish ? t('dishDialog.titleEdit') : t('dishDialog.titleNew')}
      error={formError}
      notice={
        <>
          {madeBy ? (
            <Alert
              variant="info"
              size="sm"
              className="mt-3"
              action={{
                label: t('dishDialog.dealAction'),
                onClick: () => {
                  editOffer(madeBy.id)
                  onClose()
                  onOpenOffers()
                },
              }}
            >
              {t('dishDialog.deal', {
                title: nameOr(madeBy.title, locale, t('dishCard.deal.untitledOffer')),
              })}
            </Alert>
          ) : null}
          {translation.on ? <OneLanguageNote languages={languages} /> : null}
          {noCategories ? (
            <Alert
              variant="warning"
              title={t('shared.addCategoryFirst')}
              className="mt-3"
              action={{
                label: t('shared.goToCategories'),
                onClick: () => {
                  onClose()
                  onOpenCategories()
                },
              }}
            >
              {t('dishDialog.needsCategory')}
            </Alert>
          ) : null}
        </>
      }
      onSubmit={onSubmit}
      submitLabel={dish ? t('dishDialog.save') : t('dishDialog.add')}
      submitBlocked={noCategories ? t('shared.addCategoryFirst') : undefined}
    >
      <TranslatableTextField
        control={form.control}
        languages={languages}
        name="name"
        label={t('shared.name')}
        required
        maxLength={MENU_TEXT_LIMITS.dishName}
        placeholder={{ en: 'Lamb shank', ar: 'موزات الغنم' }}
      />

      <TranslatableTextField
        control={form.control}
        languages={languages}
        name="ingredients"
        label={t('dishDialog.ingredients')}
        multiline
        rows={2}
        maxLength={MENU_TEXT_LIMITS.ingredients}
        optionalText={t('shared.optional')}
        hint={t('dishDialog.ingredientsHint')}
        tidy={tidyIngredients}
        placeholder={{ en: 'Lamb, rice, almonds, yoghurt', ar: 'لحم غنم، أرز، لوز، لبن' }}
      />

      <div className={PART}>
        <FieldGroup>
          <PriceField
            control={form.control}
            name="price"
            currency={dishCurrency}
            label={t('dishDialog.price')}
            hint={priceHint}
            currencyPicker={
              secondCurrency === null ? undefined : (
                <Segmented
                  size="sm"
                  aria-label={t('dishDialog.currency')}
                  value={dishCurrency}
                  onChange={(next) => form.setValue('currency', next, { shouldDirty: true })}
                  options={[
                    { value: currency, label: currency },
                    { value: secondCurrency, label: secondCurrency },
                  ]}
                />
              )
            }
          />
          <ComboboxField
            control={form.control}
            name="category_id"
            label={t('dishDialog.category')}
            required
            numeric
            searchable={false}
            options={options}
            disabled={noCategories}
            placeholder={
              noCategories ? t('shared.addCategoryFirst') : t('dishDialog.categoryPlaceholder')
            }
          />
        </FieldGroup>
        {builtByGuests && dish ? (
          <Alert
            variant="info"
            size="sm"
            className="mt-3"
            action={{
              label: t('dishDialog.buildsAction'),
              onClick: () => {
                showBuildsOf(dish.id)
                onClose()
                onOpenBuilds()
              },
            }}
          >
            {t('dishDialog.builtByGuests')}
          </Alert>
        ) : null}
      </div>

      {withChoices ? (
        <DishChoicesSection
          form={form}
          languages={languages}
          currency={dishCurrency}
          locale={locale}
          show={show}
          dishes={dishes.filter((other) => other.id !== dish?.id)}
          pricedByBuilds={builtByGuests}
        />
      ) : null}

      {show.addons && dish && dish.addon_groups.length > 0 ? (
        <div className={PART}>
          <AddonGroupsList groups={dish.addon_groups} language={locale} currency={dishCurrency} />
        </div>
      ) : null}

      <div className={PART}>
        <ImageField
          control={form.control}
          name="image"
          label={t('dishDialog.photo')}
          optionalText={t('shared.optional')}
          context="dish"
          currentUrl={dish?.image_url ?? null}
          hint={t('dishDialog.photoHint')}
        />
      </div>

      <div className={PART}>
        <SwitchField
          control={form.control}
          name="is_available"
          label={t('dishDialog.available')}
          description={t('dishDialog.availableDescription')}
        />
      </div>
    </FormDialog>
  )
}
