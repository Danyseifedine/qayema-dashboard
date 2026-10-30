import { describe, expect, it } from 'vitest'
import type { Dish } from '@/features/menu'
import { makeDish } from '@/test/factories/menu'
import {
  addonGroupsToPick,
  buildsCost,
  buildsToPick,
  builtParts,
  choicesAt,
  firstSize,
  groupsMet,
  isFilled,
  isSellable,
  orderTotal,
  pickedIn,
  unitPrice,
  variantsToPick,
} from '@/features/orders/utils/order-edit'

const ON = { variants: true, addons: true }
const OFF = { variants: false, addons: false }

function dish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 1,
    name: { en: 'Burger' },
    ingredients: { en: null },
    icon: null,
    price: '8.00',
    is_available: true,
    category_id: 1,
    image_url: null,
    variants: [
      {
        id: 10,
        name: { en: 'Size' },
        options: [
          { id: 11, name: { en: 'Small' }, price: '0.00' },
          { id: 12, name: { en: 'Large' }, price: '2.50' },
        ],
      },
      {
        id: 20,
        name: { en: 'Bun' },
        options: [{ id: 21, name: { en: 'Brioche' }, price: '1.00' }],
      },
    ],
    addons: [{ id: 30, name: { en: 'Cheese' }, price: '1.25' }],
    addon_groups: [],
    from_pos: false,
    pos_removed: false,
    builds: [],
    offer: null,
    currency: 'USD',
    ...overrides,
  }
}

describe('order edit pricing', () => {
  it('adds each picked option and add-on to the dish', () => {
    expect(unitPrice(dish(), [12], [30], ON)).toBe(11.75)
  })

  it('asks only for variants with a real choice, and none while they are off', () => {
    expect(variantsToPick(dish(), ON).map((variant) => variant.id)).toEqual([10])
    expect(variantsToPick(dish(), OFF)).toEqual([])
    expect(unitPrice(dish(), [12], [30], OFF)).toBe(8)
  })

  it('prices a dish without a price of its own by the options picked', () => {
    expect(unitPrice(dish({ price: null }), [12, 21], [], ON)).toBe(2.5)
  })

  it('sells a dish without a price only when its variants price it', () => {
    expect(isSellable(dish({ price: null }), ON)).toBe(true)
    expect(isSellable(dish({ price: null }), OFF)).toBe(false)
  })
})

describe('orderTotal', () => {
  it('adds lines in the main currency as they are', () => {
    expect(
      orderTotal(
        [
          { amount: 1.1 * 3, currency: 'USD' },
          { amount: 2.25, currency: 'USD' },
        ],
        'USD',
        null,
      ),
    ).toBe(5.55)
  })

  it('counts a line in the second currency at the rate, to the cent', () => {
    expect(
      orderTotal(
        [
          { amount: 20, currency: 'USD' },
          { amount: 450000, currency: 'LBP' },
        ],
        'LBP',
        '89000.0000000000',
      ),
    ).toBe(2230000)
    // Main USD: 100,000 LBP at 0.0000112360 is $1.12360, so $1.12.
    expect(
      orderTotal(
        [
          { amount: 100000, currency: 'LBP' },
          { amount: 5, currency: 'USD' },
        ],
        'USD',
        '0.0000112360',
      ),
    ).toBe(6.12)
  })
})

function built(overrides: Partial<Dish>, builds: Dish['builds']): Dish {
  return makeDish({ ...overrides, builds })
}

const PIZZA = built({ id: 100, name: { en: 'Pizza' }, price: '2.00', category_id: 2 }, [
  {
    id: 4,
    name: { en: 'Your pizza' },
    shape: 'split',
    parts: [1, 2],
    category_id: 2,
    dish_ids: null,
    // Only the dishes given part prices are listed.
    choices: [{ id: 1, dish_id: 12, name: null, price: null, part_prices: { '2': '7.00' } }],
  },
])

const SCOOPS = built({ id: 200, name: { en: 'Ice cream' }, price: null, category_id: 3 }, [
  {
    id: 5,
    name: { en: 'Your scoops' },
    shape: 'pieces',
    parts: [2, 3],
    category_id: null,
    dish_ids: null,
    choices: [
      { id: 50, dish_id: null, name: { en: 'Vanilla' }, price: '2.00', part_prices: {} },
      { id: 51, dish_id: null, name: { en: 'Chocolate' }, price: '2.50', part_prices: {} },
      { id: 52, dish_id: null, name: { en: 'Unpriced' }, price: null, part_prices: {} },
    ],
  },
])

