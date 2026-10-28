import { describe, expect, it } from 'vitest'
import { dishGroups } from '@/features/offers/utils/dish-groups'

const dish = (id: number, categoryId: number | null, built = false) => ({ id, categoryId, built })

describe('dishGroups', () => {
  it('puts the dishes guests build first, then each category in the menu order, then the rest', () => {
    const groups = dishGroups(
      [dish(1, 20), dish(2, 10), dish(3, null, true), dish(4, 99), dish(5, 10)],
      [10, 20],
    )

    expect(groups.map((group) => [group.kind, group.dishes.map((each) => each.id)])).toEqual([
      ['built', [3]],
      ['category', [2, 5]],
      ['category', [1]],
      ['other', [4]],
    ])
  })

  it('keeps a build in its own group even when its dish is filed under a category', () => {
    const groups = dishGroups([dish(1, 10, true), dish(2, 10)], [10])

    expect(groups.map((group) => group.kind)).toEqual(['built', 'category'])
  })

  it('leaves empty groups out, and puts every dish in one group while the categories load', () => {
    expect(dishGroups([dish(1, 10), dish(2, 20)], [])).toEqual([
      { kind: 'other', dishes: [dish(1, 10), dish(2, 20)] },
    ])
    expect(dishGroups([], [10])).toEqual([])
  })
})
