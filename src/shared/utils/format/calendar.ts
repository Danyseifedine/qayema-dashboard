import { parseDay, todayDay } from '@/shared/utils/format/date'

/**
 * Calendar arithmetic on days written "YYYY-MM-DD", the way the API and the
 * date picker keep them. Strings compare in date order, so `a < b` is
 * "a is earlier".
 */

/** The day `count` days after (or before, when negative) this one. */
export function addDays(day: string, count: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + count)
  return todayDay(date)
}

/**
 * The same day `count` months later (or earlier), on the month's last day
 * when it has fewer: January 31 plus one month is February 28.
 */
export function addMonths(day: string, count: number): string {
  const date = parseDay(day)
  const wanted = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + count)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(wanted, last))
  return todayDay(date)
}

/** The first day of the day's month: "2026-11-01". */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`
}

/** Whether two days fall in the same month of the same year. */
export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** The day kept within the earliest and latest allowed, either optional. */
export function clampDay(day: string, min?: string, max?: string): string {
  if (min && day < min) return min
  if (max && day > max) return max
  return day
}

/** The Monday on or before the day. */
export function startOfWeek(day: string): string {
  // getDay() counts from Sunday (0); a week here starts on Monday.
  return addDays(day, -((parseDay(day).getDay() + 6) % 7))
}

/**
 * The six weeks a month's page shows, Monday first: the month's own days with
 * the ends of the months before and after filling the first and last week.
 * Always 42 days, so the page keeps one height from month to month.
 */
export function monthGrid(month: string): string[][] {
  const first = startOfWeek(startOfMonth(month))
  return Array.from({ length: 6 }, (_week, week) =>
    Array.from({ length: 7 }, (_day, weekday) => addDays(first, week * 7 + weekday)),
  )
}
