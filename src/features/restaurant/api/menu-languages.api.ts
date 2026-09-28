import { z } from 'zod'
import { request } from '@/lib/api'

const menuLanguagesResponseSchema = z.object({
  data: z.object({
    languages: z.array(z.string()).min(1),
    second_locale: z.string().nullable(),
    default_locale: z.string(),
  }),
})

export type MenuLanguages = z.infer<typeof menuLanguagesResponseSchema>['data']

/**
 * PUT /api/menu-languages: the second language (null for none) and the one
 * the menu opens in. Text in a language dropped here stays saved, hidden.
 */
export async function saveMenuLanguages(payload: {
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
