import type { Category } from '@/features/menu/categories/schemas/category.schema'
import type { Dish } from '@/features/menu'
let nextId = 1

export function makeCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: { en: `Category ${id}`, ar: null },
    description: { en: null, ar: null },
    icon: null,
    dishes_count: 0,
    ...overrides,
  }
}

export function makeDish(overrides: Partial<Dish> = {}): Dish {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: { en: `Dish ${id}`, ar: null },
    ingredients: { en: null, ar: null },
    price: '12.00',
    is_available: true,
    category_id: 1,
    image_url: null,
    variants: [],
    addons: [],
    builds: [],
    offer: null,
    icon: null,
    currency: 'USD',
    ...overrides,
  }
}

/** A dish's build: an own list of two scoops unless told otherwise. */
export function makeBuild(overrides: Partial<Dish['builds'][number]> = {}): Dish['builds'][number] {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: { en: `Build ${id}`, ar: null },
    shape: 'pieces',
    parts: [3],
    category_id: null,
    dish_ids: null,
    choices: [
      {
        id: id * 10,
        dish_id: null,
        name: { en: 'Vanilla', ar: null },
        price: '0.00',
        part_prices: {},
      },
      {
        id: id * 10 + 1,
        dish_id: null,
        name: { en: 'Pistachio', ar: null },
        price: '1.00',
        part_prices: {},
      },
    ],
    ...overrides,
  }
}

/** Resets the id counter so ids are predictable per test file. */
export function resetFactories(): void {
  nextId = 1
}
