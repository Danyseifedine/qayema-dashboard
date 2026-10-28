import { useId } from 'react'
import { useController, useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Category, Dish } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { ComboboxField } from '@/shared/components/forms'
import { Alert, CheckRow, HelperText } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { formatMoney } from '@/shared/utils/format/money'
import { nameOr } from '@/shared/utils/string/translated'
import { OptionCards } from '@/features/build-your-own/components/editor/option-cards'
import { OwnChoices } from '@/features/build-your-own/components/editor/own-choices'
import {
  blankChoice,
  suggestedCategory,
  type BuildFormInput,
  type BuildFormValues,
} from '@/features/build-your-own/schemas/build.schema'

export type ChoicesStepProps = {
  form: UseFormReturn<BuildFormInput, unknown, BuildFormValues>
  categories: readonly Category[]
  /** The picked category's dishes guests could choose (offeredDishes), to tick. */
  pickable: readonly Dish[]
  /** The dish's currency: every choice is in it. */
  currency: string
  locale: Locale
  languages: readonly string[]
}

/**
 * The second step: what guests choose from. A category's dishes, at their
 * own prices, listed as guests will meet them, every one ticked to start;
 * the owner unticks those to leave out (with a word when fewer than two are
 * left, since guests then do not see the build). Or a list the owner types.
 */
export function ChoicesStep({
  form,
  categories,
  pickable,
  currency,
  locale,
  languages,
}: ChoicesStepProps) {
  const { t } = useTranslation('build-your-own')
  const { control } = form
  const { field: source } = useController({ control, name: 'source' })
  const { field: ticks } = useController({ control, name: 'dish_ids' })
  const listLabel = useId()
  const categoryId = useWatch({ control, name: 'category_id' })
  const isTicked = (id: number) => ticks.value === null || ticks.value.includes(id)
  const ticked = pickable.filter((dish) => isTicked(dish.id))

  // Every dish ticked is saved as every one, so a dish added later joins.
  const toggle = (id: number) => {
    const next = isTicked(id)
      ? ticked.filter((dish) => dish.id !== id).map((dish) => dish.id)
      : [...ticked.map((dish) => dish.id), id]
    ticks.onChange(next.length === pickable.length ? null : next)
  }

  const pick = (next: BuildFormInput['source']) => {
    source.onChange(next)
    // A list starts with the two rows it needs; a category with the likely one.
    if (next === 'own' && form.getValues('choices').length === 0) {
      form.setValue('choices', [blankChoice(languages), blankChoice(languages)])
    }
    if (next === 'category' && categoryId === null) {
      form.setValue('category_id', suggestedCategory(categories))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <OptionCards
        name={source.name}
        legend={t('choices.label')}
        value={source.value}
        onChange={pick}
        className="sm:grid-cols-2"
        options={[
          { value: 'category', label: t('choices.category'), hint: t('choices.categoryHint') },
          { value: 'own', label: t('choices.own'), hint: t('choices.ownHint') },
        ]}
      />

      {source.value === 'category' ? (
        <div className="flex flex-col gap-2">
          {/* A build needs no category of its own, but this list does. */}
          {categories.length === 0 ? (
            <Alert variant="info" size="sm">
              {t('choices.noCategories')}
            </Alert>
          ) : null}
          <ComboboxField
            control={control}
            name="category_id"
            label={t('choices.categoryField')}
            numeric
            searchable={false}
            // Another category's dishes all start ticked.
            onValueChange={() => ticks.onChange(null)}
            placeholder={t('choices.categoryPlaceholder')}
            options={categories.map((category) => ({
              value: String(category.id),
              label: nameOr(category.name, locale, t('card.untitled')),
            }))}
          />
          {categoryId === null ? null : pickable.length === 0 ? (
            <Alert variant="info" size="sm">
              {t('choices.noDishes', { currency })}
            </Alert>
          ) : (
            <section className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p id={listLabel} className="label-caps text-[var(--muted)]">
                  {t('choices.offered')}
                </p>
                <span className="text-[12.5px] text-[var(--muted)]">
                  {t('choices.ticked', { shown: ticked.length, total: pickable.length })}
                </span>
              </div>
              <HelperText>{t('choices.tickHint')}</HelperText>
              <div role="group" aria-labelledby={listLabel} className="flex flex-col gap-1">
                {pickable.map((dish) => (
                  <CheckRow
                    key={dish.id}
                    on={isTicked(dish.id)}
                    onClick={() => toggle(dish.id)}
                    trailing={
                      dish.price === null ? (
                        // Priced by size: each size at its price, as guests pick it.
                        <span className="shrink-0 text-end text-[13px] text-[var(--muted)]">
                          {(dish.variants[0]?.options ?? [])
                            .map(
                              (option) =>
                                `${nameOr(option.name, locale, '')} ${formatMoney(Number(option.price), currency)}`,
                            )
                            .join(' · ')}
                        </span>
                      ) : (
                        <Money
                          amount={Number(dish.price)}
                          currency={currency}
                          className="shrink-0 text-[13px] text-[var(--muted)]"
                        />
                      )
                    }
                  >
                    {nameOr(dish.name, locale, t('card.untitled'))}
                  </CheckRow>
                ))}
              </div>
              {ticked.length < 2 ? (
                <HelperText tone="warning">
                  {pickable.length < 2 ? t('choices.fewDishes') : t('choices.fewTicked')}
                </HelperText>
              ) : null}
            </section>
          )}
        </div>
      ) : (
        <OwnChoices control={control} languages={languages} currency={currency} />
      )}
    </div>
  )
}
