import { z } from 'zod'
import { request } from '@/lib/api'

const channelSchema = z.enum(['whatsapp', 'menu'])

const orderingSchema = z.object({
  mode: channelSchema,
  types: z.array(z.enum(['delivery', 'pickup'])).min(1),
})

export type OrderingSettings = z.infer<typeof orderingSchema>
export type DineInMode = z.infer<typeof channelSchema>

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

/**
 * PUT /api/features/dine-in: how orders at the table come in, on the Table
 * orders page or on WhatsApp (422 without a number WhatsApp can reach).
 * Apart from the rest, so neither save can undo the other.
 */
export async function saveDineIn(mode: DineInMode): Promise<DineInMode> {
  const { data } = await request(z.object({ data: z.object({ dine_in: channelSchema }) }), {
    method: 'PUT',
    url: '/api/features/dine-in',
    data: { mode },
  })
  return data.dine_in
}
