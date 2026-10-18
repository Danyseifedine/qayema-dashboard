/** The part of the day a time falls in, named beside the picker. */
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

/** AM or PM, as the picker's switch shows it. */
export type Meridiem = 'am' | 'pm'

/** The minutes the picker offers; a saved time on other minutes keeps them. */
export const QUARTER_HOURS = ['00', '15', '30', '45'] as const

/** "HH:MM", the form the API stores. */
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

function minutesOf(time: string): number | null {
  const match = TIME.exec(time)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** Morning 05:00, afternoon 12:00, evening 17:00, night 21:00 until morning. */
export function periodOf(time: string): DayPeriod | null {
  const minutes = minutesOf(time)
  if (minutes === null) return null
  const hour = Math.floor(minutes / 60)
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/** "21:30" as the picker shows it: hour 9, minutes 30, PM. Null parts when empty. */
export function splitTime(time: string): {
  hour: string | null
  minute: string | null
  meridiem: Meridiem | null
} {
  const minutes = minutesOf(time)
  if (minutes === null) return { hour: null, minute: null, meridiem: null }
  const hour24 = Math.floor(minutes / 60)
  return {
    hour: String(hour24 % 12 === 0 ? 12 : hour24 % 12),
    minute: String(minutes % 60).padStart(2, '0'),
    meridiem: hour24 < 12 ? 'am' : 'pm',
  }
}

/** The picker's three parts back into "HH:MM" (12 AM is 00, 12 PM is 12). */
export function joinTime(hour: string, minute: string, meridiem: Meridiem): string {
  const twelve = Number(hour) % 12
  const hour24 = meridiem === 'pm' ? twelve + 12 : twelve
  return `${String(hour24).padStart(2, '0')}:${minute}`
}

/** True when a day closes after midnight: its close comes before its open. */
export function runsPastMidnight(open: string, close: string): boolean {
  const from = minutesOf(open)
  const to = minutesOf(close)
  return from !== null && to !== null && to <= from
}

/** A day's shifts at most, as the server's OpeningHours::MAX_SHIFTS. */
export const MAX_SHIFTS = 3

/** One opening range of a day, as "HH:MM". */
export type Shift = { open: string; close: string }

/**
 * What is wrong with a day's shifts, as the server's
 * OpeningHours::problemWith() decides: one that runs past midnight before
 * the last, or one that opens before the one before it closes. The shift
 * at fault (its place in the form) and why; null when they fit.
 */
export function shiftProblem(
  shifts: readonly Shift[],
): { index: number; reason: 'pastMidnight' | 'overlap' } | null {
  const sorted = shifts
    .map((shift, index) => ({ ...shift, index }))
    .sort((a, b) => a.open.localeCompare(b.open))

  for (let position = 0; position < sorted.length - 1; position++) {
    const shift = sorted[position]!
    const next = sorted[position + 1]!
    if (runsPastMidnight(shift.open, shift.close)) {
      return { index: shift.index, reason: 'pastMidnight' }
    }
    if (next.open < shift.close) return { index: next.index, reason: 'overlap' }
  }
  return null
}

/** A new shift: from when the last one closes (18:00 without one), for two hours. */
export function nextShift(last: Shift | undefined): Shift {
  const from = (last ? minutesOf(last.close) : null) ?? 18 * 60
  return { open: timeOf(from), close: timeOf(from + 120) }
}

function timeOf(minutes: number): string {
  const inDay = minutes % (24 * 60)
  return `${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}`
}
