import { t } from '@/lib/i18n'
import type { Locale } from '@/shared/constants/locales'
import { formatMoney } from '@/shared/utils/format/money'
import { formatNumber } from '@/shared/utils/format/number'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'

type DiscountType = OfferFormValues['discount_type']

/** A discount as typed (a comma for the point too) or as saved; 0 when it is not a number. */
export function discountNumber(value: string): number {
  return Number(value.replace(',', '.')) || 0
}

/**
 * "20% off on 2 dishes" or "$2.00 off on 1 dish", in the dashboard's
 * language (the card's and the review's); null without a discount.
 */
export function discountLine(
  discount: { type: DiscountType; value: number; dishes: number },
  { locale, currency }: { locale: Locale; currency: string },
): string | null {
  if (discount.type === 'none') return null
  const off =
    discount.type === 'percent'
      ? t('offers:card.percentOff', { value: formatNumber(discount.value, locale) })
      : t('offers:card.amountOff', { value: formatMoney(discount.value, currency) })
  return `${off} ${t('offers:card.dishes', { count: discount.dishes })}`
}

/**
 * A dish's own price after the discount, in whole cents, half up: the twin
 * of the server's OfferDiscount and the menu's menu-offers.js, so what the
 * owner is shown is what guests pay. A discount that would take the whole
 * price or more does not apply, so a dish is never free: it keeps its price.
 * An amount is in the main currency: off a dish priced in the second one it
 * takes amount / `rate` (the restaurant's exchange rate; 1 for the main).
 */
export function discountedCents(
  cents: number,
  type: DiscountType,
  value: number,
  rate = 1,
): number {
  const after =
    type === 'percent'
      ? Math.round((cents * (100 - value)) / 100)
      : type === 'amount'
        ? cents - Math.round((value * 100) / rate)
        : cents
  return after <= 0 ? cents : after
}

/** Whether the discount lowers this price at all (it does not when it would take all of it). */
export function discountApplies(
  cents: number,
  type: DiscountType,
  value: number,
  rate = 1,
): boolean {
  return type !== 'none' && discountedCents(cents, type, value, rate) < cents
}

/**
 * A dish as the amount check needs it: its price in its own currency, and
 * what one of that currency is worth in the main one (1 for the main).
 */
export type PricedDish = {
  id: number
  name: string
  price: string | null
  currency: string
  rate: number
}

/**
 * The cheapest chosen dish a fixed amount would take all of, as the server
 * refuses (StoreOfferRequest): the amount, in the main currency, against
 * each price turned into the main currency. Dishes with no price of their
 * own are left out. Null when the amount is fine, or the discount is not an
 * amount.
 */
export function amountTooBig(
  values: Pick<OfferFormValues, 'discount_type' | 'discount_value' | 'dish_ids'>,
  dishes: readonly PricedDish[],
): PricedDish | null {
  if (values.discount_type !== 'amount') return null
  const amount = Math.round(discountNumber(values.discount_value) * 100)
  if (amount <= 0) return null

  const chosen = dishes
    .filter((dish) => values.dish_ids.includes(dish.id) && dish.price !== null)
    .map((dish) => ({ dish, cents: Math.round(Math.round(Number(dish.price) * 100) * dish.rate) }))
    .sort((a, b) => a.cents - b.cents)
  const cheapest = chosen[0]
  return cheapest && amount >= cheapest.cents ? cheapest.dish : null
}
