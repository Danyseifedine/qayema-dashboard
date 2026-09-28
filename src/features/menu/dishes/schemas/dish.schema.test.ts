import { describe, expect, it } from 'vitest'
import {
  dishCollectionSchema,
  dishFormSchema,
  dishListSchema,
  dishResponseSchema,
} from '@/features/menu/dishes/schemas/dish.schema'
import { makeDish, resetFactories } from '@/test/mocks/factories/menu'

const base = {
  name: { en: 'Hummus', ar: '' },
  ingredients: { en: '', ar: '' },
  price: 8.5,
  is_available: true,
  image: null,
  delete_image: false,
}

describe('dishFormSchema', () => {
  it('rejects a missing category with a readable message', () => {
    const result = dishFormSchema.safeParse({ ...base, category_id: null })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.message === 'Choose a category.')).toBe(true)
  })

  it('rejects the placeholder id 0 that used to slip through', () => {
    const result = dishFormSchema.safeParse({ ...base, category_id: 0 })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain('Choose a category.')
  })

  it('accepts a real category id', () => {
    const result = dishFormSchema.safeParse({ ...base, category_id: 3 })

    expect(result.success).toBe(true)
    expect(result.data?.category_id).toBe(3)
  })

  it('requires the name in English, the language every menu has', () => {
    const result = dishFormSchema.safeParse({
      ...base,
      name: { en: '', fr: 'Pain' },
      category_id: 3,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['name', 'en'],
        message: 'A dish name is required in English.',
      }),
    )
  })

  it('reports a missing name together with the other mistakes', () => {
    const result = dishFormSchema.safeParse({
      ...base,
      name: { en: '', ar: '' },
      price: -3,
      category_id: 3,
    })

    expect(result.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'A price cannot be negative.',
        'A dish name is required in English.',
      ]),
    )
  })

  it('takes whatever languages the menu is written in', () => {
    const result = dishFormSchema.safeParse({
      ...base,
      name: { en: 'Bread', tr: 'Ekmek' },
      ingredients: { en: '', tr: '' },
      category_id: 3,
    })

    expect(result.success).toBe(true)
  })
  it('explains a price that is not a number', () => {
    const result = dishFormSchema.safeParse({ ...base, price: Number.NaN, category_id: 3 })

    expect(result.error?.issues.map((i) => i.message)).toContain(
      'Enter a price, or leave it empty.',
    )
  })

  it('refuses a negative price and one past the column limit', () => {
    const negative = dishFormSchema.safeParse({ ...base, price: -1, category_id: 3 })
    const huge = dishFormSchema.safeParse({ ...base, price: 100_000_000, category_id: 3 })

    expect(negative.error?.issues[0]?.message).toBe('A price cannot be negative.')
    expect(huge.error?.issues[0]?.message).toBe('That price is too high.')
    expect(
      dishFormSchema.safeParse({ ...base, price: 99_999_999.99, category_id: 3 }).success,
    ).toBe(true)
  })

  it('keeps an empty price empty rather than zero', () => {
    const result = dishFormSchema.safeParse({ ...base, price: null, category_id: 3 })

    expect(result.data?.price).toBeNull()
  })

  it('names the field and its limit when a name or the ingredients run long', () => {
    const result = dishFormSchema.safeParse({
      ...base,
      name: { en: 'x'.repeat(256) },
      ingredients: { en: 'y'.repeat(2001) },
      category_id: 3,
    })

    const messages = result.error?.issues.map((i) => i.message) ?? []
    expect(messages.some((m) => m.includes('name') && m.includes('255'))).toBe(true)
    expect(messages.some((m) => m.includes('ingredients') && m.includes('2000'))).toBe(true)
  })
})

describe('dish response schemas', () => {
  it('reads the price as the decimal string the resource sends', () => {
    resetFactories()
    const dish = makeDish({ price: '24.50' })

    expect(dishResponseSchema.parse({ data: dish }).data.price).toBe('24.50')
    expect(dishResponseSchema.safeParse({ data: { ...dish, price: 24.5 } }).success).toBe(false)
  })

  it('keeps an orphaned dish whose category was deleted', () => {
    const dish = makeDish({ category_id: null, category: null })

    expect(dishResponseSchema.parse({ data: dish }).data.category_id).toBeNull()
  })

  it('reads the index with its usage block and currency', () => {
    const list = { data: [makeDish()], meta: { used: 1, limit: null, currency: 'LBP' } }

    expect(dishListSchema.parse(list)).toEqual(list)
    expect(dishListSchema.safeParse({ data: list.data }).success).toBe(false)
    expect(dishCollectionSchema.parse({ data: list.data })).toEqual({ data: list.data })
  })

  it('refuses an image url that is not a url', () => {
    const dish = makeDish({ image_url: 'not a url' })

    expect(dishResponseSchema.safeParse({ data: dish }).success).toBe(false)
  })
})