// One choice leaves nothing to build: the server skips it.
const LONELY = built({ id: 300, price: null, category_id: 3 }, [
  {
    id: 6,
    name: { en: 'Your one' },
    shape: 'pieces',
    parts: [1],
    category_id: null,
    dish_ids: null,
    choices: [{ id: 60, dish_id: null, name: { en: 'Only' }, price: '1.00', part_prices: {} }],
  },
])

const MENU: Dish[] = [
  PIZZA,
  makeDish({ id: 12, name: { en: 'Margherita' }, price: '12.00', category_id: 2 }),
  makeDish({ id: 13, name: { en: 'Pepperoni' }, price: '16.00', category_id: 2 }),
  makeDish({ id: 14, name: { en: 'Hidden' }, price: '9.00', category_id: 2, is_available: false }),
  makeDish({ id: 15, name: { en: 'Unpriced' }, price: null, category_id: 2 }),
  makeDish({ id: 16, name: { en: 'In LBP' }, price: '900000', category_id: 2, currency: 'LBP' }),
  makeDish({ id: 17, name: { en: 'Elsewhere' }, price: '5.00', category_id: 9 }),
  SCOOPS,
  LONELY,
]

const BUILDS = { ...ON, builds: true }

describe('builds', () => {
  it("offers a category's dishes guests can buy, in its currency, never the dish itself", () => {
    const [build] = buildsToPick(PIZZA, BUILDS, MENU)

    expect(build!.choices.map((choice) => choice.key)).toEqual(['d12', 'd13'])
    expect(build!.choices[0]!.part_prices).toEqual({ '2': '7.00' })
    expect(build!.choices[1]!.part_prices).toBeNull()
  })

  it('offers only the dishes the owner ticked', () => {
    const ticked = built({ id: 101, price: '2.00', category_id: 2 }, [
      { ...PIZZA.builds[0]!, dish_ids: [13, 14, 16] },
    ])
    // Pepperoni alone can be bought: one choice is no build.
    expect(buildsToPick(ticked, BUILDS, MENU)).toEqual([])
    const two = built({ id: 102, price: '2.00', category_id: 2 }, [
      { ...PIZZA.builds[0]!, dish_ids: [13, 12] },
    ])
    expect(buildsToPick(two, BUILDS, MENU)[0]!.choices.map((choice) => choice.key)).toEqual([
      'd12',
      'd13',
    ])
  })

  it("never offers an offer's deal dish, which the server refuses", () => {
    const deal = makeDish({
      id: 18,
      name: { en: 'Family meal' },
      price: '25.00',
      category_id: 2,
      offer: { id: 1, title: { en: 'Family meal' }, status: 'live', next_start: null },
    })
    const [build] = buildsToPick(PIZZA, BUILDS, [...MENU, deal])

    expect(build!.choices.map((choice) => choice.key)).toEqual(['d12', 'd13'])
  })

  it('offers the priced choices of its own list', () => {
    const [build] = buildsToPick(SCOOPS, BUILDS, MENU)

    expect(build!.choices.map((choice) => choice.key)).toEqual(['c50', 'c51'])
    expect(build!.choices[0]!.name).toEqual({ en: 'Vanilla' })
  })

  it('asks none while the package has no builds, nor one with a single choice', () => {
    expect(buildsToPick(PIZZA, ON, MENU)).toEqual([])
    expect(buildsToPick(LONELY, BUILDS, MENU)).toEqual([])
    // An unnamed choice of its own list still reads as a choice.
    const nameless = built({ price: null }, [
      {
        id: 7,
        name: { en: 'Mix' },
        shape: 'pieces',
        parts: [2],
        category_id: null,
        dish_ids: null,
        choices: [
          { id: 70, dish_id: null, name: null, price: '1.00', part_prices: {} },
          { id: 71, dish_id: null, name: null, price: '1.00', part_prices: {} },
        ],
      },
    ])
    expect(buildsToPick(nameless, BUILDS, [])[0]!.choices[0]!.name).toEqual({})
  })

  it('sells a dish without a price when its builds price it', () => {
    expect(isSellable(SCOOPS, BUILDS, MENU)).toBe(true)
    expect(isSellable(SCOOPS, ON, MENU)).toBe(false)
    expect(isSellable(LONELY, BUILDS, MENU)).toBe(false)
  })

  it('takes a build as filled only with a count it allows and a choice it offers in each part', () => {
    const [pizza] = buildsToPick(PIZZA, BUILDS, MENU)

    expect(isFilled(pizza!, { build: 4, parts: ['d12', 'd13'] })).toBe(true)
    expect(isFilled(pizza!, { build: 4, parts: ['d13'] })).toBe(true)
    expect(isFilled(pizza!, { build: 4, parts: ['d12', 'd13', 'd12'] })).toBe(false)
    expect(isFilled(pizza!, { build: 4, parts: ['d12', 'd14'] })).toBe(false)
    expect(isFilled(pizza!, undefined)).toBe(false)
  })

  it('adds what each filled build costs to the dish, by the build price rule', () => {
    // $2 base, then a set half at $7 and half of $16.
    expect(unitPrice(PIZZA, [], [], BUILDS, [{ build: 4, parts: ['d12', 'd13'] }], MENU)).toBe(17)
    expect(unitPrice(PIZZA, [], [], BUILDS, [{ build: 4, parts: ['d13'] }], MENU)).toBe(18)
    // Not filled yet: the dish alone.
    expect(unitPrice(PIZZA, [], [], BUILDS, [], MENU)).toBe(2)
    expect(
      unitPrice(SCOOPS, [], [], BUILDS, [{ build: 5, parts: ['c50', 'c51', 'c50'] }], MENU),
    ).toBe(6.5)
    expect(buildsCost(buildsToPick(SCOOPS, BUILDS, MENU), [{ build: 5, parts: ['c50'] }])).toBe(0)
  })

  it('names the filled builds as the line will keep them', () => {
    const builds = buildsToPick(PIZZA, BUILDS, MENU)

    expect(builtParts(builds, [{ build: 4, parts: ['d12', 'd13'] }], 'en')).toEqual([
      {
        name: 'Your pizza',
        parts: [
          { choice: 'Margherita', share: 2 },
          { choice: 'Pepperoni', share: 2 },
        ],
      },
    ])
    expect(
      builtParts(buildsToPick(SCOOPS, BUILDS, MENU), [{ build: 5, parts: ['c51', 'c51'] }], 'en'),
    ).toEqual([
      {
        name: 'Your scoops',
        parts: [
          { choice: 'Chocolate', share: 1 },
          { choice: 'Chocolate', share: 1 },
        ],
      },
    ])
    expect(builtParts(builds, [], 'en')).toEqual([])
  })
})

