import { describe, expect, it } from 'vitest'
import type { Dish } from '@/features/menu'
import { makeDish } from '@/test/factories/menu'
import {
  buildsCost,
  buildsToPick,
  builtParts,
  isFilled,
  isSellable,
  orderTotal,
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
