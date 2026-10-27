/**
 * Formats a price in the restaurant's currency, the same in both languages
 * ("$12.50"), as the guest menu and the order cards show it: Western digits
 * and a decimal point, like every number in the dashboard (format/number.ts).
 *
 * Prices stay left-to-right and tabular even inside Arabic copy (`Money`), so
 * a column of them lines up and the currency symbol does not jump sides.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      // Most menu prices are whole or two-decimal; never show more.
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // An unknown currency code should not blank the price.
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * How much one unit of `currency` is worth in the restaurant's main one, as
 * a multiplier: 1 for the main currency itself, the restaurant's exchange
 * rate for its second (always stored as main per one second: main LBP,
 * second USD gives 89000). A rate the server has not sent counts as 1.
 */
export function rateFor(currency: string, main: string, exchangeRate: string | null): number {
  return currency === main || exchangeRate === null ? 1 : Number(exchangeRate)
}

/**
 * A rate the other way round (1 USD = 89,000 LBP from 1 LBP = 0.0000112360
 * USD), kept to the digits it really has: a rate below 1 is stored to 10
 * decimals, so its inverse is given only as many decimals as that carries
 * (89,000 rather than 88,999.644). A result below 1 is kept to 10 decimals,
 * as the server stores it.
 */
export function invertRate(rate: number): number {
  const inverse = 1 / rate
  if (inverse < 1) return Number(inverse.toFixed(10))
  const decimals = Math.min(4, Math.max(0, Math.floor(-Math.log10(5e-11 / (rate * rate)))))
  return Number(inverse.toFixed(decimals))
}

/**
 * The exchange rate as people say it, the side worth more being the one:
 * "1 USD = 89,000 LBP", whichever of the two is the main currency.
 */
export function formatRate(main: string, second: string, exchangeRate: string): string {
  const rate = Number(exchangeRate)
  const [one, other, value] = rate >= 1 ? [second, main, rate] : [main, second, invertRate(rate)]
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
  return `1 ${one} = ${number} ${other}`
}
