import { describe, expect, it } from 'vitest'
import {
  categoryCollectionSchema,
  categoryFormSchema,
  categoryListSchema,
  categoryResponseSchema,
} from '@/features/menu/categories/schemas/category.schema'
import { makeCategory, resetFactories } from '@/test/mocks/factories/menu'

describe('category schemas', () => {
  it('reads the index with its usage block, where a null limit is unlimited', () => {
    resetFactories()
    const list = { data: [makeCategory()], meta: { used: 1, limit: null } }

    expect(categoryListSchema.parse(list)).toEqual(list)
    // Reorder answers without the usage block, and the index never does.
    expect(categoryListSchema.safeParse({ data: list.data }).success).toBe(false)
    expect(categoryCollectionSchema.parse({ data: list.data })).toEqual({ data: list.data })
  })

  it('takes a category without a dish count, which the resource marks optional', () => {
    const category = makeCategory({ id: 3, dishes_count: undefined })

    expect(categoryResponseSchema.parse({ data: category }).data.dishes_count).toBeUndefined()
  })

  it('refuses a plain-string name', () => {
    const category = { ...makeCategory({ id: 4 }), name: 'Starters' }

    expect(categoryResponseSchema.safeParse({ data: category }).success).toBe(false)
  })
})

describe('categoryFormSchema', () => {
  it('reports a missing name together with a description that is too long', () => {
    const result = categoryFormSchema.safeParse({
      name: { en: '', ar: '' },
      description: { en: 'x'.repeat(301), ar: '' },
    })

    const paths = result.error?.issues.map((issue) => issue.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['name.en', 'description.en']))
  })

  it('accepts an English name and a blank description', () => {
    const result = categoryFormSchema.safeParse({
      name: { en: ' Drinks ', ar: '' },
      description: { en: '', ar: '' },
    })

    expect(result.success).toBe(true)
    // Trimmed on the way out.
    expect(result.data?.name.en).toBe('Drinks')
  })

  it('requires the name in English', () => {
    const result = categoryFormSchema.safeParse({
      name: { en: '  ', ar: 'مشروبات' },
      description: { en: '', ar: '' },
    })

    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['name', 'en'],
        message: 'A category name is required in English.',
      }),
    )
  })

  it('names the field and its limit when a name or description runs long', () => {
    const result = categoryFormSchema.safeParse({
      name: { en: 'x'.repeat(256) },
      description: { en: 'y'.repeat(301) },
    })

    const messages = result.error?.issues.map((issue) => issue.message) ?? []
    expect(messages.some((m) => m.includes('name') && m.includes('255'))).toBe(true)
    expect(messages.some((m) => m.includes('description') && m.includes('300'))).toBe(true)
  })
})
