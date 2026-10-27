import { describe, expect, it } from 'vitest'
import {
  LAST_STEP,
  STEPS,
  firstStepWithError,
  stepOf,
} from '@/features/offers/components/editor/offer-steps'

describe('offer steps', () => {
  it('runs from the picture to the review', () => {
    expect(STEPS.map((step) => step.id)).toEqual(['content', 'where', 'tap', 'when', 'review'])
    expect(LAST_STEP).toBe(4)
  })

  it("finds the step of a field, a path under it, or the server's name for it", () => {
    expect(stepOf('title')).toBe(0)
    expect(stepOf('title.en')).toBe(0)
    expect(stepOf('image_key')).toBe(0)
    expect(stepOf('popup_shape')).toBe(1)
    expect(stepOf('dish_ids.0')).toBe(2)
    expect(stepOf('time_windows.1.from')).toBe(3)
    expect(stepOf('ends_at')).toBe(3)
    expect(stepOf('is_active')).toBe(4)
    expect(stepOf('limit')).toBeNull()
  })

  it('opens the earliest step that has something to fix', () => {
    expect(firstStepWithError(['weekdays', 'discount_value', 'limit'])).toBe(2)
    expect(firstStepWithError(['limit'])).toBeNull()
    expect(firstStepWithError([])).toBeNull()
  })
})
