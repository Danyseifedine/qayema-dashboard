import { useTranslation } from 'react-i18next'
import { Combobox } from '@/shared/components/ui'
import { formatMoney } from '@/shared/utils/format/money'
import { translated } from '@/shared/utils/string/translated'
import type { BuildShape } from '@/features/orders/schemas/order.schema'
import { partPriceCents, shareCents } from '@/features/build-your-own'
import type { BuildChoice, BuildToFill } from '@/features/orders/utils/order-edit'

export type BuildPickerProps = {
  build: BuildToFill
  /** The choice key picked in each part, null where none yet; undefined before a count. */
  value: readonly (string | null)[] | undefined
  onChange: (parts: (string | null)[]) => void
  /** The dish's currency, its builds' too. */
  currency: string
  locale: string
}

/**
 * One build of a dish being added: how many parts (only when the dish
 * allows more than one count), then a choice for each part, as the guest's
 * sheet asks them. Each choice says what it adds for that many parts.
 */
export function BuildPicker({ build, value, onChange, currency, locale }: BuildPickerProps) {
  const { t } = useTranslation('orders')
  const name = translated(build.name, locale).text

  const countLabel = (shape: BuildShape, count: number): string => {
    if (shape === 'pieces') return t('edit.build.pieces', { count })
    if (count === 1) return t('edit.build.whole')
    if (count === 2) return t('edit.build.halves')
    if (count === 3) return t('edit.build.thirds')
    if (count === 4) return t('edit.build.quarters')
    return t('edit.build.parts', { count })
  }

  // What one part costs: its whole price, or for a pizza in parts the price
  // set for that size, else its share.
  const partCost = (choice: BuildChoice, count: number): number => {
    if (build.shape === 'pieces' || count === 1) return Number(choice.price)
    return (partPriceCents(choice.part_prices, count) ?? shareCents(choice.price, count)) / 100
  }

  return (
    <div role="group" aria-label={name} className="flex flex-col gap-2">
      <p className="text-[12.5px] text-[var(--muted)]">{name}</p>
      {build.parts.length > 1 ? (
        <Combobox
          aria-label={t('edit.build.count', { build: name })}
          placeholder={t('edit.build.countPlaceholder')}
          searchable={false}
          value={value === undefined ? null : String(value.length)}
          onChange={(next) => {
            if (next === null) return
            // Picks already made stay in the parts that are left.
            onChange(Array.from({ length: Number(next) }, (_, index) => value?.[index] ?? null))
          }}
          options={build.parts.map((count) => ({
            value: String(count),
            label: countLabel(build.shape, count),
          }))}
        />
      ) : null}
      {value !== undefined ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {value.map((key, index) => {
            const whole = value.length === 1
            return (
              <Combobox
                // A part is its place in the build: nothing else names it.
                // oxlint-disable-next-line react/no-array-index-key
                key={index}
                aria-label={whole ? name : t('edit.build.part', { build: name, number: index + 1 })}
                placeholder={
                  whole ? t('edit.build.choose') : t('edit.build.partShort', { number: index + 1 })
                }
                searchable={false}
                value={key}
                onChange={(next) => {
                  if (next === null) return
                  onChange(value.map((current, at) => (at === index ? next : current)))
                }}
                options={build.choices.map((choice) => {
                  const cost = partCost(choice, value.length)
                  return {
                    value: choice.key,
                    label: translated(choice.name, locale).text,
                    description: cost > 0 ? `+${formatMoney(cost, currency)}` : undefined,
                  }
                })}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