/** A pizza priced by its sizes only: no price of its own, its first variant's options are full prices. */
function sized(id: number, name: string, sizes: Record<string, string>): Dish {
  return makeDish({
    id,
    name: { en: name },
    price: null,
    category_id: 7,
    variants: [
      {
        id: id * 10,
        name: { en: 'Size' },
        options: Object.entries(sizes).map(([size, price], index) => ({
          id: id * 10 + index + 1,
          name: { en: size, ar: size === 'Large' ? 'كبير' : null },
          price,
        })),
      },
    ],
  })
}

const HALVES = built({ id: 400, name: { en: 'Half and half' }, price: null, category_id: 8 }, [
  {
    id: 9,
    name: { en: 'Your pizza' },
    shape: 'split',
    parts: [2],
    category_id: 7,
    dish_ids: null,
    choices: [{ id: 90, dish_id: 404, name: null, price: null, part_prices: { '2': '3.00' } }],
  },
])

const BY_SIZE: Dish[] = [
  HALVES,
  sized(401, 'Margherita', { Small: '8.00', Large: '12.00' }),
  // Named with spaces and capitals: still the same size.
  sized(402, 'Pepperoni', { ' small ': '10.00', LARGE: '16.00' }),
  sized(403, 'Veggie', { Small: '9.00' }),
  makeDish({ id: 404, name: { en: 'Garlic' }, price: '5.50', category_id: 7 }),
]

