import { describe, expect, it } from 'vitest'
import { categoryKeys } from '@/features/menu/categories/hooks/category-keys'

describe('categoryKeys', () => {
  it('builds every key under the categories root, so one prefix invalidates all', () => {
    expect(categoryKeys.all).toEqual(['categories'])
    expect(categoryKeys.list()).toEqual(['categories', 'list'])
    expect(categoryKeys.detail(4)).toEqual(['categories', 'detail', 4])
    for (const key of [categoryKeys.list(), categoryKeys.detail(4)]) {
      expect(key.slice(0, categoryKeys.all.length)).toEqual(categoryKeys.all)
    }
  })
})
