import type { Category } from '@/features/menu'
import type { Dish } from '@/features/menu'
let nextId = 1

export function makeCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: { en: `Category ${id}`, ar: null },
    description: { en: null, ar: null },
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
    ...overrides,
  }
}

/** Resets the id counter so ids are predictable per test file. */
export function resetFactories(): void {
  nextId = 1
}
