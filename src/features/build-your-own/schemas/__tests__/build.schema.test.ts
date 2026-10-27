import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/types/api'
import { makeDish } from '@/test/factories/menu'
import {
  buildExample,
  choicesOf,
  kindDefaults,
  kindOf,
  titleOf,
  makeBuildFormSchema,
  offeredDishes,
  placeBuildErrors,
  savedBuildsPayload,
  suggestedCategory,
  toBuildFields,
  toBuildForm,
  toBuildPayload,
  tickedDishes,
  type Build,
  type BuildFields,
  type BuildFormInput,
} from '@/features/build-your-own/schemas/build.schema'

const CATEGORY_BUILD: Build = {
  id: 3,
  name: { en: 'Half & half', ar: null },
  shape: 'split',
  parts: [2, 1],
  category_id: 4,
  dish_ids: null,
  choices: [{ id: 30, dish_id: 12, name: null, price: null, part_prices: { '2': '7.00' } }],
}

const OWN_BUILD: Build = {
  id: 5,
  name: { en: 'Scoops', ar: 'كرات' },
  shape: 'pieces',
  parts: [3],
  category_id: null,
  dish_ids: null,
  choices: [
    { id: 50, dish_id: null, name: { en: 'Vanilla', ar: null }, price: '2.00', part_prices: {} },
    { id: 51, dish_id: null, name: { en: 'Mango', ar: null }, price: null, part_prices: {} },
  ],
}

function own(overrides: Partial<BuildFields> = {}): BuildFields {
  return {
    savedId: null,
    name: { en: 'Scoops' },
    shape: 'split',
    parts: [1, 2],
    source: 'own',
    category_id: null,
    dish_ids: null,
    dish_prices: {},
    choices: [
      { savedId: 50, name: { en: 'Vanilla' }, price: 4, part_prices: [null, 9, 2.5, 1] },
      { savedId: null, name: { en: 'Mango' }, price: 5, part_prices: [] },
    ],
    ...overrides,
  }
}

const DISH: BuildFormInput['dish'] = { name: { en: 'Ice cream' }, icon: 'ice-cream' }

function form(overrides: Partial<BuildFormInput> = {}): BuildFormInput {
  return {
    ...own(),
    kind: 'pieces',
    dish: DISH,
    ...overrides,
  }
}

function messages(values: unknown, anyLanguage = false) {
  const result = makeBuildFormSchema(anyLanguage).safeParse(values)
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  )
}

describe('a saved build in the editor', () => {
  it('reads a category’s part prices by dish, an own list by row', () => {
    expect(toBuildFields(CATEGORY_BUILD, ['en', 'ar'])).toEqual({
      savedId: 3,
      name: { en: 'Half & half', ar: '' },
      shape: 'split',
      parts: [1, 2],
      source: 'category',
      category_id: 4,
      dish_ids: null,
      dish_prices: { d12: [null, null, 7, null, null, null, null, null, null] },
      choices: [],
    })
    expect(toBuildFields(OWN_BUILD, ['en'])).toMatchObject({
      source: 'own',
      choices: [
        { savedId: 50, name: { en: 'Vanilla' }, price: 2 },
        { savedId: 51, price: null },
      ],
    })
  })

  it('opens with its dish and the card it matches, and a new one on nothing', () => {
    const dish = makeDish({ name: { en: 'Three scoops' }, icon: 'ice-cream' })
    expect(toBuildForm(OWN_BUILD, dish, ['en'])).toMatchObject({
      kind: 'pieces',
      savedId: 5,
      dish: { name: { en: 'Three scoops' }, icon: 'ice-cream' },
    })
    expect(toBuildForm(null, null, ['en'])).toMatchObject({
      kind: null,
      savedId: null,
      parts: [],
      choices: [],
      dish: { name: { en: '' }, icon: null },
    })
  })

  it('matches a pizza, scoops or something else', () => {
    expect(kindOf(CATEGORY_BUILD)).toBe('pizza')
    expect(kindOf(OWN_BUILD)).toBe('pieces')
    expect(kindOf({ shape: 'split', category_id: null })).toBe('other')
  })
})

