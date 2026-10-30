import { z } from 'zod'
import { request } from '@/lib/api'

/**
 * Mirrors ../qayema/app/Http/Resources/PosConnectionResource.php: the
 * restaurant's link to its POS branch. The key and the signing secret never
 * come back.
 */
export const posConnectionSchema = z.object({
  address: z.string(),
  company: z.string().nullable(),
  branch: z.string().nullable(),
  currency: z.string().nullable(),
  locales: z.array(z.string()).default([]),
  linked_at: z.string().nullable(),
  last_synced_at: z.string().nullable(),
  last_attempt_at: z.string().nullable(),
  last_error: z.string().nullable(),
  /** Over an hour without an answer from the POS: since when; null while it answers. */
  unreachable_since: z.string().nullable().default(null),
  /** Orders placed in the menu go to the POS too. */
  sends_orders: z.boolean().default(false),
  /**
   * Guests place orders in the menu at all (delivery, pickup or at a table);
   * false while they send them on WhatsApp, which cannot reach the POS.
   */
  orders_in_menu: z.boolean().default(false),
  /** What the last pull could not apply, for the owner. */
  problems: z.array(z.object({ type: z.string(), message: z.string() })).default([]),
})

export type PosConnection = z.infer<typeof posConnectionSchema>

const showSchema = z.object({ data: posConnectionSchema.nullable() })
const linkedSchema = z.object({ data: posConnectionSchema })

/** GET /api/pos-connection: the link, or null while there is none. */
export async function fetchPosConnection(signal?: AbortSignal): Promise<PosConnection | null> {
  const { data } = await request(showSchema, { method: 'GET', url: '/api/pos-connection', signal })
  return data
}

/**
 * POST /api/pos-connection: links the menu to the POS branch the key
 * belongs to. The server checks both with the POS; a refusal is a 422 on
 * `address` or `key`. The first pull runs just after the answer.
 */
export async function linkPos(values: { address: string; key: string }): Promise<PosConnection> {
  const { data } = await request(linkedSchema, {
    method: 'POST',
    url: '/api/pos-connection',
    data: values,
  })
  return data
}

/** DELETE /api/pos-connection: the menu goes back to the owner. */
export async function unlinkPos(): Promise<void> {
  await request(z.unknown(), { method: 'DELETE', url: '/api/pos-connection' })
}

/** PATCH /api/pos-connection: whether orders placed in the menu go to the POS. */
export async function setPosSendsOrders(sendsOrders: boolean): Promise<PosConnection> {
  const { data } = await request(linkedSchema, {
    method: 'PATCH',
    url: '/api/pos-connection',
    data: { sends_orders: sendsOrders },
  })
  return data
}

/** POST /api/pos-connection/sync: a pull from the POS, queued. */
export async function syncPos(): Promise<void> {
  await request(z.unknown(), { method: 'POST', url: '/api/pos-connection/sync' })
}
