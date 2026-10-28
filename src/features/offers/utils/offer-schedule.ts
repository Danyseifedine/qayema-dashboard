import { t } from '@/lib/i18n'
import type { Locale } from '@/shared/constants/locales'
import { weekdayNames } from '@/shared/utils/format/date'
import { minutesOf } from '@/shared/utils/format/clock'
import { WEEKDAYS, type Offer, type OfferPayload } from '@/features/offers/schemas/offer.schema'

/** What a schedule sentence is made from: a saved offer or the form about to be saved. */
type Schedule = Pick<
  Offer | OfferPayload,
  'repeat' | 'weekdays' | 'month_days' | 'time_windows' | 'starts_at' | 'ends_at'
> & { shows_outside_hours?: boolean }

/** Now as a local "2026-11-01T18:00", on this device's clock. */
function localNow(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** "18:00" as the reader's clock shows it: "6:00 PM", or "18:00" in Arabic. */
export function clockTime(time: string, locale: Locale): string {
  const minutes = minutesOf(time)
  if (minutes === null) return time
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60),
  )
}

/** A local "2026-11-01T18:00" as a date, with its time unless it is midnight. */
export function localDate(value: string, locale: Locale, isEnd = false): string {
  const [date = '', time = '00:00'] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  // An end at midnight closes the day before: "until 30 Nov".
  const midnight = time === '00:00'
  const when = new Date(year!, month! - 1, day! - (isEnd && midnight ? 1 : 0))
  const formatted = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(when)
  return midnight ? formatted : `${formatted}, ${clockTime(time, locale)}`
}

/** "Friday, Saturday and Sunday", joined the reader's way. */
export function joinList(items: readonly string[], locale: Locale): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items)
}

/**
 * The schedule in one line, in the restaurant's own time: "every Friday and
 * Saturday, 6:00 PM to 10:00 PM, from 1 Nov until 30 Nov", and ", shown all
 * the time" for an offer showing outside its days and hours. The twin of the
 * admin's OffersTable::schedule(), for the owner.
 */
export function scheduleSummary(schedule: Schedule, locale: Locale): string {
  const custom =
    schedule.starts_at !== null ||
    schedule.ends_at !== null ||
    schedule.repeat !== 'always' ||
    schedule.time_windows !== null
  if (!custom) return t('offers:summary.always')

  const names = weekdayNames(locale, 'long')
  // Days not picked yet (the editor, before its check): said so, not "every ,".
  const days =
    schedule.repeat === 'weekly' && schedule.weekdays.length === 0
      ? t('offers:summary.noWeekdays')
      : schedule.repeat === 'monthly' && schedule.month_days.length === 0
        ? t('offers:summary.noMonthDays')
        : schedule.repeat === 'weekly'
          ? t('offers:summary.weekdays', {
              days: joinList(
                WEEKDAYS.filter((day) => schedule.weekdays.includes(day)).map(
                  (day) => names[WEEKDAYS.indexOf(day)]!,
                ),
                locale,
              ),
            })
          : schedule.repeat === 'monthly'
            ? t('offers:summary.monthDays', {
                days: joinList([...schedule.month_days].sort((a, b) => a - b).map(String), locale),
              })
            : t('offers:summary.everyDay')

  const times =
    schedule.time_windows === null
      ? t('offers:summary.allDay')
      : joinList(
          schedule.time_windows.map((window) =>
            t('offers:summary.between', {
              from: clockTime(window.from, locale),
              to: clockTime(window.to, locale),
            }),
          ),
          locale,
        )

  const dates = [
    schedule.starts_at
      ? t('offers:summary.from', { date: localDate(schedule.starts_at, locale) })
      : null,
    schedule.ends_at
      ? t('offers:summary.until', { date: localDate(schedule.ends_at, locale, true) })
      : null,
  ].filter((part): part is string => part !== null)

  const hours = schedule.repeat !== 'always' || schedule.time_windows !== null
  const shown = schedule.shows_outside_hours && hours ? [t('offers:summary.shownAlways')] : []

  return [days, times, ...dates, ...shown].join(', ')
}

/**
 * "Live now", "Starts 13 Nov, 6:00 PM", "Ended" or "Paused", from what the
 * server worked out; an offer shown outside its hours waiting for them:
 * "Shown, deal from 13 Nov, 6:00 PM" (not before its first day: it shows
 * from then, judged on this device's clock, the owner's being the
 * restaurant's as a rule).
 */
export function statusLine(
  offer: Pick<Offer, 'status' | 'next_start'> &
    Partial<Pick<Offer, 'shows_outside_hours' | 'starts_at'>>,
  locale: Locale,
): string {
  if (offer.status === 'scheduled' && offer.next_start !== null) {
    const when = localDate(offer.next_start, locale)
    // Both local "2026-11-01T18:00", so they compare as text.
    const started = !offer.starts_at || offer.starts_at <= localNow()
    return offer.shows_outside_hours && started
      ? t('offers:status.dealStarts', { when })
      : t('offers:status.scheduled', { when })
  }
  return t(`offers:status.${offer.status === 'scheduled' ? 'ended' : offer.status}`)
}
