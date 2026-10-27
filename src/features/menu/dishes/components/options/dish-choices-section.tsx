import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import {
  useFieldArray,
  useFormState,
  useWatch,
  type FieldErrors,
  type UseFormReturn,
} from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { LocaleTabs } from '@/shared/components/forms'
import type { DishChoices } from '@/features/auth'
import { Money } from '@/shared/components/data-display'
import { Button, Combobox, HelperText } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { nameOr } from '@/shared/utils/string/translated'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { ChoiceRow } from '@/features/menu/dishes/components/options/choice-row'
import { TranslateChoicesButton } from '@/features/menu/dishes/components/options/translate-choices-button'
import { VariantCard } from '@/features/menu/dishes/components/options/variant-card'
import { languagesWithErrors } from '@/features/menu/dishes/utils/languages-with-errors'
import {
  CHOICE_LIMITS,
  VARIANT_PRESETS,
  blankChoice,
  blankVariant,
  hasChoices,
  presetVariant,
  priceRange,
  toChoicesForm,
} from '@/features/menu/dishes/schemas/dish-choices.schema'
import type {
  Dish,
  DishFormInput,
  DishFormValues,
} from '@/features/menu/dishes/schemas/dish.schema'

export type DishChoicesSectionProps = {
  form: UseFormReturn<DishFormInput, unknown, DishFormValues>
  languages: readonly string[]
  currency: string
  locale: Locale
  /** Which lists are on for this restaurant. */
  show: DishChoices
  /** Other dishes, to copy their variants and add-ons from. */
  dishes: Dish[]
  /** Its saved builds price the dish: its variants are extras, and no range is shown. */
  pricedByBuilds: boolean
}

/**
 * A dish's variants (Size, Spice level: guests pick one option of each) and
 * add-ons (Extra cheese: guests pick any), in the dish form, a line
 * between the two. One set of language tabs switches every name at once, so
 * each row stays one line, and one AI button beside them translates every
 * name written in one language only.
 */
