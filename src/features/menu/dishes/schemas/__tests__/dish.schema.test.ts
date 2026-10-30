import { describe, expect, it } from 'vitest'
import {
  dishCollectionSchema,
  dishFormSchema,
  dishListSchema,
  dishResponseSchema,
  makeDishFormSchema,
} from '@/features/menu/dishes/schemas/dish.schema'
import { makeDish, resetFactories } from '@/test/factories/menu'

const base = {
  name: { en: 'Hummus', ar: '' },
  ingredients: { en: '', ar: '' },
  price: 8.5,
  is_available: true,
  currency: 'USD',
  image: null,
  delete_image: false,
  variants: [],
  addons: [],
}

describe('a dish’s builds from the API', () => {
  it('reads them, part prices or none, and none from a server from before them', () => {
    const dish = makeDish({ id: 1 })
    const { builds: _gone, ...old } = dish
    expect(dishResponseSchema.parse({ data: old }).data.builds).toEqual([])

    const scoops = {
      id: 5,
      name: { en: 'Scoops' },
      shape: 'pieces',
      parts: [3],
      category_id: null,
      choices: [{ id: 9, dish_id: null, name: { en: 'Vanilla' }, price: '2.00' }],
    }
    const parsed = dishResponseSchema.parse({ data: { ...dish, builds: [scoops] } }).data
    expect(parsed.builds[0]!.choices[0]!.part_prices).toEqual({})
  })
})

describe('a POS dish from the API', () => {
  it('reads its add-on groups and where it came from, and none from a server from before them', () => {
    const dish = makeDish({ id: 1 })
    const { addon_groups: _groups, from_pos: _from, pos_removed: _removed, ...old } = dish
    const parsed = dishResponseSchema.parse({ data: old }).data
    expect([parsed.addon_groups, parsed.from_pos, parsed.pos_removed]).toEqual([[], false, false])

    const sauces = {
      id: 4,
      name: { en: 'Sauces' },
      min_select: 1,
      max_select: null,
      addons: [{ id: 41, name: { en: 'Garlic' }, price: '0.50' }],
    }
    const fromPos = dishResponseSchema.parse({
      data: { ...dish, addon_groups: [sauces], from_pos: true, pos_removed: true },
    }).data
    expect(fromPos.addon_groups).toEqual([sauces])
    expect([fromPos.from_pos, fromPos.pos_removed]).toEqual([true, true])
  })
})

describe('a deal dish from the API', () => {
  it('reads the offer that made it, and none from a server from before them', () => {
    const dish = makeDish({ id: 1 })
    const { offer: _gone, ...old } = dish
    expect(dishResponseSchema.parse({ data: old }).data.offer).toBeNull()

    const offer = {
      id: 3,
      title: { en: 'Pizza night' },
      status: 'scheduled',
      next_start: '2026-11-13T18:00',
    }
    expect(dishResponseSchema.parse({ data: { ...dish, offer } }).data.offer).toEqual(offer)
  })
})

describe('dishFormSchema', () => {
  it('lets saved builds price a dish with no price of its own, add-ons and all', () => {
    const addon = { savedId: null, name: { en: 'Olives' }, price: 1 }
    const size = {
      savedId: null,
      name: { en: 'Size' },
      options: [
        { savedId: null, name: { en: 'Small' }, price: null },
        { savedId: null, name: { en: 'Large' }, price: 3 },
      ],
    }
    const values = { ...base, price: null, category_id: 3, addons: [addon], variants: [size] }

    expect(dishFormSchema.safeParse(values).success).toBe(false)
    expect(makeDishFormSchema(false, true).safeParse(values).success).toBe(true)
  })

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
      name: { en: 'x'.repeat(61) },
      ingredients: { en: 'y'.repeat(301) },
      category_id: 3,
    })

    const messages = result.error?.issues.map((i) => i.message) ?? []
    expect(messages.some((m) => m.includes('name') && m.includes('60'))).toBe(true)
    expect(messages.some((m) => m.includes('ingredients') && m.includes('300'))).toBe(true)
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
    const dish = makeDish({ category_id: null })

    expect(dishResponseSchema.parse({ data: dish }).data.category_id).toBeNull()
  })

  it('reads the index with its usage block and currency', () => {
    const list = {
      data: [makeDish({ currency: 'USD' })],
      meta: {
        used: 1,
        limit: null,
        currency: 'LBP',
        second_currency: 'USD',
        exchange_rate: '89000',
      },
    }

    expect(dishListSchema.parse(list)).toEqual(list)
    expect(dishListSchema.safeParse({ data: list.data }).success).toBe(false)
    expect(dishCollectionSchema.parse({ data: list.data })).toEqual({ data: list.data })
  })

  it('reads an index from before a second currency: every dish in the main one', () => {
    const { currency: _left, ...dish } = makeDish()
    const list = dishListSchema.parse({
      data: [dish],
      meta: { used: 1, limit: null, currency: 'LBP' },
    })

    expect(list.data[0]!.currency).toBe('LBP')
    expect(list.meta.second_currency).toBeNull()
    expect(list.meta.exchange_rate).toBeNull()
  })

  it('refuses an image url that is not a url', () => {
    const dish = makeDish({ image_url: 'not a url' })

    expect(dishResponseSchema.safeParse({ data: dish }).success).toBe(false)
  })
})
