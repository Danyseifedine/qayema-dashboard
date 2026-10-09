import { z } from 'zod'
import { request } from '@/lib/api'

const channelSchema = z.enum(['whatsapp', 'menu'])

const orderingSchema = z.object({
  mode: channelSchema,
  types: z.array(z.enum(['delivery', 'pickup'])).min(1),
})

const askLevelSchema = z.enum(['off', 'optional', 'required'])

const whatsAppFieldsSchema = z.object({
  away: z.object({ name: askLevelSchema, phone: askLevelSchema, address: askLevelSchema }),
  table: z.object({ name: askLevelSchema, phone: askLevelSchema }),
})

export type OrderingSettings = z.infer<typeof orderingSchema>
export type DineInMode = z.infer<typeof channelSchema>
export type WhatsAppFieldsSettings = z.infer<typeof whatsAppFieldsSchema>

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

/**
 * PUT /api/features/whatsapp-fields: what a WhatsApp order asks the guest
 * for, sent whole (`away` for delivery and pickup, `table` for orders at the
 * table; 422 on a value it does not know).
 */
export async function saveWhatsAppFields(
  fields: WhatsAppFieldsSettings,
): Promise<WhatsAppFieldsSettings> {
  const { data } = await request(z.object({ data: whatsAppFieldsSchema }), {
    method: 'PUT',
    url: '/api/features/whatsapp-fields',
    data: fields,
  })
  return data
}
