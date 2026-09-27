import type { Locale } from '@/shared/constants/locales'

/** "2026-09-21" read as that calendar day, not midnight UTC. */
export function parseDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function formatDay(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parseDay(date))
}

/** Monday first, in the reader's language. 2024-01-01 was a Monday. */
export function weekdayNames(locale: Locale, width: 'short' | 'long' = 'short'): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: width })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index)))
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
