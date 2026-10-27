import { describe, expect, it } from 'vitest'
import {
  errorPaths,
  firstStepWithError,
  stepOf,
} from '@/features/build-your-own/components/editor/build-steps'

describe('the editor’s steps', () => {
  it('finds the step holding a field, a part price always the sizes', () => {
    expect(stepOf('kind')).toBe(0)
    expect(stepOf('choices.0.price')).toBe(1)
    expect(stepOf('choices.0.part_prices.2')).toBe(2)
    expect(stepOf('dish_prices.d12.2')).toBe(2)
    expect(stepOf('dish.name.en')).toBe(3)
    expect(stepOf('name.en')).toBe(3)
    expect(stepOf('root')).toBeNull()
  })

  it('opens the first step with an error', () => {
    expect(firstStepWithError(['dish.price', 'parts'])).toBe(2)
    expect(firstStepWithError(['nothing'])).toBeNull()
  })

  it('lists every error’s path, nested ones in full', () => {
    expect(
      errorPaths({
        kind: { type: 'custom', message: 'Pick one.', ref: { name: 'kind' } },
        choices: {
          root: { message: 'Too few.' },
          0: { part_prices: { 2: { message: 'Negative.' } } },
        },
        empty: null,
      }),
    ).toEqual(['kind', 'choices.0.part_prices.2', 'choices.root'])
    expect(errorPaths(undefined)).toEqual([])
  })
})