describe('picking a card', () => {
  it('sets a pizza up from the likely category, Whole and Half & half', () => {
    const blank = form({ dish: { name: { en: 'Ice cream', ar: 'بوظة' }, icon: 'ice-cream' } })
    expect(kindDefaults('pizza', blank, ['en', 'ar'], 4)).toEqual({
      'dish.icon': 'pizza',
      'dish.name': { en: 'Build your pizza', ar: 'اصنع بيتزاك' },
      shape: 'split',
      parts: [1, 2],
      source: 'category',
      category_id: 4,
    })
    // A category already picked stays.
    expect(kindDefaults('pizza', form({ category_id: 9 }), ['en'], 4).category_id).toBe(9)
  })

  it('starts scoops with three blank rows, something else with two and no size', () => {
    const blank = form({ choices: [], dish: { name: { en: 'Build your pizza' }, icon: null } })
    expect(kindDefaults('pieces', blank, ['en'], null)).toMatchObject({
      'dish.icon': 'ice-cream',
      'dish.name': { en: 'Ice cream' },
      shape: 'pieces',
      parts: [3],
      source: 'own',
      choices: [{ price: null }, { price: null }, { price: null }],
    })
    expect(kindDefaults('other', blank, ['en'], null)).toMatchObject({
      'dish.icon': null,
      'dish.name': { en: '' },
      shape: 'split',
      parts: [],
      choices: [{ price: null }, { price: null }],
    })
  })

  it('keeps a name, an icon and rows the owner chose', () => {
    const written = kindDefaults(
      'pieces',
      form({ dish: { name: { en: 'Gelato cup' }, icon: 'coffee' } }),
      ['en'],
      null,
    )
    expect(written).not.toHaveProperty(['dish.icon'])
    expect(written).not.toHaveProperty(['dish.name'])
    expect(written).not.toHaveProperty('choices')
    const named = form({
      choices: [{ savedId: null, name: { en: 'Mint' }, price: null, part_prices: [] }],
    })
    expect(kindDefaults('other', named, ['en'], null)).not.toHaveProperty('choices')
  })
})

describe('the editor’s rules', () => {
  it('takes a well made build on a dish', () => {
    expect(messages(form())).toEqual({})
  })

  it('says what is missing, step by step, as the server would', () => {
    expect(
      messages(
        form({
          kind: null,
          name: { en: ' ' },
          parts: [],
          dish: { ...DISH, name: { en: '' } },
          choices: [{ savedId: null, name: { en: '' }, price: null, part_prices: [] }],
        }),
      ),
    ).toEqual({
      kind: 'Pick what guests build.',
      choices: 'A list needs 2 to 30 choices.',
      'choices.0.name.en': 'Give every choice a name in English.',
      'choices.0.price': 'Give every choice a price.',
      parts: 'Pick at least one size.',
      'dish.name.en': 'Give the dish a name in English.',
    })
  })

  it('asks a category build for its category', () => {
    expect(messages(form({ source: 'category', category_id: null, name: { en: '' } }))).toEqual({
      category_id: 'Choose a category.',
    })
  })

  it('takes a name in either language while saving translates', () => {
    const values = form({ dish: { ...DISH, name: { en: '', ar: 'بوظة' } } })
    expect(messages(values)).toHaveProperty(['dish.name.en'])
    expect(messages(values, true)).toEqual({})
  })

  it('says plainly when a name runs long or a price is not one', () => {
    const long = 'x'.repeat(41)
    expect(
      messages(
        form({
          name: { en: long },
          choices: [
            { savedId: null, name: { en: 'A' }, price: Number.NaN, part_prices: [null, null, -1] },
            { savedId: null, name: { en: 'B' }, price: 100_000_000, part_prices: [] },
          ],
        }),
      ),
    ).toMatchObject({
      'name.en': 'Keep the name under 40 characters.',
      'choices.0.price': 'Enter a price, or leave it empty.',
      'choices.0.part_prices.2': 'A price cannot be negative.',
      'choices.1.price': 'That price is too high.',
    })
  })
})

describe('the editor’s limits', () => {
  it('says plainly when a new dish’s name runs long, or a list runs past 30', () => {
    const row = { savedId: null, name: { en: 'x'.repeat(41) }, price: 1, part_prices: [] }
    expect(
      messages(
        form({
          dish: { ...DISH, name: { en: 'x'.repeat(61) } },
          choices: Array.from({ length: 31 }, () => row),
        }),
      ),
    ).toMatchObject({
      'dish.name.en': 'Keep the dish name under 60 characters.',
      'choices.0.name.en': "Keep the choice's name under 40 characters.",
      choices: 'A list needs 2 to 30 choices.',
    })
  })
})

