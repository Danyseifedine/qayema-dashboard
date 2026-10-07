import { request } from '@/lib/api'
import type { MenuTextForm } from '@/shared/utils/string/menu-text'
import {
  restaurantResponseSchema,
  type Restaurant,
} from '@/features/restaurant/schemas/restaurant.schema'

/**
 * What the owner may change about their restaurant. The slug has its own
 * call (`changeSlug`): a new link is a deliberate step, not part of a save.
 */
export type RestaurantPayload = {
  /** One entry per menu language; a blank one clears it. */
  name: MenuTextForm
  description: MenuTextForm
  google_maps_url: string | null
  country_code: string | null
  phone: string
  currency: string
  timezone: string
  /** One range per weekday, null for a day the restaurant does not open. */
  opening_hours: Record<string, { open: string; close: string } | null>
  /** A temp-upload key, sent only when a new file was picked this session. */
  logo_key?: string
  cover_image_key?: string
  delete_cover_image?: boolean
}

export async function fetchRestaurant(signal?: AbortSignal): Promise<Restaurant> {
  const { data } = await request(restaurantResponseSchema, {
    method: 'GET',
    url: '/api/restaurant',
    signal,
  })
  return data
}

export async function updateRestaurant(payload: RestaurantPayload): Promise<Restaurant> {
  const { data } = await request(restaurantResponseSchema, {
    method: 'PATCH',
    url: '/api/restaurant',
    data: payload,
  })
  return data
}

/**
 * Moves the menu to a new link. The server writes it cleanly (spaces and
 * capitals become dashes and lowercase) and keeps the old link forwarding,
 * so printed QR codes keep working.
 */
export async function changeSlug(slug: string): Promise<Restaurant> {
  const { data } = await request(restaurantResponseSchema, {
    method: 'PUT',
    url: '/api/restaurant/slug',
    data: { slug },
  })
  return data
}
