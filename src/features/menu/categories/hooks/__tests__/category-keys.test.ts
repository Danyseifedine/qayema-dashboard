import { describe, expect, it } from 'vitest'
import { categoryKeys } from '@/features/menu/categories/hooks/category-keys'

describe('categoryKeys', () => {
  it('builds every key under the categories root, so one prefix invalidates all', () => {
    expect(categoryKeys.all).toEqual(['categories'])
    expect(categoryKeys.list()).toEqual(['categories', 'list'])
  })
})
