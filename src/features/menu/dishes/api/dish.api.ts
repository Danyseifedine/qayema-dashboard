import { z } from 'zod'
import { request } from '@/lib/api'
import {
  dishCollectionSchema,
  dishListSchema,
  dishResponseSchema,
  type Dish,
  type DishList,
} from '../schemas/dish.schema'

export type DishPayload = {
  name: { en: string; ar: string }
  ingredients: { en: string; ar: string }
  price: number | null
  category_id: number
  is_available: boolean
  /** Temp-upload key from POST /api/uploads/temp. */
  image_key?: string
  delete_image?: boolean
}

/**
 * The index returns every dish for the restaurant at once, ordered by
 * `display_order` then id. There is no category filter and no pagination, so
 * filtering by category happens in the client.
 */
export function fetchDishes(signal?: AbortSignal): Promise<DishList> {
  return request(dishListSchema, { method: 'GET', url: '/api/dishes', signal })
}

export async function createDish(payload: DishPayload): Promise<Dish> {
  const { data } = await request(dishResponseSchema, {
    method: 'POST',
    url: '/api/dishes',
    data: payload,
  })
  return data
}

/**
 * A partial update, except for the translatable maps: the server keeps only
 * the locales present in the payload, so both are always sent.
 */
export async function updateDish(id: number, payload: DishPayload): Promise<Dish> {
  const { data } = await request(dishResponseSchema, {
    method: 'PATCH',
    url: `/api/dishes/${id}`,
    data: payload,
  })
  return data
}

export async function deleteDish(id: number): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: `/api/dishes/${id}` })
}

/** PATCH only; a PUT here is a 405. Returns the full dish. */
export async function setDishAvailability(id: number, isAvailable: boolean): Promise<Dish> {
  const { data } = await request(dishResponseSchema, {
    method: 'PATCH',
    url: `/api/dishes/${id}/availability`,
    data: { is_available: isAvailable },
  })
  return data
}

/**
 * Renumbers `display_order` across the whole restaurant in the given order.
 * It does not scope to a category, so a cross-category change needs `move`.
 */
export async function reorderDishes(ids: number[]): Promise<Dish[]> {
  const { data } = await request(dishCollectionSchema, {
    method: 'POST',
    url: '/api/dishes/reorder',
    data: { ids },
  })
  return data
}

/**
 * Moves a dish to another category, and optionally to a position within it.
 * `position` is 1-based; omitted or past the end means last. Only the moved
 * dish comes back, so the list is refetched after.
 */
export async function moveDish(id: number, categoryId: number, position?: number): Promise<Dish> {
  const { data } = await request(dishResponseSchema, {
    method: 'POST',
    url: `/api/dishes/${id}/move`,
    data:
      position === undefined ? { category_id: categoryId } : { category_id: categoryId, position },
  })
  return data
}
