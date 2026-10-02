import { describe, expect, it } from 'vitest'
import {
  VARIANT_PRESETS,
  hasChoices,
  presetVariant,
  priceRange,
  toAddonsPayload,
  toChoicesForm,
  toVariantsPayload,
} from '@/features/menu/dishes/schemas/dish-choices.schema'
import { dishFormSchema } from '@/features/menu/dishes/schemas/dish.schema'

const SAVED = {
  variants: [
    {
      id: 7,
      name: { en: 'Size', ar: 'الحجم' },
      options: [
        { id: 70, name: { en: 'Small', ar: null }, price: '0.00' },
        { id: 71, name: { en: 'Large', ar: 'كبير' }, price: '2.50' },
      ],
    },
  ],
  addons: [{ id: 9, name: { en: 'Cheese', ar: null }, price: '1.00' }],
}

const valid = {
  name: { en: 'Burger' },
  ingredients: { en: '' },
  price: 8,
  category_id: 1,
  is_available: true,
  image: null,
  variants: [],
  addons: [],
}

describe('dish choices in the form', () => {
  it('fills the form from a saved dish in every menu language, a free choice as empty', () => {
    expect(toChoicesForm(SAVED, ['en', 'ar'])).toEqual({
      variants: [
        {
          savedId: 7,
          name: { en: 'Size', ar: 'الحجم' },
          options: [
            { savedId: 70, name: { en: 'Small', ar: '' }, price: null },
            { savedId: 71, name: { en: 'Large', ar: 'كبير' }, price: 2.5 },
          ],
        },
      ],
      addons: [{ savedId: 9, name: { en: 'Cheese', ar: '' }, price: 1 }],
    })
    expect(toChoicesForm(null, ['en'])).toEqual({ variants: [], addons: [] })
  })

  it('copies without ids, so the copy is its own', () => {
    const copy = toChoicesForm(SAVED, ['en'], false)

    expect(JSON.stringify(toVariantsPayload(copy.variants))).not.toContain('"id"')
    expect(toAddonsPayload(copy.addons)).toEqual([{ name: { en: 'Cheese' }, price: 1 }])
  })

  it('sends saved ids back, and an empty price as nothing more', () => {
    const form = toChoicesForm(SAVED, ['en'])

    expect(toVariantsPayload(form.variants)).toEqual([
      {
        id: 7,
        name: { en: 'Size' },
        options: [
          { id: 70, name: { en: 'Small' }, price: 0 },
          { id: 71, name: { en: 'Large' }, price: 2.5 },
        ],
      },
    ])
  })

  it('prices a dish from its cheapest choices to everything at its dearest', () => {
    const { variants, addons } = toChoicesForm(
      {
        variants: [
          ...SAVED.variants,
          {
            id: 8,
            name: { en: 'Bread' },
            options: [{ id: 80, name: { en: 'Saj' }, price: '0.50' }],
          },
        ],
        addons: SAVED.addons,
      },
      ['en'],
    )

    expect(priceRange(8, variants, addons)).toEqual({ min: 8.5, max: 12 })
    expect(priceRange(8, [], [])).toEqual({ min: 8, max: 8 })
    // A variant the owner emptied out adds nothing until it has options.
    expect(priceRange(8, [{ savedId: null, name: { en: 'Size' }, options: [] }], [])).toEqual({
      min: 8,
      max: 8,
    })
  })

  it('starts a preset in the menu languages it has words for', () => {
    const size = presetVariant(VARIANT_PRESETS[0]!, ['en', 'ar'])
    expect(size.name).toEqual({ en: 'Size', ar: 'الحجم' })
    expect(size.options.map((option) => option.name.en)).toEqual(['Small', 'Medium', 'Large'])

    // A language without its own words stays blank; the menu shows English.
    expect(presetVariant(VARIANT_PRESETS[1]!, ['en', 'fr']).name).toEqual({
      en: 'Spice level',
      fr: '',
    })
  })

  it('knows a dish with nothing to copy', () => {
    expect(hasChoices(SAVED)).toBe(true)
    expect(hasChoices({ variants: [], addons: [] })).toBe(false)
  })

  it('needs English names, two options, and a price for the dish', () => {
    const result = dishFormSchema.safeParse({
      ...valid,
      price: null,
      variants: [
        {
          savedId: null,
          name: { en: ' ' },
          options: [{ savedId: null, name: { en: 'Only' }, price: null }],
        },
      ],
      addons: [{ savedId: null, name: { en: '' }, price: -1 }],
    })

    const messages = Object.fromEntries(
      result.error!.issues.map((issue) => [issue.path.join('.'), issue.message]),
    )
    expect(messages).toMatchObject({
      price: 'Give the dish a price before adding variants or add-ons.',
      'variants.0.name.en': 'Give every variant a name in English.',
      'variants.0.options': 'A variant needs at least 2 options.',
      'addons.0.name.en': 'Give every add-on a name in English.',
      'addons.0.price': 'A price cannot be negative.',
    })
  })

  it('says plainly when a name runs long or a price is not one', () => {
    const long = 'x'.repeat(61)
    const option = (price: number) => ({ savedId: null, name: { en: 'Small' }, price })
    const result = dishFormSchema.safeParse({
      ...valid,
      variants: [
        { savedId: null, name: { en: long }, options: [option(Number.NaN), option(100_000)] },
      ],
      addons: [{ savedId: null, name: { en: long }, price: 1 }],
    })

    const messages = Object.fromEntries(
      result.error!.issues.map((issue) => [issue.path.join('.'), issue.message]),
    )
    expect(messages).toMatchObject({
      'variants.0.name.en': 'Keep the name under 60 characters.',
      'variants.0.options.0.price': 'Enter a price, or leave it empty.',
      'variants.0.options.1.price': 'That price is too high.',
      'addons.0.name.en': 'Keep the name under 60 characters.',
    })
  })

  it('needs no dish price without choices', () => {
    expect(dishFormSchema.safeParse({ ...valid, price: null }).success).toBe(true)
  })
})
