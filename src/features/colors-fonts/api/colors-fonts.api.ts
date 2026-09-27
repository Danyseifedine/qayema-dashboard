import { request } from '@/lib/api'
import {
  colorsFontsResponseSchema,
  type ColorsFonts,
  type ColorsFontsChanges,
} from '@/features/colors-fonts/schemas/colors-fonts.schema'

/** GET /api/colors-fonts — the design's colours and the menu's fonts. */
export function fetchColorsFonts(signal?: AbortSignal): Promise<ColorsFonts> {
  return request(colorsFontsResponseSchema, {
    method: 'GET',
    url: '/api/colors-fonts',
    signal,
  }).then((response) => response.data)
}

/**
 * PUT /api/colors-fonts — only the keys sent change. Answers with the whole
 * page as it now stands.
 */
export function saveColorsFonts(changes: ColorsFontsChanges): Promise<ColorsFonts> {
  return request(colorsFontsResponseSchema, {
    method: 'PUT',
    url: '/api/colors-fonts',
    data: changes,
  }).then((response) => response.data)
}