export function DishChoicesSection({
  form,
  languages,
  currency,
  locale,
  show,
  dishes,
  pricedByBuilds,
}: DishChoicesSectionProps) {
  const { t } = useTranslation('menu')
  const { control } = form
  const [chosen, setChosen] = useState<string>(mainLanguageOf(languages))
  const language = languages.includes(chosen) ? chosen : mainLanguageOf(languages)

  const variants = useFieldArray({ control, name: 'variants' })
  const addons = useFieldArray({ control, name: 'addons' })
  const { errors } = useFormState({ control, name: ['variants', 'addons'] })
  const incomplete = languagesWithErrors(
    { variants: errors.variants, addons: errors.addons } satisfies Partial<
      FieldErrors<DishFormInput>
    >,
    languages,
  )

  const [price, variantValues, addonValues] = useWatch({
    control,
    name: ['price', 'variants', 'addons'],
  })
  // With no price of its own the dish is priced by its first variant. A
  // build's price is its own to show, so no range then.
  const priced = price !== null && price !== undefined
  const range =
    pricedByBuilds ||
    (variantValues.length === 0 && addonValues.length === 0) ||
    (!priced && variantValues.length === 0)
      ? null
      : priceRange(priced ? price : 0, variantValues, addonValues)

  const copyable = dishes.filter(hasChoices)
  const copy = (id: string | null) => {
    // The picked dish's lists, as new rows of this one.
    for (const source of copyable.filter((dish) => String(dish.id) === id)) {
      const copied = toChoicesForm(source, languages, false)
      if (show.variants) variants.replace(copied.variants)
      if (show.addons) addons.replace(copied.addons)
    }
  }

  return (
    <section
      aria-labelledby="dish-choices-title"
      className="mt-5 flex flex-col gap-4 border-t-[0.5px] border-[var(--line)] pt-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="dish-choices-title" className="min-w-0 font-display text-[16px] leading-tight">
          {t('choices.title')}
        </h3>
        {languages.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <TranslateChoicesButton form={form} languages={languages} onTranslated={setChosen} />
            <LocaleTabs
              languages={languages}
              value={language}
              onChange={setChosen}
              incomplete={incomplete}
            />
          </div>
        ) : null}
      </div>

      {copyable.length > 0 ? (
        <Combobox
          aria-label={t('choices.copyFrom')}
          placeholder={t('choices.copyFrom')}
          value={null}
          onChange={copy}
          options={copyable.map((dish) => ({
            value: String(dish.id),
            label: nameOr(dish.name, locale, t('dishCard.untitled')),
          }))}
        />
      ) : null}

      {show.variants ? (
        <div className="flex flex-col gap-2.5">
          <div>
            <h4 className="text-[13.5px] font-semibold">{t('choices.variants')}</h4>
            <HelperText>{t('choices.variantsHint')}</HelperText>
          </div>

          <SortableList
            items={variants.fields}
            layout="list"
            onReorder={(_, from, to) => variants.move(from, to)}
          >
            <div className="flex flex-col gap-2.5">
              {variants.fields.map((field, index) => (
                <SortableCard key={field.id} id={field.id}>
                  {({ handle }) => (
                    <VariantCard
                      control={control}
                      index={index}
                      languages={languages}
                      language={language}
                      currency={currency}
                      handle={handle}
                      pricedByBuilds={pricedByBuilds}
                      onRemove={() => variants.remove(index)}
                    />
                  )}
                </SortableCard>
              ))}
            </div>
          </SortableList>

          {variants.fields.length < CHOICE_LIMITS.variants ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<IconPlus aria-hidden className="size-4" />}
                onClick={() => variants.append(blankVariant(languages))}
              >
                {t('choices.addVariant')}
              </Button>
              <span className="text-[12.5px] text-[var(--muted)]">{t('choices.orStartFrom')}</span>
              {VARIANT_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  variant="ghost"
                  size="sm"
                  className="rounded-full border-[0.5px] border-[var(--line-strong)]"
                  onClick={() => variants.append(presetVariant(preset, languages))}
                >
                  {t(`choices.presets.${preset.key}`)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {show.addons ? (
        <div
          className={cn(
            'flex flex-col gap-2.5',
            show.variants && 'border-t-[0.5px] border-[var(--line)] pt-4',
          )}
        >
          <div>
            <h4 className="text-[13.5px] font-semibold">{t('choices.addons')}</h4>
            <HelperText>{t('choices.addonsHint')}</HelperText>
          </div>

          <SortableList
            items={addons.fields}
            layout="list"
            onReorder={(_, from, to) => addons.move(from, to)}
          >
            <div className="flex flex-col gap-1.5">
              {addons.fields.map((field, index) => (
                <SortableCard key={field.id} id={field.id}>
                  {({ handle }) => (
                    <ChoiceRow
                      control={control}
                      path={`addons.${index}`}
                      languages={languages}
                      language={language}
                      currency={currency}
                      handle={handle}
                      nameLabel={t('choices.addonName', { number: index + 1 })}
                      priceLabel={t('choices.addonPrice', { number: index + 1 })}
                      removeLabel={t('choices.removeAddon', { number: index + 1 })}
                      placeholder={t('choices.addonPlaceholder')}
                      onRemove={() => addons.remove(index)}
                    />
                  )}
                </SortableCard>
              ))}
            </div>
          </SortableList>

          {addons.fields.length < CHOICE_LIMITS.addons ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<IconPlus aria-hidden className="size-4" />}
                onClick={() => addons.append(blankChoice(languages))}
              >
                {t('choices.addAddon')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {range ? (
        <p className="rounded-tile bg-[var(--hover-wash)] px-3 py-2 text-[13px]">
          <Trans
            t={t}
            i18nKey={range.min === range.max ? 'choices.guestsPay' : 'choices.guestsPayRange'}
            components={{
              min: <Money amount={range.min} currency={currency} className="font-semibold" />,
              max: <Money amount={range.max} currency={currency} className="font-semibold" />,
            }}
          />
        </p>
      ) : null}
    </section>
  )
}