describe('what the save sends', () => {
  const dishes = [
    { id: 12, category_id: 4 },
    { id: 13, category_id: 4 },
    { id: 14, category_id: 9 },
    { id: 20, category_id: 4 },
  ]

  it('sends a category’s dishes with a typed part price, for allowed sizes over 1', () => {
    const build = own({
      savedId: 3,
      parts: [2, 1, 3],
      source: 'category',
      category_id: 4,
      dish_prices: {
        // A whole and a size not allowed are never sent.
        d12: [null, 9, 7, null, 4],
        // Nothing typed: no row.
        d13: [null, null, null, null],
        // Moved to another category since.
        d14: [null, null, 6],
        // The dish being edited.
        d20: [null, null, 6],
      },
    })

    expect(toBuildPayload(build, dishes, 20)).toEqual({
      id: 3,
      name: { en: 'Scoops' },
      shape: 'split',
      parts: [1, 2, 3],
      category_id: 4,
      dish_ids: null,
      choices: [{ dish_id: 12, part_prices: { '2': 7 } }],
    })
  })

  it('sends the dishes ticked, and part prices only for them', () => {
    const build = own({
      source: 'category',
      category_id: 4,
      dish_ids: [12, 20],
      dish_prices: { d12: [null, null, 7], d13: [null, null, 5] },
    })

    expect(toBuildPayload(build, dishes, null)).toMatchObject({
      dish_ids: [12, 20],
      choices: [{ dish_id: 12, part_prices: { '2': 7 } }],
    })
    // An own list ticks none.
    expect(toBuildPayload({ ...build, source: 'own' }, dishes, null).dish_ids).toBeNull()
    // Read back from a saved build.
    expect(toBuildFields({ ...CATEGORY_BUILD, dish_ids: [12, 20] }, ['en']).dish_ids).toEqual([
      12, 20,
    ])
    expect(toBuildFields({ ...OWN_BUILD, dish_ids: [12] }, ['en']).dish_ids).toBeNull()
  })

  it('keeps the dishes guests choose from to those ticked', () => {
    const offered = [{ id: 12 }, { id: 13 }, { id: 20 }]
    expect(tickedDishes(offered, null)).toEqual(offered)
    expect(tickedDishes(offered, [20, 12])).toEqual([{ id: 12 }, { id: 20 }])
  })

  it('sends an own list whole, its part prices only as a split build allows them', () => {
    expect(toBuildPayload(own({ category_id: 4 }), dishes, null)).toEqual({
      name: { en: 'Scoops' },
      shape: 'split',
      parts: [1, 2],
      category_id: null,
      dish_ids: null,
      choices: [
        { id: 50, name: { en: 'Vanilla' }, price: 4, part_prices: { '2': 2.5 } },
        { name: { en: 'Mango' }, price: 5 },
      ],
    })

    const pieces = toBuildPayload(own({ shape: 'pieces', parts: [2, 3, 3] }), dishes, null)
    expect(pieces.parts).toEqual([2, 3])
    expect(JSON.stringify(pieces)).not.toContain('part_prices')
  })

  it('sends a dish’s saved builds back as they are, a sold-out dish’s prices kept', () => {
    const dish = { id: 20, builds: [CATEGORY_BUILD, OWN_BUILD] }
    expect(savedBuildsPayload(dish, dishes, ['en'])).toEqual([
      {
        id: 3,
        name: { en: 'Half & half' },
        shape: 'split',
        parts: [1, 2],
        category_id: 4,
        dish_ids: null,
        choices: [{ dish_id: 12, part_prices: { '2': 7 } }],
      },
      {
        id: 5,
        name: { en: 'Scoops' },
        shape: 'pieces',
        parts: [3],
        category_id: null,
        dish_ids: null,
        choices: [
          { id: 50, name: { en: 'Vanilla' }, price: 2 },
          { id: 51, name: { en: 'Mango' }, price: null },
        ],
      },
    ])
  })
})

describe('placing the server’s errors', () => {
  const sent = [
    toBuildPayload(own({ savedId: 1 }), [], 20),
    toBuildPayload(
      own({ source: 'category', category_id: 4, dish_prices: { d13: [null, null, 5] } }),
      [
        { id: 12, category_id: 4 },
        { id: 13, category_id: 4 },
      ],
      20,
    ),
  ]
  const refused = (errors: Record<string, string[]>) =>
    new ApiError({ message: 'Invalid', status: 422, code: 'validation', errors })

  it('moves this build’s errors to its fields, a category row’s to its dish', () => {
    const placed = placeBuildErrors(
      refused({
        'builds.1.choices.0.part_prices.2': ['Too high.'],
        'builds.1.choices.0.dish_id': ['Pick a dish of the build’s category.'],
        'builds.1.choices.5.dish_id': ['Unknown row.'],
        'builds.1.choices': ['Too few.'],
        'builds.1.parts.1': ['Too many parts.'],
        'builds.1.dish_ids.0': ['Not of this category.'],
        'builds.1.name.en': ['Required.'],
        'builds.0.name.en': ['Another build’s.'],
      }),
      sent,
      1,
    )

    expect(placed.unplaced).toBe('Another build’s.')
    expect((placed.error as ApiError).status).toBe(422)
    expect((placed.error as ApiError).errors).toEqual({
      'dish_prices.d13.2': ['Too high.'],
      category_id: ['Pick a dish of the build’s category.'],
      parts: ['Too many parts.'],
      dish_ids: ['Not of this category.'],
      'name.en': ['Required.'],
    })
  })

  it('says an own list’s errors on its rows, and the dish’s on the dish', () => {
    const placed = placeBuildErrors(
      refused({
        'builds.0.choices.1.price': ['Give every choice a price.'],
        'builds.0.choices': ['A list needs 2.'],
        'name.en': ['Required.'],
        image_key: ['Too big.'],
        ingredients: ['Too long.'],
        currency: ['Not this one.'],
      }),
      sent,
      0,
    )

    expect(placed.unplaced).toBe('Not this one.')
    expect((placed.error as ApiError).errors).toEqual({
      'choices.1.price': ['Give every choice a price.'],
      choices: ['A list needs 2.'],
      'dish.name.en': ['Required.'],
      'dish.image': ['Too big.'],
      'dish.ingredients': ['Too long.'],
    })
  })

  it('leaves anything but a refused form as it came', () => {
    const offline = new Error('offline')
    const forbidden = new ApiError({ message: 'No', status: 403 })
    expect(placeBuildErrors(offline, sent, 0)).toEqual({ error: offline, unplaced: null })
    expect(placeBuildErrors(forbidden, sent, 0).error).toBe(forbidden)
  })
})

