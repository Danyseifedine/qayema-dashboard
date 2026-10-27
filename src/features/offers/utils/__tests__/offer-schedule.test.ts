import { describe, expect, it } from 'vitest'
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
