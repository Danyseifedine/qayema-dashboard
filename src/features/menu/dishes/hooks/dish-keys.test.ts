import { describe, expect, it } from 'vitest'
import { dishKeys } from '@/features/menu/dishes/hooks/dish-keys'

describe('dishKeys', () => {
  it('builds every key under the dishes root, so one prefix invalidates all', () => {
    expect(dishKeys.all).toEqual(['dishes'])
    expect(dishKeys.lists()).toEqual(['dishes', 'list'])
    expect(dishKeys.list(3)).toEqual(['dishes', 'list', 3])
    expect(dishKeys.list(null)).toEqual(['dishes', 'list', null])
    expect(dishKeys.detail(9)).toEqual(['dishes', 'detail', 9])
    // Each filtered list sits under `lists()`, so invalidating that reaches them.
    expect(dishKeys.list(3).slice(0, 2)).toEqual(dishKeys.lists())
  })
})
