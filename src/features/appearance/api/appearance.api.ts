import { request } from '@/lib/api'
import {
  appearanceResponseSchema,
  type Appearance,
  type AppearanceChanges,
} from '@/features/appearance/schemas/appearance.schema'

/** GET /api/appearance — the design's settings and the menu's fonts. */
export function fetchAppearance(signal?: AbortSignal): Promise<Appearance> {
  return request(appearanceResponseSchema, {
    method: 'GET',
    url: '/api/appearance',
    signal,
  }).then((response) => response.data)
}

/**
 * PUT /api/appearance — only the keys sent change. Answers with the whole
 * page as it now stands.
 */
export function saveAppearance(changes: AppearanceChanges): Promise<Appearance> {
  return request(appearanceResponseSchema, {
    method: 'PUT',
    url: '/api/appearance',
    data: changes,
  }).then((response) => response.data)
}
