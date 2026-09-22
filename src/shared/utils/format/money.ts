/**
 * Formats a price in the restaurant's currency.
 *
 * Prices stay left-to-right and tabular even inside Arabic copy, so a column
 * of them lines up and the currency symbol does not jump to the wrong side.
 */
export function formatMoney(amount: number, currency: string, locale = 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
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
