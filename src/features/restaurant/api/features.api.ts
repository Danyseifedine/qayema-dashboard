import { z } from 'zod'
import { request } from '@/lib/api'

const featuresResponseSchema = z.object({ data: z.object({ off: z.array(z.string()) }) })

/**
 * PUT /api/features: the full list of features the owner switched off. The
 * server keeps only the ones that can be, and answers with what it stored.
 */
export async function saveSwitchedOff(off: string[]): Promise<string[]> {
  const { data } = await request(featuresResponseSchema, {
    method: 'PUT',
    url: '/api/features',
    data: { off },
  })
  return data.off
}
