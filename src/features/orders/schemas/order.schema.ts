import { z } from 'zod'

/** Mirrors ../qayema/app/Enums/OrderStatus.php. */
export const ORDER_STATUSES = ['placed', 'accepted', 'ready', 'done', 'cancelled'] as const

const orderStatusSchema = z.enum(ORDER_STATUSES)

/**
 * One line, as it was ordered. The name and total are copies taken when the
 * guest ordered, not a lookup against today's menu: a dish renamed or
 * repriced since must not rewrite what was asked for.
 */
const orderItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** The guest's variants and add-ons, as they were named then; null for none. */
  options: z
    .object({
      variants: z.array(z.object({ name: z.string(), choice: z.string(), price: z.string() })),
      addons: z.array(z.object({ name: z.string(), price: z.string() })),
    })
    .nullable()
    .default(null),
  /** What one cost, as it was sold: an edit keeps it. */
  unit_price: z.string().default('0.00'),
  quantity: z.number().int(),
  line_total: z.string(),
})

/** Mirrors ../qayema/app/Http/Resources/OrderResource.php. */
const orderSchema = z.object({
  id: z.number().int(),
  reference: z.string(),
  status: orderStatusSchema,
  currency: z.string(),
  total: z.string(),
  note: z.string().nullable(),
  /** How the guest gets it; null on an order sent to WhatsApp before. */
  fulfilment: z.enum(['delivery', 'pickup', 'dine_in']).nullable().default(null),
  /** The table it goes to, as it was named when ordered; null off a table. */
  table: z.string().nullable().default(null),
  /** Who to ask for. */
  name: z.string().nullable().default(null),
  /** The guest's number, international ("+96170123456"). */
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  /** Where the guest shared their location, on Google Maps. */
  map_url: z.string().nullable().default(null),
  placed_at: z.string().nullable(),
  /** When the owner accepted it; the guest following it sees that. */
  accepted_at: z.string().nullable().default(null),
  /** The guest changed it after placing it: when last, and how many times. */
  guest_updated_at: z.string().nullable().default(null),
  guest_updates: z.number().int().default(0),
  /** When the restaurant last changed what it holds. */
  owner_updated_at: z.string().nullable().default(null),
  items: z.array(orderItemSchema).default([]),
})

export const orderListSchema = z.object({
  data: z.array(orderSchema),
  meta: z.object({
    /** Still waiting, whatever filter is applied. */
    open: z.number().int(),
  }),
})

export const orderResponseSchema = z.object({ data: orderSchema })

/** GET /api/orders/pulse: what the dashboard polls for new orders. */
export const orderPulseSchema = z.object({
  data: z.object({
    /** Orders still waiting, orders to a table apart. */
    open: z.number().int(),
    /** Orders to a table still waiting (the Table orders page). */
    table_open: z.number().int().default(0),
    /** The newest order's id; null before the first one. */
    latest: z.number().int().nullable(),
    /** When a guest last changed an order (ISO); null when none has. */
    changed: z.string().nullable().default(null),
  }),
})

export type OrderStatus = z.infer<typeof orderStatusSchema>
export type Order = z.infer<typeof orderSchema>
export type OrderList = z.infer<typeof orderListSchema>
export type OrderPulse = z.infer<typeof orderPulseSchema>['data']

/**
 * Which orders a page lists: those to a table (Table orders), or the rest
 * (Orders), as `GET /api/orders?kind=` splits them.
 */
export type OrderKind = 'away' | 'table'
