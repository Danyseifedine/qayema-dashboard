import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Dish } from '@/features/menu'
import { Button, Collapse, HelperText, ToggleChip } from '@/shared/components/ui'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import { cn } from '@/shared/utils/dom/cn'
import { BuildPicture } from '@/features/build-your-own/components/editor/build-picture'
import { errorPaths } from '@/features/build-your-own/components/editor/build-steps'
import { OptionCards } from '@/features/build-your-own/components/editor/option-cards'
import { PartPrices } from '@/features/build-your-own/components/editor/part-prices'
import {
  FIRST_COUNTS,
  PART_COUNTS,
  dishKey,
  type BuildFormInput,
  type BuildFormValues,
  type PartPricesForm,
} from '@/features/build-your-own/schemas/build.schema'
import { sizeLabel } from '@/features/build-your-own/utils/build-labels'
import type { BuildShape } from '@/features/build-your-own/utils/build-price'

export type SizesStepProps = {
  form: UseFormReturn<BuildFormInput, unknown, BuildFormValues>
  /** The picked category's dishes guests can choose (offeredDishes). */
  offered: readonly Dish[]
  currency: string
  /** A dish's name in the menu's language. */
  dishName: (name: Dish['name']) => string
  languages: readonly string[]
}

/**
 * The third step: how it is made (asked here for "Something else" only:
 * a pizza is split and scoops are pieces, as their card set), the sizes
 * guests can pick (Whole to Quarters, or 1 to 4 pieces, with More for the
 * rest),
 * and, behind "Set your own prices", a price per part for each choice of a
 * split build: an empty box keeps the part's share of the whole.
 */
export function SizesStep({ form, offered, currency, dishName, languages }: SizesStepProps) {
  const { t } = useTranslation('build-your-own')
  const { control } = form
  const [kind, shape, parts, source, choices, dishPrices] = useWatch({
    control,
    name: ['kind', 'shape', 'parts', 'source', 'choices', 'dish_prices'],
  })
  const { errors } = useFormState({ control, name: ['parts', 'dish_prices', 'choices'] })
  const partsError = errors.parts?.message

  // Part prices are a split build's, for its sizes over 1.
  const counts = shape === 'split' ? parts.filter((count) => count > 1) : []
  const hasOwn = (prices: PartPricesForm | undefined) =>
    counts.some((count) => typeof prices?.[count] === 'number')
  const main = mainLanguageOf(languages)
  const rows =
    source === 'category'
      ? offered.map((dish) => ({
          key: dishKey(dish.id),
          path: `dish_prices.${dishKey(dish.id)}`,
          choice: dishName(dish.name),
          whole: Number(dish.price),
        }))
      : choices.map((row, index) => ({
          key: `row${index}`,
          path: `choices.${index}.part_prices`,
          choice: row.name[main]?.trim() || t('choices.rowName', { number: index + 1 }),
          whole: row.price,
        }))

  const [more, setMore] = useState(() => parts.some((count) => count > FIRST_COUNTS))
  const [ownPrices, setOwnPrices] = useState(() =>
    source === 'category'
      ? Object.values(dishPrices).some(hasOwn)
      : choices.some((row) => hasOwn(row.part_prices)),
  )
  // A refused part price is never hidden.
  const priceError = errorPaths(errors).some((path) => /part_prices|dish_prices/.test(path))

  const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted }
  const toggle = (count: number) =>
    form.setValue(
      'parts',
      parts.includes(count)
        ? parts.filter((other) => other !== count)
        : [...parts, count].sort((a, b) => a - b),
      options,
    )

  return (
    <div className="flex flex-col gap-5">
      {kind === 'other' ? (
        <div className="flex flex-col gap-2">
          <p className="label-caps text-[var(--muted)]">{t('sizes.shape')}</p>
          <OptionCards<BuildShape>
            name="shape"
            legend={t('sizes.shape')}
            value={shape}
            onChange={(next) => form.setValue('shape', next, options)}
            className="sm:grid-cols-2"
            options={[
              {
                value: 'split',
                label: t('sizes.shapes.split'),
                hint: t('sizes.shapeHints.split'),
                picture: <BuildPicture shape="split" count={3} />,
              },
              {
                value: 'pieces',
                label: t('sizes.shapes.pieces'),
                hint: t('sizes.shapeHints.pieces'),
                picture: <BuildPicture shape="pieces" count={3} />,
              },
            ]}
          />
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="label-caps mb-2 text-[var(--muted)]">
          {t(shape === 'split' ? 'sizes.splitLabel' : 'sizes.piecesLabel')}
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          {PART_COUNTS.filter((count) => more || count <= FIRST_COUNTS).map((count) => (
            <ToggleChip key={count} on={parts.includes(count)} onClick={() => toggle(count)}>
              {sizeLabel(t, shape, count)}
            </ToggleChip>
          ))}
          {/* "Fewer" would hide a size that is on, so it waits until none is. */}
          {more && parts.some((count) => count > FIRST_COUNTS) ? null : (
            <Button variant="ghost" size="sm" aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? t('sizes.fewer') : t('sizes.more')}
            </Button>
          )}
        </div>
        {partsError ? <HelperText tone="error">{partsError}</HelperText> : null}
      </fieldset>

      {counts.length > 0 && rows.length > 0 ? (
        <div className="flex flex-col gap-2 border-t-[0.5px] border-[var(--line)] pt-4">
          <p className="text-[13px] text-[var(--text)]">{t('sizes.shareLine')}</p>
          <div>
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={ownPrices || priceError}
              onClick={() => setOwnPrices(!ownPrices)}
              leadingIcon={
                <IconChevronDown
                  aria-hidden
                  className={cn(
                    'size-4 transition-transform',
                    (ownPrices || priceError) && 'rotate-180',
                  )}
                />
              }
            >
              {t('sizes.ownPrices')}
            </Button>
          </div>
          <Collapse open={ownPrices || priceError} className="flex flex-col gap-2 pt-1">
            <HelperText>{t('sizes.ownPricesHint')}</HelperText>
            <ul className="flex flex-col gap-1.5">
              {rows.map((row) => (
                <PartPrices
                  key={row.key}
                  control={control}
                  path={row.path}
                  counts={counts}
                  whole={row.whole}
                  currency={currency}
                  choice={row.choice}
                  languages={languages}
                />
              ))}
            </ul>
          </Collapse>
        </div>
      ) : null}
    </div>
  )
}
