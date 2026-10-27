import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceError, ChoicePriceInput } from '@/features/menu'
import type { BuildFormInput } from '@/features/build-your-own/schemas/build.schema'
import { partName } from '@/features/build-your-own/utils/build-labels'
import { shareCents } from '@/features/build-your-own/utils/build-price'

export type PartPricesProps = {
  control: Control<BuildFormInput>
  /** The choice's prices by count: `dish_prices.d12` or `choices.1.part_prices`. */
  path: string
  /** The sizes over 1 the build allows, smallest first. */
  counts: readonly number[]
  /** The choice's whole price, for the share an empty box charges. */
  whole: number | null
  currency: string
  /** The choice's name, over its boxes and in each one's label. */
  choice: string
  languages: readonly string[]
}

/**
 * One choice's own price for a part, a box per size (Half, Third). An empty
 * box charges the part's share of the whole, which it shows: "6.00 auto".
 */
export function PartPrices({
  control,
  path,
  counts,
  whole,
  currency,
  choice,
  languages,
}: PartPricesProps) {
  const { t } = useTranslation('build-your-own')

  return (
    <li className="flex flex-col gap-1.5 rounded-tile bg-[var(--hover-wash)] p-2">
      <span className="text-[13.5px]">{choice}</span>
      <div className="flex flex-wrap gap-2">
        {counts.map((count) => (
          <div key={count} className="flex w-[132px] flex-col gap-1">
            <span aria-hidden className="text-[11.5px] text-[var(--muted)]">
              {partName(t, count)}
            </span>
            <ChoicePriceInput
              control={control}
              name={`${path}.${count}`}
              currency={currency}
              label={t('sizes.partPrice', { choice, count })}
              full
              placeholder={
                whole === null
                  ? undefined
                  : t('sizes.share', { price: (shareCents(whole, count) / 100).toFixed(2) })
              }
            />
          </div>
        ))}
      </div>
      <ChoiceError
        control={control}
        path={path}
        languages={languages}
        language={languages[0]!}
        more={counts.map(String)}
      />
    </li>
  )
}