describe('builds priced by size', () => {
  it('offers a pizza priced only by size, with the sizes its choices come in', () => {
    const [build] = buildsToPick(HALVES, BUILDS, BY_SIZE)

    expect(build!.sizes).toEqual([
      { key: 'small', name: { en: 'Small', ar: null } },
      { key: 'large', name: { en: 'Large', ar: 'كبير' } },
    ])
    expect(build!.choices.map((choice) => choice.key)).toEqual(['d401', 'd402', 'd403', 'd404'])
    expect(firstSize(build!)).toBe('small')
  })

  it('prices each choice at the size picked, and leaves out a pizza not made in it', () => {
    const [build] = buildsToPick(HALVES, BUILDS, BY_SIZE)
    const large = choicesAt(build!, 'large')

    expect(large.map((choice) => [choice.key, choice.price, choice.part_prices])).toEqual([
      ['d401', '12.00', null],
      ['d402', '16.00', null],
      // A dish with its own price is the same at every size, its part prices kept.
      ['d404', '5.50', { '2': '3.00' }],
    ])
    expect(choicesAt(build!, 'medium')).toEqual([])
    expect(choicesAt(build!, undefined)).toEqual([])
  })

  it('takes a build as filled only with a size it has and a choice made in it', () => {
    const [build] = buildsToPick(HALVES, BUILDS, BY_SIZE)

    expect(isFilled(build!, { build: 9, parts: ['d401', 'd402'], size: 'large' })).toBe(true)
    expect(isFilled(build!, { build: 9, parts: ['d401', 'd403'], size: 'large' })).toBe(false)
    expect(isFilled(build!, { build: 9, parts: ['d401', 'd402'] })).toBe(false)
  })

  it('prices the halves at the size, and names the size on the line', () => {
    const builds = buildsToPick(HALVES, BUILDS, BY_SIZE)
    const large = [{ build: 9, parts: ['d401', 'd402'], size: 'large' }]

    // Half of $12 and half of $16.
    expect(unitPrice(HALVES, [], [], BUILDS, large, BY_SIZE)).toBe(14)
    expect(builtParts(builds, large, 'en')).toEqual([
      {
        name: 'Your pizza',
        parts: [
          { choice: 'Margherita', share: 2 },
          { choice: 'Pepperoni', share: 2 },
        ],
        size: 'Large',
      },
    ])
  })

  it("keys the sizes by the menu's main language", () => {
    const [build] = buildsToPick(HALVES, { ...BUILDS, main: 'ar' }, BY_SIZE)

    expect(build!.sizes.map((size) => size.key)).toContain('كبير')
  })

  it('prices a choice without a price of its own at nothing', () => {
    const choice = { key: 'c1', name: { en: 'Plain' }, price: null, part_prices: null }
    const unsized = { id: 1, name: { en: 'Yours' }, shape: 'split' as const, parts: [2] }

    expect(choicesAt({ ...unsized, choices: [{ ...choice, sizes: {} }], sizes: [] }, null)).toEqual(
      [{ ...choice, sizes: {}, price: '0' }],
    )
    expect(
      choicesAt(
        {
          ...unsized,
          choices: [{ ...choice, sizes: {} }],
          sizes: [{ key: 'large', name: { en: 'Large' } }],
        },
        'large',
      ),
    ).toEqual([{ ...choice, sizes: {}, price: '0' }])
  })

  it('offers no pizza priced by size while variants are off', () => {
    // Garlic alone is left: one choice is no build.
    expect(buildsToPick(HALVES, { ...OFF, builds: true }, BY_SIZE)).toEqual([])
  })
})

describe('add-on groups in the order editor', () => {
  const SAUCES = {
    id: 60,
    name: { en: 'Sauces' },
    min_select: 1,
    max_select: 2,
    addons: [
      { id: 61, name: { en: 'Garlic' }, price: '0.50' },
      { id: 62, name: { en: 'Chili' }, price: '0.50' },
      { id: 63, name: { en: 'Tahini' }, price: '1.00' },
    ],
  }
  const EMPTY = { id: 70, name: { en: 'Nothing' }, min_select: 1, max_select: null, addons: [] }
  const grouped = dish({ addon_groups: [SAUCES, EMPTY] })

  it('asks for the groups that have add-ons, with their limits, and none while add-ons are off', () => {
    expect(addonGroupsToPick(grouped, ON)).toEqual([{ ...SAUCES, min: 1, max: 2 }])
    expect(addonGroupsToPick(grouped, OFF)).toEqual([])
  })

  it('checks each group gets its fewest and no more than its most', () => {
    const [sauces] = addonGroupsToPick(grouped, ON)
    expect(pickedIn(sauces!, [61, 30])).toBe(1)
    expect(groupsMet([sauces!], [])).toBe(false)
    expect(groupsMet([sauces!], [61, 63])).toBe(true)
    expect(groupsMet([sauces!], [61, 62, 63])).toBe(false)
    expect(groupsMet([{ ...sauces!, max: null }], [61, 62, 63])).toBe(true)
  })

  it('prices the grouped add-ons picked with the rest', () => {
    expect(unitPrice(grouped, [12], [30, 63], ON)).toBe(12.75)
    expect(unitPrice(grouped, [12], [63], OFF)).toBe(8)
  })
})
