import { describe, expect, it } from 'vitest'
import { dishKeys } from '@/features/menu/dishes/hooks/dish-keys'

describe('dishKeys', () => {
  it('builds every key under the dishes root, so one prefix invalidates all', () => {
    expect(dishKeys.all).toEqual(['dishes'])
    expect(dishKeys.list()).toEqual(['dishes', 'list'])
  })
})
