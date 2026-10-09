import { z } from 'zod'
import { request } from '@/lib/api'

const menuLanguagesSchema = z.object({
  languages: z.array(z.string()).min(1),
  main_locale: z.string(),
  second_locale: z.string().nullable(),
  default_locale: z.string(),
  /** What has no name in the main language yet: guests see an old one meanwhile. */
  missing: z.object({ categories: z.number().int(), dishes: z.number().int() }),
})

const menuLanguagesResponseSchema = z.object({ data: menuLanguagesSchema })

export type MenuLanguages = z.infer<typeof menuLanguagesSchema>

/** GET /api/menu-languages: the languages, and what still needs writing in the main one. */
export async function fetchMenuLanguages(): Promise<MenuLanguages> {
  const { data } = await request(menuLanguagesResponseSchema, {
    method: 'GET',
    url: '/api/menu-languages',
  })
  return data
}

/**
 * PUT /api/menu-languages: the main language, the second one (null for none)
 * and the one the menu opens in. Text in a language dropped here stays saved,
 * hidden; making the second language the main one swaps them.
 */
export async function saveMenuLanguages(payload: {
  main_locale: string
  second_locale: string | null
  default_locale: string
}): Promise<MenuLanguages> {
  const { data } = await request(menuLanguagesResponseSchema, {
    method: 'PUT',
    url: '/api/menu-languages',
    data: payload,
  })
  return data
}
