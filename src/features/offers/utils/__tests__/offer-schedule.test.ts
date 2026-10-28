import { afterEach, describe, expect, it, vi } from 'vitest'
import { discountedCents } from '@/features/offers/utils/discount'
import {
  clockTime,
  joinList,
  localDate,
  scheduleSummary,
  statusLine,
} from '@/features/offers/utils/offer-schedule'

const always: Parameters<typeof scheduleSummary>[0] = {
  repeat: 'always',
  weekdays: [],
  month_days: [],
  time_windows: null,
  starts_at: null,
  ends_at: null,
}

describe('offer schedule', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('says an offer with no rules is always on', () => {
    expect(scheduleSummary(always, 'en')).toBe('always')
  })

  it('names the days, the times and the dates', () => {
    expect(
      scheduleSummary(
        { ...always, repeat: 'monthly', month_days: [15, 1], starts_at: '2026-11-01T09:30' },
        'en',
      ),
    ).toMatch(/^on day 1 and 15 of each month, all day, from Nov 1, 9:30\s?AM$/)
    expect(
      scheduleSummary(
        { ...always, time_windows: [{ from: '12:00', to: '14:00' }], ends_at: '2026-12-01T00:00' },
        'en',
      ),
    ).toMatch(/^every day, 12:00\s?PM to 2:00\s?PM, until Nov 30$/)
  })

  it('says days not picked yet plainly, never "every ,"', () => {
    const hours = { ...always, time_windows: [{ from: '17:00', to: '19:00' }] }
    expect(scheduleSummary({ ...hours, repeat: 'weekly' }, 'en')).toMatch(
      /^on the weekdays you pick, 5:00\s?PM to 7:00\s?PM$/,
    )
    expect(scheduleSummary({ ...always, repeat: 'monthly' }, 'en')).toBe(
      'on the days of the month you pick, all day',
    )
  })

  it('says an offer shows all the time only when it has days or hours to wait for', () => {
    const fridays = {
      ...always,
      repeat: 'weekly' as const,
      weekdays: ['fri' as const],
      shows_outside_hours: true,
    }
    expect(scheduleSummary(fridays, 'en')).toBe('every Friday, all day, shown all the time')
    expect(scheduleSummary({ ...fridays, shows_outside_hours: false }, 'en')).toBe(
      'every Friday, all day',
    )
    expect(
      scheduleSummary(
        { ...always, starts_at: '2026-11-01T00:00', shows_outside_hours: true },
        'en',
      ),
    ).toBe('every day, all day, from Nov 1')
  })

  it('says an offer shown outside its hours is shown, its deal starting later', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 10, 12, 0))
    const waiting = {
      status: 'scheduled' as const,
      next_start: '2026-11-13T18:00',
      shows_outside_hours: true,
    }
    expect(statusLine(waiting, 'en')).toMatch(/^Shown, deal from Nov 13, 6:00\s?PM$/)
    expect(statusLine({ ...waiting, starts_at: '2026-11-01T00:00' }, 'en')).toMatch(/^Shown/)
    // Before its first day it shows nowhere yet.
    expect(statusLine({ ...waiting, starts_at: '2026-11-12T00:00' }, 'en')).toMatch(/^Starts/)
    expect(statusLine({ ...waiting, shows_outside_hours: false }, 'en')).toMatch(/^Starts/)
  })

  it('reads a time and a date the way the reader does', () => {
    expect(clockTime('nope', 'en')).toBe('nope')
    expect(localDate('2026-11-13T18:00', 'en')).toMatch(/^Nov 13, 6:00\s?PM$/)
    expect(localDate('2026-12-01T00:00', 'en', true)).toBe('Nov 30')
  })

  it('says where an offer stands', () => {
    expect(statusLine({ status: 'live', next_start: null }, 'en')).toBe('Live now')
    expect(statusLine({ status: 'scheduled', next_start: '2026-11-22T00:00' }, 'en')).toBe(
      'Starts Nov 22',
    )
    // Scheduled with nothing left to start: as good as ended.
    expect(statusLine({ status: 'scheduled', next_start: null }, 'en')).toBe('Ended')
    expect(statusLine({ status: 'paused', next_start: null }, 'en')).toBe('Paused')
  })

  it('works out a discount in whole cents, like the server', () => {
    expect(discountedCents(1250, 'percent', 20)).toBe(1000)
    expect(discountedCents(999, 'percent', 15)).toBe(849)
    // Taking all of the price, it does not apply: never a free dish.
    expect(discountedCents(300, 'amount', 5)).toBe(300)
    expect(discountedCents(1250, 'none', 20)).toBe(1250)
  })
})

describe('joinList', () => {
  it("joins the reader's way", () => {
    expect(joinList(['Banner', 'Pop-up', 'Ad'], 'en')).toBe('Banner, Pop-up, and Ad')
    expect(joinList(['Banner'], 'en')).toBe('Banner')
  })
})
