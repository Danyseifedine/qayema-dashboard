import { useMemo } from 'react'
import { useDishChoices } from '@/features/auth'
import { useDishes } from '@/features/menu'
import type { Locale } from '@/shared/constants/locales'
import { rateFor } from '@/shared/utils/format/money'
import { translated } from '@/shared/utils/string/translated'
import { dishPrices, type PricedDish } from '@/features/offers/utils/discount'

/** A dish as the offers work with it: priced, and whether guests see it. */
export type OfferDish = PricedDish & {
  /** Shown to guests: available, in a category or built by them (above the search). */
  shown: boolean
  /** Built by guests (Build your own): priced by what they build, which a discount covers too. */
  built: boolean
  /** An offer's deal dish (on the menu only while that offer runs). */
  deal: boolean
  /** Null for a dish in no category (a build's, above the search). */
  categoryId: number | null
  /** A build's dish's icon (the categories' set); null for none. */
  icon: string | null
}

/**
 * The restaurant's dishes with their names in `locale`, their prices as a
 * discount reads them (the size and other choices included while variants
 * are on, so a dish priced by its sizes takes one too) and each price's
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
  const { variants } = useDishChoices()
  const data = useMemo(
    () =>
      dishes.data?.data.map((dish) => ({
        id: dish.id,
        name: translated(dish.name, locale).text,
        ...dishPrices(
          {
            price: dish.price,
            variants: dish.variants.map((variant) => ({
              options: variant.options.map((option) => ({
                name: translated(option.name, locale).text,
                price: option.price,
              })),
            })),
          },
          variants,
        ),
        currency: dish.currency,
        rate: rateFor(dish.currency, currency, exchangeRate),
        shown: dish.is_available && (dish.category_id !== null || dish.builds.length > 0),
        built: dish.builds.length > 0,
        deal: dish.offer !== null,
        categoryId: dish.category_id,
        icon: dish.icon,
      })),
    [dishes.data, variants, locale, currency, exchangeRate],
  )
  return { data, isPending: dishes.isPending }
}
