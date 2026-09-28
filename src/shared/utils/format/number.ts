import type { Locale } from '@/shared/constants/locales'

/**
 * A count in the reader's language: "1,234". The digits stay Western in
 * Arabic too, as they are everywhere else in the dashboard.
 */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`).format(value)
}
