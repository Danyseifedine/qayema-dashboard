import { useMemo } from 'react'
import { useDishes } from '@/features/menu'
import type { Locale } from '@/shared/constants/locales'
import { rateFor } from '@/shared/utils/format/money'
import { translated } from '@/shared/utils/string/translated'
import type { PricedDish } from '@/features/offers/utils/discount'

/** A dish as the offers work with it: priced, and whether guests see it. */
export type OfferDish = PricedDish & {
  /** Shown to guests: available, in a category. */
  shown: boolean
  /** An offer's deal dish (on the menu only while that offer runs). */
  deal: boolean
}

/**
 * The restaurant's dishes with their names in `locale` and each price's
 * rate into the main currency (an amount off is in it), for the list's
 * warnings, the editor's amount check and the dish picker. Undefined while
 * they load.
 */
export function usePricedDishes({
  locale,
  currency,
  exchangeRate,
}: {
  locale: Locale
  /** The main currency. */
  currency: string
  /** Main per one of the second currency; null without one. */
  exchangeRate: string | null
}): { data: OfferDish[] | undefined; isPending: boolean } {
  const dishes = useDishes()
  const data = useMemo(
    () =>
      dishes.data?.data.map((dish) => ({
        id: dish.id,
        name: translated(dish.name, locale).text,
        price: dish.price,
        currency: dish.currency,
        rate: rateFor(dish.currency, currency, exchangeRate),
        shown: dish.is_available && dish.category_id !== null,
        deal: dish.offer !== null,
      })),
    [dishes.data, locale, currency, exchangeRate],
  )
  return { data, isPending: dishes.isPending }
}
