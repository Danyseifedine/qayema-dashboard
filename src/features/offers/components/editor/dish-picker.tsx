import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { Field } from '@/shared/components/forms'
import { CheckRow, Input } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'
import { usePricedDishes } from '@/features/offers/hooks/use-priced-dishes'
import { discountedCents } from '@/features/offers/utils/discount'

export type DishPickerProps = {
  control: Control<OfferFormValues>
  /** The main currency, which an amount off is in. */
  currency: string
  /** Main per one of the second currency; null without one. */
  exchangeRate: string | null
  locale: Locale
  /** The discount being set, to show each chosen dish's new price; null for none. */
  discount: { type: OfferFormValues['discount_type']; value: number } | null
}

/**
 * The dishes an offer is for: the restaurant's dishes to tick, found by
 * name, with each chosen one's price before and after the discount, or a
 * word when the discount would take all of its price (so it does not apply).
 */
export function DishPicker({ control, currency, exchangeRate, locale, discount }: DishPickerProps) {
  const { t } = useTranslation('offers')
  // Each shown in its own currency; an amount off counts at the rate there.
  const dishes = usePricedDishes({ locale, currency, exchangeRate })
  const { field, fieldState } = useController({ control, name: 'dish_ids' })
  const [query, setQuery] = useState('')
  const chosen = field.value

  // An offer's deal dish (this one's too) is never one to discount: the server refuses it.
  const all = (dishes.data ?? []).filter((dish) => !dish.deal)
  const needle = query.trim().toLocaleLowerCase(locale)
  const shown =
    needle === '' ? all : all.filter((dish) => dish.name.toLocaleLowerCase(locale).includes(needle))

  const toggle = (id: number) =>
    field.onChange(chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id])

  return (
    <Field
      label={t('editor.dishes')}
      optionalText={t('editor.chosen', { count: chosen.length })}
      hint={t('editor.dishesHint')}
      error={fieldState.error?.message}
    >
      {({ describedBy }) => (
        <div className="flex flex-col gap-2" aria-describedby={describedBy}>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('editor.searchDishes')}
            aria-label={t('editor.searchDishes')}
            leadingIcon={<IconSearch aria-hidden className="size-4" />}
          />
          <div
            role="group"
            aria-label={t('editor.dishes')}
            className="flex max-h-64 flex-col gap-1 overflow-y-auto"
          >
            {all.length === 0 && !dishes.isPending ? (
              <p className="px-1 py-3 text-[13px] text-[var(--muted)]">{t('editor.noDishes')}</p>
            ) : shown.length === 0 && !dishes.isPending ? (
              <p className="px-1 py-3 text-[13px] text-[var(--muted)]">{t('editor.noMatch')}</p>
            ) : null}
            {shown.map((dish) => {
              const on = chosen.includes(dish.id)
              const cents = dish.price === null ? null : Math.round(Number(dish.price) * 100)
              const after =
                on && discount !== null && discount.value > 0 && cents !== null
                  ? discountedCents(cents, discount.type, discount.value, dish.rate)
                  : null
              // The discount would take all of it, so the dish keeps its price.
              const missed = after !== null && cents !== null && cents > 0 && after === cents
              return (
                <CheckRow
                  key={dish.id}
                  on={on}
                  onClick={() => toggle(dish.id)}
                  trailing={
                    missed && cents !== null ? (
                      <span className="shrink-0 text-[12px] text-status-warn">
                        <Money amount={cents / 100} currency={dish.currency} />{' '}
                        {t('editor.notApplied')}
                      </span>
                    ) : cents !== null ? (
                      <span className="shrink-0 text-[12.5px] text-[var(--muted)]">
                        {after !== null && after !== cents ? (
                          <Trans
                            t={t}
                            i18nKey="editor.newPrice"
                            components={{
                              was: <Money amount={cents / 100} currency={dish.currency} />,
                              now: <Money amount={after / 100} currency={dish.currency} />,
                            }}
                          />
                        ) : (
                          <Money amount={cents / 100} currency={dish.currency} />
                        )}
                      </span>
                    ) : null
                  }
                >
                  {dish.name}
                </CheckRow>
              )
            })}
          </div>
        </div>
      )}
    </Field>
  )
}
