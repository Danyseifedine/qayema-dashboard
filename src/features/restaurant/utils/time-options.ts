import { minutesOf, timeOf } from '@/shared/utils/format/clock'

/** A day's shifts at most, as the server's OpeningHours::MAX_SHIFTS. */
export const MAX_SHIFTS = 3

/** One opening range of a day, as "HH:MM". */
type Shift = { open: string; close: string }

/** A new shift: from when the last one closes (18:00 without one), for two hours. */
export function nextShift(last: Shift | undefined): Shift {
  const from = (last ? minutesOf(last.close) : null) ?? 18 * 60
  return { open: timeOf(from), close: timeOf(from + 120) }
}
