import { describe, expect, it } from 'vitest'
import { dishFormSchema } from './dish.schema'

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

  it('takes whatever languages the menu is written in', () => {
    const result = dishFormSchema.safeParse({
      ...base,
      name: { en: 'Bread', tr: 'Ekmek' },
      ingredients: { en: '', tr: '' },
      category_id: 3,
    })

    expect(result.success).toBe(true)
  })
})
