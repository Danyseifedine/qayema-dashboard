import type { Category } from '@/features/menu/categories/schemas/category.schema'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

let nextId = 1

export function makeCategory(overrides: Partial<Category> = {}): Category {
  const id = overrides.id ?? nextId++
  return {
    id,
    name: { en: `Category ${id}`, ar: null },
    display_order: id,
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
    display_order: id,
    category_id: 1,
    category: { id: 1, name: { en: 'Category 1', ar: null } },
    image_url: null,
    ...overrides,
  }
}

/** Resets the id counter so ids are predictable per test file. */
export function resetFactories(): void {
  nextId = 1
}
