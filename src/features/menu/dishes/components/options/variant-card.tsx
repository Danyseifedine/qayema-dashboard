import { IconPlus, IconTrash } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useFieldArray, useWatch, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { mainLanguageOf } from '@/shared/constants/menu-languages'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'
import { ChoiceRow } from '@/features/menu/dishes/components/options/choice-row'
import {
  ChoiceError,
  ChoiceNameInput,
} from '@/features/menu/dishes/components/options/choice-fields'
import { CHOICE_LIMITS, blankChoice } from '@/features/menu/dishes/schemas/dish-choices.schema'
import type { DishFormInput } from '@/features/menu/dishes/schemas/dish.schema'

export type VariantCardProps = {
  control: Control<DishFormInput>
  index: number
  languages: readonly string[]
  language: string
  currency: string
  handle: ReactNode
  onRemove: () => void
}

/**
 * One variant: its name ("Size") over its options ("Small", "Large"), each
 * with what it adds to the dish's price. Options drag into order.
 */
export function VariantCard({
  control,
  index,
  languages,
  language,
  currency,
  handle,
  onRemove,
}: VariantCardProps) {
  const { t } = useTranslation('menu')
  const options = useFieldArray({ control, name: `variants.${index}.options` })
  const name = useWatch({ control, name: `variants.${index}.name.${mainLanguageOf(languages)}` })
  // The first variant of a dish with no price of its own holds the prices.
  const dishPrice = useWatch({ control, name: 'price' })
  const full = index === 0 && (dishPrice === null || dishPrice === undefined)
  const label = name?.trim() || t('choices.variantNumber', { number: index + 1 })

  return (
    <div className="rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--surface)] p-2.5">
      {/* One line on a wide screen. On a phone the handle and the bin go up
          beside a small "Variant 1", so the name gets the whole width. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="col-start-1 row-start-1 ps-1 text-[12px] font-medium text-[var(--muted)] sm:hidden">
          {t('choices.variantNumber', { number: index + 1 })}
        </span>
        <div className="col-start-3 row-start-1 sm:col-start-1">{handle}</div>
        <ChoiceNameInput
          control={control}
          name={`variants.${index}.name`}
          language={language}
          label={t('choices.variantName')}
          placeholder={t('choices.variantPlaceholder')}
          className="col-span-3 col-start-1 row-start-2 font-medium sm:col-span-1 sm:col-start-2 sm:row-start-1"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('choices.removeVariant', { name: label })}
          onClick={onRemove}
          className="col-start-2 row-start-1 sm:col-start-3"
        >
          <IconTrash aria-hidden className="size-4" />
        </Button>
      </div>
      <div className="sm:ps-12">
        <ChoiceError
          control={control}
          path={`variants.${index}`}
          languages={languages}
          language={language}
        />
      </div>

      {/* Indented under the variant's name where there is room for it. */}
      <div className="mt-2 flex flex-col gap-2 sm:ms-5 sm:gap-1.5 sm:border-s-2 sm:border-[var(--line)] sm:ps-2">
        <SortableList
          items={options.fields}
          layout="list"
          onReorder={(_, from, to) => options.move(from, to)}
        >
          {options.fields.map((field, option) => (
            <SortableCard key={field.id} id={field.id}>
              {({ handle: optionHandle }) => (
                <ChoiceRow
                  control={control}
                  path={`variants.${index}.options.${option}`}
                  languages={languages}
                  language={language}
                  currency={currency}
                  handle={optionHandle}
                  nameLabel={t('choices.optionName', { variant: label, number: option + 1 })}
                  priceLabel={t(full ? 'choices.optionFullPrice' : 'choices.optionPrice', {
                    variant: label,
                    number: option + 1,
                  })}
                  full={full}
                  removeLabel={t('choices.removeOption', { variant: label, number: option + 1 })}
                  placeholder={t('choices.optionPlaceholder')}
                  onRemove={() => options.remove(option)}
                />
              )}
            </SortableCard>
          ))}
        </SortableList>

        {options.fields.length < CHOICE_LIMITS.options ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<IconPlus aria-hidden className="size-4" />}
              onClick={() => options.append(blankChoice(languages))}
            >
              {t('choices.addOption')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
