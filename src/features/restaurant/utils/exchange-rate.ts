import { invertRate } from '@/shared/utils/format/money'
import type {
  Restaurant,
  RestaurantFormValues,
} from '@/features/restaurant/schemas/restaurant.schema'

/** The rate as the form holds it: which currency is the 1, and the number typed. */
export type RateForm = Pick<RestaurantFormValues, 'rate_one' | 'rate'>

/** The rate most Lebanese restaurants use: 1 USD = 89,000 LBP. */
const USD_IN_LBP = 89_000

/**
 * The saved rate (main per one second) as the form shows it: the side worth
 * more is the 1, so the number is 1 or more (1 USD = 89,000 LBP whichever
 * is the main currency).
 */
export function toRateForm(exchangeRate: string | null): RateForm {
  if (exchangeRate === null) return { rate_one: 'second', rate: null }
  const rate = Number(exchangeRate)
  return rate >= 1 ? { rate_one: 'second', rate } : { rate_one: 'main', rate: invertRate(rate) }
}

/**
 * Where the rate starts once a second currency is picked: 1 USD = 89,000
 * LBP for that pair, either way round; empty for any other, to be typed.
 */
export function defaultRate(main: string, second: string | null): RateForm {
  if (main === 'LBP' && second === 'USD') return { rate_one: 'second', rate: USD_IN_LBP }
  if (main === 'USD' && second === 'LBP') return { rate_one: 'main', rate: USD_IN_LBP }
  return { rate_one: 'second', rate: null }
}

/** The same rate with the other currency as the 1. */
export function flipRate(form: RateForm): RateForm {
  return {
    rate_one: form.rate_one === 'second' ? 'main' : 'second',
    rate: form.rate === null || form.rate <= 0 ? form.rate : invertRate(form.rate),
  }
}

/**
 * What the save sends as `exchange_rate`: main per one second, null without
 * a second currency. A rate left as it was goes back exactly as the server
 * sent it, so saving the page for another reason never shifts it by a
 * rounding.
 */
export function toExchangeRate(
  values: Pick<RestaurantFormValues, 'second_currency' | 'rate_one' | 'rate'>,
  saved: Restaurant,
): string | number | null {
  if (!values.second_currency || values.rate === null) return null
  const before = toRateForm(saved.exchange_rate)
  // Only turned round (1 LBP = 0.000011236 USD) is the same rate too:
  // sending its rounded inverse would move 89,000 to 88,999.64.
  const same = (form: RateForm) => values.rate_one === form.rate_one && values.rate === form.rate
  if (
    values.second_currency === saved.second_currency &&
    (same(before) || same(flipRate(before)))
  ) {
    return saved.exchange_rate
  }
  return values.rate_one === 'second' ? values.rate : 1 / values.rate
}
