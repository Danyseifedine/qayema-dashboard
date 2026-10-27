import { z } from 'zod'
import { request } from '@/lib/api'
import type { MenuTextForm } from '@/shared/utils/string/menu-text'
import type { BuildPayload } from '@/features/build-your-own/schemas/build.schema'

/**
 * The saved dish, as far as this page reads it: the menu's dish list is
 * asked again after every save, so only its id is needed here.
 */
const savedDishSchema = z.object({ data: z.object({ id: z.number().int() }) })

/**
 * A build's dish with its whole list of builds: made with it, or changed
 * with it. A saved build or choice keeps its id; one left out is deleted.
 * It sits above the menu's search with its icon: no category, price,
 * description or photo, so an older dish sends those cleared.
 */
export type BuiltDishPayload = {
  /** One entry per menu language; a blank one clears it. */
  name: MenuTextForm
  /** One of the categories' icons; null for none. */
  icon: string | null
  category_id: null
  /** The build sets the price. */
  price: null
  /** Blank in every language. */
  ingredients: MenuTextForm
  /** The saved photo removed. */
  delete_image?: true
  builds: BuildPayload[]
}

/** A new dish with its build, in one go. */
export async function createBuiltDish(payload: BuiltDishPayload): Promise<number> {
  const { data } = await request(savedDishSchema, {
    method: 'POST',
    url: '/api/dishes',
    data: payload,
  })
  return data.id
}

/** A build's dish changed, its builds with it (`PATCH /api/dishes/{id}`). */
export async function updateBuiltDish(dishId: number, payload: BuiltDishPayload): Promise<number> {
  const { data } = await request(savedDishSchema, {
    method: 'PATCH',
    url: `/api/dishes/${dishId}`,
    data: payload,
  })
  return data.id
}

/**
 * A dish's builds alone: `PATCH /api/dishes/{id}` with only `builds`
 * changes nothing else on the dish (one of several builds deleted).
 */
export async function saveDishBuilds(dishId: number, builds: BuildPayload[]): Promise<number> {
  const { data } = await request(savedDishSchema, {
    method: 'PATCH',
    url: `/api/dishes/${dishId}`,
    data: { builds },
  })
  return data.id
}