describe('what a category’s build offers', () => {
  it('is its available, priced dishes in the dish’s currency, never the dish itself', () => {
    const dishes = [
      makeDish({ id: 1, category_id: 4 }),
      makeDish({ id: 2, category_id: 4, is_available: false }),
      makeDish({ id: 3, category_id: 4, price: null }),
      makeDish({ id: 4, category_id: 4, currency: 'LBP' }),
      makeDish({ id: 5, category_id: 9 }),
      makeDish({ id: 6, category_id: 4 }),
    ]

    expect(offeredDishes(dishes, 4, 6, 'USD').map((dish) => dish.id)).toEqual([1])
    expect(offeredDishes(dishes, null, null, 'USD')).toEqual([])
  })

  it('names and prices the choices a guest meets', () => {
    const dish = makeDish({ id: 1, name: { en: 'Margherita' }, price: '12.00' })
    const name = (text: Record<string, string | null>) => text.en ?? ''
    const row = (_: unknown, index: number) => `Choice ${index + 1}`

    expect(
      choicesOf(
        { source: 'category', dish_prices: { d1: [null, null, 7] }, choices: [] },
        [dish],
        name,
        row,
      ),
    ).toEqual([{ name: 'Margherita', price: 12, part_prices: [null, null, 7] }])
    expect(
      choicesOf(
        {
          source: 'own',
          dish_prices: {},
          choices: [
            { savedId: null, name: { en: '' }, price: 3, part_prices: [] },
            { savedId: null, name: { en: 'Mango' }, price: null, part_prices: [] },
          ],
        },
        [],
        name,
        row,
      ),
    ).toEqual([{ name: 'Choice 1', price: 3, part_prices: [] }])
  })
})

describe('the price example', () => {
  const margherita = { name: 'Margherita', price: 12, part_prices: [null, null, 7] }
  const pepperoni = { name: 'Pepperoni', price: 16 }

  it('fills the smallest size over 1, or the one asked, with the first two choices in turn', () => {
    expect(buildExample({ shape: 'split', parts: [3, 1, 2] }, [margherita, pepperoni])).toEqual({
      count: 2,
      names: ['Margherita', 'Pepperoni'],
      cents: 1500,
    })
    expect(buildExample({ shape: 'split', parts: [1, 2] }, [pepperoni], 1)).toEqual({
      count: 1,
      names: ['Pepperoni'],
      cents: 1600,
    })
    expect(
      buildExample({ shape: 'pieces', parts: [3] }, [pepperoni, margherita, pepperoni]),
    ).toEqual({ count: 3, names: ['Pepperoni', 'Margherita', 'Pepperoni'], cents: 4400 })
  })

  it('has nothing to show without a size or a choice', () => {
    expect(buildExample({ shape: 'split', parts: [] }, [pepperoni])).toBeNull()
    expect(buildExample({ shape: 'split', parts: [2] }, [])).toBeNull()
  })
})

describe('the likely category', () => {
  it('is one named like pizza in any language, else the first', () => {
    const categories = [
      { id: 1, name: { en: 'Salads', ar: null } },
      { id: 2, name: { en: null, ar: 'بيتزا' } },
    ]
    expect(suggestedCategory(categories)).toBe(2)
    expect(suggestedCategory([categories[0]!, { id: 5, name: { en: 'Grill', ar: null } }])).toBe(1)
    expect(suggestedCategory([])).toBeNull()
  })
})

describe('the title above the choices', () => {
  it('is the dish’s name cut to a title’s length', () => {
    expect(titleOf({ dish: { ...DISH, name: { en: 'x'.repeat(50), ar: 'بوظة' } } })).toEqual({
      en: 'x'.repeat(40),
      ar: 'بوظة',
    })
  })
})
