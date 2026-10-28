import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  clampDay,
  monthGrid,
  sameMonth,
  startOfMonth,
  startOfWeek,
} from '@/shared/utils/format/calendar'

describe('addDays', () => {
  it('moves forward and back across months and years', () => {
    expect(addDays('2026-10-28', 1)).toBe('2026-10-29')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-10-28', 0)).toBe('2026-10-28')
  })

  it('counts a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })
})

describe('addMonths', () => {
  it('keeps the day of the month', () => {
    expect(addMonths('2026-10-28', 1)).toBe('2026-11-28')
    expect(addMonths('2026-10-28', -12)).toBe('2025-10-28')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('lands on the last day of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })
})

describe('startOfMonth and sameMonth', () => {
  it('finds the first of the month', () => {
    expect(startOfMonth('2026-10-28')).toBe('2026-10-01')
  })

  it('tells the same month of the same year apart', () => {
    expect(sameMonth('2026-10-01', '2026-10-31')).toBe(true)
    expect(sameMonth('2026-10-01', '2025-10-01')).toBe(false)
  })
})

describe('clampDay', () => {
  it('keeps a day within the earliest and latest', () => {
    expect(clampDay('2026-10-28', '2026-11-01')).toBe('2026-11-01')
    expect(clampDay('2026-10-28', undefined, '2026-10-01')).toBe('2026-10-01')
    expect(clampDay('2026-10-28', '2026-10-01', '2026-12-01')).toBe('2026-10-28')
    expect(clampDay('2026-10-28')).toBe('2026-10-28')
  })
})

describe('startOfWeek', () => {
  it('goes back to the Monday', () => {
    // 2026-10-28 is a Wednesday.
    expect(startOfWeek('2026-10-28')).toBe('2026-10-26')
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26')
    // A Sunday ends the week begun the Monday before.
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26')
  })
})

describe('monthGrid', () => {
  it('is six weeks, Monday first, filled from the months around', () => {
    const weeks = monthGrid('2026-10-28')

    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    // October 2026 starts on a Thursday.
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(weeks[5]![6]).toBe('2026-11-08')
  })

  it('starts on the 1st when the month starts on a Monday', () => {
    // June 2026 starts on a Monday.
    expect(monthGrid('2026-06-15')[0]![0]).toBe('2026-06-01')
  })
})
