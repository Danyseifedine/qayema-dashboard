import { describe, expect, it } from 'vitest'
import {
  joinTime,
  periodOf,
  nextShift,
  runsPastMidnight,
  shiftProblem,
  splitTime,
} from '@/features/restaurant/components/hours/time-options'

describe('time options', () => {
  it('names the part of the day a time falls in', () => {
    expect(periodOf('05:00')).toBe('morning')
    expect(periodOf('11:59')).toBe('morning')
    expect(periodOf('12:00')).toBe('afternoon')
    expect(periodOf('17:00')).toBe('evening')
    expect(periodOf('21:00')).toBe('night')
    expect(periodOf('04:59')).toBe('night')
    expect(periodOf('')).toBeNull()
    expect(periodOf('25:00')).toBeNull()
  })

  it('reads a stored time as a clock shows it', () => {
    expect(splitTime('21:30')).toEqual({ hour: '9', minute: '30', meridiem: 'pm' })
    expect(splitTime('09:00')).toEqual({ hour: '9', minute: '00', meridiem: 'am' })
    expect(splitTime('00:15')).toEqual({ hour: '12', minute: '15', meridiem: 'am' })
    expect(splitTime('12:00')).toEqual({ hour: '12', minute: '00', meridiem: 'pm' })
    expect(splitTime('')).toEqual({ hour: null, minute: null, meridiem: null })
  })

  it('stores what was picked as HH:MM, midnight and noon included', () => {
    expect(joinTime('9', '30', 'pm')).toBe('21:30')
    expect(joinTime('9', '00', 'am')).toBe('09:00')
    expect(joinTime('12', '00', 'am')).toBe('00:00')
    expect(joinTime('12', '45', 'pm')).toBe('12:45')
  })

  it('round-trips every quarter hour of the day', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      const { hour, minute, meridiem } = splitTime(time)
      expect(joinTime(hour!, minute!, meridiem!)).toBe(time)
    }
  })

  it('knows a day that closes after midnight', () => {
    expect(runsPastMidnight('20:00', '02:00')).toBe(true)
    expect(runsPastMidnight('09:00', '22:00')).toBe(false)
    expect(runsPastMidnight('09:00', '')).toBe(false)
  })

  it('finds the shift at fault the way the server does', () => {
    expect(
      shiftProblem([
        { open: '18:00', close: '01:00' },
        { open: '12:00', close: '15:00' },
      ]),
    ).toBeNull()
    expect(
      shiftProblem([
        { open: '12:00', close: '15:00' },
        { open: '15:00', close: '18:00' },
      ]),
    ).toBeNull()
    expect(
      shiftProblem([
        { open: '15:00', close: '23:00' },
        { open: '12:00', close: '16:00' },
      ]),
    ).toEqual({ index: 0, reason: 'overlap' })
    expect(
      shiftProblem([
        { open: '20:00', close: '02:00' },
        { open: '22:00', close: '23:00' },
      ]),
    ).toEqual({ index: 0, reason: 'pastMidnight' })
  })

  it('starts a new shift where the last one closes, for two hours', () => {
    expect(nextShift({ open: '12:00', close: '15:00' })).toEqual({ open: '15:00', close: '17:00' })
    expect(nextShift({ open: '18:00', close: '23:00' })).toEqual({ open: '23:00', close: '01:00' })
    expect(nextShift({ open: '18:00', close: '' })).toEqual({ open: '18:00', close: '20:00' })
    expect(nextShift(undefined)).toEqual({ open: '18:00', close: '20:00' })
  })
})
