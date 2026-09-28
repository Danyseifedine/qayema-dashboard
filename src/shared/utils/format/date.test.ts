import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDay,
  formatHour,
  parseDay,
  weekdayNames,
} from '@/shared/utils/format/date'

describe('parseDay', () => {
  it('reads "YYYY-MM-DD" as that calendar day at local midnight', () => {
    const day = parseDay('2026-09-21')

    // Local getters, so the day never slips back one in a zone west of UTC.
    expect(day.getFullYear()).toBe(2026)
    expect(day.getMonth()).toBe(8)
    expect(day.getDate()).toBe(21)
    expect(day.getHours()).toBe(0)
    expect(day.getMinutes()).toBe(0)
  })

  it('handles the first day of the year', () => {
    const day = parseDay('2024-01-01')

    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2024, 0, 1])
  })
})

describe('formatDate', () => {
  // A timestamp without a zone is local time, so the calendar day is the same
  // wherever the test runs.
  const noon = '2026-10-12T12:00:00'

  it('shows the day, the short month and the year in English', () => {
    expect(formatDate(noon, 'en')).toBe('Oct 12, 2026')
  })

  it('writes the month in Arabic for an Arabic reader', () => {
    const text = formatDate(noon, 'ar')

    expect(text).toContain('أكتوبر')
    expect(text).not.toContain('Oct')
  })
})

describe('formatDateTime', () => {
  const afternoon = '2026-10-12T14:05:00'

  it('shows the day, the short month and the time in English', () => {
    const text = formatDateTime(afternoon, 'en')

    expect(text).toContain('Oct 12')
    expect(text).toMatch(/02:05\sPM/)
  })

  it('writes the month in Arabic for an Arabic reader', () => {
    const text = formatDateTime(afternoon, 'ar')

    expect(text).toContain('أكتوبر')
    expect(text).not.toContain('Oct')
  })
})

describe('formatDay', () => {
  it('shows the short month and day of a calendar date', () => {
    expect(formatDay('2026-09-21', 'en')).toBe('Sep 21')
  })

  it('never shows the day before, whatever the timezone', () => {
    // parseDay keeps the date local; `new Date('2026-01-01')` would be UTC
    // midnight and read as 31 Dec west of Greenwich.
    expect(formatDay('2026-01-01', 'en')).toBe('Jan 1')
  })
})

describe('weekdayNames', () => {
  it('starts on Monday and has seven short names', () => {
    expect(weekdayNames('en')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('gives the long names on request', () => {
    const names = weekdayNames('en', 'long')

    expect(names[0]).toBe('Monday')
    expect(names[6]).toBe('Sunday')
    expect(names).toHaveLength(7)
  })

  it('names the days in the reader’s language', () => {
    const names = weekdayNames('ar', 'long')

    expect(names[0]).toBe('الاثنين')
    expect(names).toHaveLength(7)
  })
})

describe('formatHour', () => {
  it('pads a single-digit hour', () => {
    expect(formatHour(0)).toBe('00:00')
    expect(formatHour(7)).toBe('07:00')
  })

  it('leaves a two-digit hour alone', () => {
    expect(formatHour(13)).toBe('13:00')
    expect(formatHour(23)).toBe('23:00')
  })
})
