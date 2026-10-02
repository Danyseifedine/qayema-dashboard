import { Plus } from 'lucide-react'
import { useState } from 'react'
import {
  useFieldArray,
  useFormState,
  useWatch,
  type FieldErrors,
  type UseFormReturn,
} from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import type { DishChoices } from '@/features/auth'
import { Money } from '@/shared/components/data-display'
import { LocaleTabs } from '@/shared/components/forms/translatable/locale-tabs'
import { Button, Combobox, HelperText } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MAIN_LANGUAGE } from '@/shared/constants/menu-languages'
import { translated } from '@/shared/utils/string/translated'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { ChoiceRow } from '@/features/menu/dishes/components/options/choice-row'
import { VariantCard } from '@/features/menu/dishes/components/options/variant-card'
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
}

/** Every language with something wrong somewhere in these errors. */
function languagesWithErrors(errors: unknown, languages: readonly string[]): string[] {
  const found = new Set<string>()
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'ref') continue
      if (languages.includes(key) && value && typeof value === 'object' && 'message' in value) {
        found.add(key)
      } else {
        walk(value)
      }
    }
  }
  walk(errors)
  return languages.filter((code) => found.has(code))
}

/**
 * A dish's variants (Size, Spice level: guests pick one option of each) and
 * add-ons (Extra cheese: guests pick any), in the dish form. One set of
 * language tabs switches every name at once, so each row stays one line.
 */
export function DishChoicesSection({
  form,
  languages,
  currency,
  locale,
  show,
  dishes,
}: DishChoicesSectionProps) {
  const { t } = useTranslation('menu')
  const { control } = form
  const [chosen, setChosen] = useState<string>(MAIN_LANGUAGE)
  const language = languages.includes(chosen) ? chosen : (languages[0] ?? MAIN_LANGUAGE)

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
  const range =
    price === null ||
    price === undefined ||
    (variantValues.length === 0 && addonValues.length === 0)
      ? null
      : priceRange(price, variantValues, addonValues)

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
      className="mt-5 flex flex-col gap-4 border-t-[0.5px] border-[var(--line)] pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="dish-choices-title" className="font-display text-[16px] leading-tight">
            {t('choices.title')}
          </h3>
          <p className="text-[12.5px] text-[var(--muted)]">{t('choices.description')}</p>
        </div>
        {languages.length > 1 ? (
          <LocaleTabs
            languages={languages}
            value={language}
            onChange={setChosen}
            incomplete={incomplete}
          />
        ) : null}
      </div>

      {copyable.length > 0 ? (
        <Combobox
          aria-label={t('choices.copyFrom')}
          placeholder={t('choices.copyFrom')}
          value={null}
          onChange={copy}
          options={copyable.map((dish) => {
            const name = translated(dish.name, locale)
            return {
              value: String(dish.id),
              label: name.missing ? t('dishCard.untitled') : name.text,
            }
          })}
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
                leadingIcon={<Plus aria-hidden className="size-4" />}
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
        <div className="flex flex-col gap-2.5">
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
                leadingIcon={<Plus aria-hidden className="size-4" />}
                onClick={() => addons.append(blankChoice(languages))}
              >
                {t('choices.addAddon')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {range ? (
        <p className="rounded-[10px] bg-[var(--hover-wash)] px-3 py-2 text-[13px]">
          <Trans
            t={t}
            i18nKey={range.min === range.max ? 'choices.guestsPay' : 'choices.guestsPayRange'}
            components={{
              min: (
                <Money
                  amount={range.min}
                  currency={currency}
                  locale={locale}
                  className="font-semibold"
                />
              ),
              max: (
                <Money
                  amount={range.max}
                  currency={currency}
                  locale={locale}
                  className="font-semibold"
                />
              ),
            }}
          />
        </p>
      ) : null}
    </section>
  )
}
