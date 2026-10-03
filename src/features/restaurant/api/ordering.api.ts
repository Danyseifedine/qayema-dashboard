import { z } from 'zod'
import { request } from '@/lib/api'

const orderingSchema = z.object({
  mode: z.enum(['whatsapp', 'menu']),
  types: z.array(z.enum(['delivery', 'pickup'])).min(1),
})

export type OrderingSettings = z.infer<typeof orderingSchema>

/**
 * PUT /api/features/ordering: how guests send their orders, and which kinds
 * of order the menu takes. Ordering in the menu needs the package (403).
 */
export async function saveOrdering(settings: OrderingSettings): Promise<OrderingSettings> {
  const { data } = await request(z.object({ data: orderingSchema }), {
    method: 'PUT',
    url: '/api/features/ordering',
    data: settings,
  })
  return data
}
