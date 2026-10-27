import { describe, expect, it } from 'vitest'
import { nextShift } from '@/features/restaurant/utils/time-options'

describe('time options', () => {
  it('starts a new shift where the last one closes, for two hours', () => {
    expect(nextShift({ open: '12:00', close: '15:00' })).toEqual({ open: '15:00', close: '17:00' })
    expect(nextShift({ open: '18:00', close: '23:00' })).toEqual({ open: '23:00', close: '01:00' })
    expect(nextShift({ open: '18:00', close: '' })).toEqual({ open: '18:00', close: '20:00' })
    expect(nextShift(undefined)).toEqual({ open: '18:00', close: '20:00' })
  })
})
