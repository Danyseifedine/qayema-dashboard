import { z } from 'zod'
import { request } from '@/lib/api'

const sectionsResponseSchema = z.object({ data: z.object({ hidden: z.array(z.string()) }) })

/**
 * PUT /api/sections — the full list of sections the owner switched off. The
 * server keeps only the ones that can be, and answers with what it stored.
 */
export async function saveHiddenSections(hidden: string[]): Promise<string[]> {
  const { data } = await request(sectionsResponseSchema, {
    method: 'PUT',
    url: '/api/sections',
    data: { hidden },
  })
  return data.hidden
}
