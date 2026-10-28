import { t } from '@/lib/i18n'
import type { Locale } from '@/shared/constants/locales'
import { formatMoney } from '@/shared/utils/format/money'
import { formatNumber } from '@/shared/utils/format/number'
import { FREE, type OfferFormValues } from '@/features/offers/schemas/offer.schema'

type DiscountType = OfferFormValues['discount_type']

/** A discount as typed (a comma for the point too) or as saved; 0 when it is not a number. */
export function discountNumber(value: string): number {
  return Number(value.replace(',', '.')) || 0
}

/**
 * "20% off on 2 dishes", "$2.00 off on 1 dish", "2nd one 50% off on 3
 * dishes" or "2nd one free on 3 dishes", in the dashboard's language (the
 * card's and the review's); null without a discount.
 */
export function discountLine(
  discount: { type: DiscountType; value: number; dishes: number },
  { locale, currency }: { locale: Locale; currency: string },
): string | null {
  if (discount.type === 'none') return null
  const off =
    discount.type === 'percent'
      ? t('offers:card.percentOff', { value: formatNumber(discount.value, locale) })
      : discount.type === 'second'
        ? discount.value >= FREE
          ? t('offers:card.secondFree')
          : t('offers:card.secondOff', { value: formatNumber(discount.value, locale) })
        : t('offers:card.amountOff', { value: formatMoney(discount.value, currency) })
  return `${off} ${t('offers:card.dishes', { count: discount.dishes })}`
}

/**
 * A price after a percent or amount off, in whole cents, half up: the twin
 * of the server's OfferDiscount and the menu's menu-offers.js, so what the
 * owner is shown is what guests pay. The price is the dish's own with the
 * size and other choices the guest picks (add-ons keep theirs). A discount
 * that would take the whole price or more does not apply, so a dish is never
 * free: it keeps its price. An amount is in the main currency: off a dish
 * priced in the second one it takes amount / `rate` (the restaurant's
 * exchange rate; 1 for the main). A `second` discount takes nothing off
 * each one: see `secondCents()`.
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

/**
 * What the second one of a pair costs on a `second` discount, in whole
 * cents, half up, as the server's OfferDiscount: 100% off is free.
 */
export function secondCents(cents: number, value: number): number {
  return Math.max(0, Math.round((cents * (100 - Math.min(value, FREE))) / 100))
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

/** A dish's prices as a discount reads them, in whole cents of its own currency. */
export type DishPrices = {
  /**
   * The least it costs before add-ons: its own price (none is 0) and the
   * cheapest option of each variant guests pick from (two options or more),
   * as the server compares offers on. Null when it has neither.
   */
  reference: number | null
  /**
   * A dish priced by its sizes (no price of its own): each option of its
   * first variant with what the rest add at least; empty otherwise.
   */
  sizes: { name: string; cents: number }[]
}

type PricedChoice = { name: string; price: string }

/**
 * A dish's prices for the discount (`variants`: they are on). Variants off,
 * only its own price counts.
 */
export function dishPrices(
  dish: { price: string | null; variants: readonly { options: readonly PricedChoice[] }[] },
  variants: boolean,
): DishPrices {
  const own = dish.price === null ? null : Math.round(Number(dish.price) * 100)
  const picked = variants ? dish.variants.filter((variant) => variant.options.length >= 2) : []
  if (picked.length === 0) return { reference: own, sizes: [] }

  const cheapest = picked.map((variant) =>
    Math.min(...variant.options.map((option) => Math.round(Number(option.price) * 100))),
  )
  const atLeast = cheapest.reduce((sum, cents) => sum + cents, 0)
  const rest = atLeast - cheapest[0]!
  return {
    reference: (own ?? 0) + atLeast,
    sizes:
      own === null
        ? picked[0]!.options.map((option) => ({
            name: option.name,
            cents: Math.round(Number(option.price) * 100) + rest,
          }))
        : [],
  }
}

/**
 * A dish as the amount check needs it: its prices in its own currency, and
 * what one of that currency is worth in the main one (1 for the main).
 */
export type PricedDish = DishPrices & {
  id: number
  name: string
  currency: string
  rate: number
}

/**
 * The cheapest chosen dish a fixed amount would take all of, as the server
 * refuses (StoreOfferRequest): the amount, in the main currency, against
 * each dish's least price (`reference`) turned into the main currency.
 * Dishes with no price at all are left out. Null when the amount is fine,
 * or the discount is not an amount.
 */
export function amountTooBig(
  values: Pick<OfferFormValues, 'discount_type' | 'discount_value' | 'dish_ids'>,
  dishes: readonly PricedDish[],
): PricedDish | null {
  if (values.discount_type !== 'amount') return null
  const amount = Math.round(discountNumber(values.discount_value) * 100)
  if (amount <= 0) return null

  const chosen = dishes
    .filter((dish) => values.dish_ids.includes(dish.id) && dish.reference !== null)
    .map((dish) => ({ dish, cents: Math.round(dish.reference! * dish.rate) }))
    .sort((a, b) => a.cents - b.cents)
  const cheapest = chosen[0]
  return cheapest && amount >= cheapest.cents ? cheapest.dish : null
}
