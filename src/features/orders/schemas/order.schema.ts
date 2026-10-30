import { z } from 'zod'

/** Mirrors ../qayema/app/Enums/OrderStatus.php. */
export const ORDER_STATUSES = ['placed', 'accepted', 'ready', 'done', 'cancelled'] as const

const orderStatusSchema = z.enum(ORDER_STATUSES)

/** Mirrors ../qayema/app/Enums/BuildShape.php. */
export const BUILD_SHAPES = ['split', 'pieces'] as const

/**
 * A dish the guest built from parts, as the line keeps it: a pizza cut in
 * halves (`split`, each part's `share` the N of one Nth) or three scoops
 * (`pieces`, each share 1). Named as they were then, like the variants.
 */
const builtSchema = z.object({
  name: z.string(),
  shape: z.enum(BUILD_SHAPES),
  parts: z.array(z.object({ choice: z.string(), share: z.number().int() })),
  /** What the build added to one, as it was sold. */
  price: z.string(),
  build_id: z.number().int(),
  /** The choices' keys ("d12", "c5"), so the guest's cart can be built again. */
  keys: z.array(z.string()),
  /** The size it was built in ("Large") and its key, for a build priced by size. */
  size: z.string().optional(),
  size_key: z.string().optional(),
})

/**
 * One line, as it was ordered. The name and total are copies taken when the
 * guest ordered, not a lookup against today's menu: a dish renamed or
 * repriced since must not rewrite what was asked for.
 */
const orderItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /**
   * The guest's variants, builds and add-ons, as they were named then; null
   * for none. `builds` only on a line with one.
   */
  options: z
    .object({
      variants: z.array(z.object({ name: z.string(), choice: z.string(), price: z.string() })),
      addons: z.array(z.object({ name: z.string(), price: z.string() })),
      builds: z.array(builtSchema).optional(),
    })
    .nullable()
    .default(null),
  /** What one cost, as it was sold: an edit keeps it. */
  unit_price: z.string().default('0.00'),
  quantity: z.number().int(),
  line_total: z.string(),
  /** Bought on an offer: its title then, and the unit price before the discount. */
  offer: z.object({ title: z.string(), full_price: z.string() }).nullish(),
  /**
   * What the line's prices are in: the order's currency, or the
   * restaurant's second one for a dish priced in it.
   */
  currency: z.string().optional(),
})

/**
 * Mirrors ../qayema/app/Http/Resources/OrderResource.php. Each line comes
 * with its currency; one from a server from before is in the order's.
 */
const orderSchema = z
  .object({
    id: z.number().int(),
    reference: z.string(),
    status: orderStatusSchema,
    /** The restaurant's main currency when it was placed: the total is in it. */
    currency: z.string(),
    total: z.string(),
    /**
     * Main per one second when it was placed ("89000" for main LBP, second
     * USD), what a line in the second currency counts for; null without one.
     */
    exchange_rate: z.string().nullable().default(null),
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
    /**
     * Sent to the restaurant's POS (Connect to POS): on its way, taken (the
     * POS handles it from here, with its own number), or not sent (why).
     * Null for an order that was never sent.
     */
    pos: z
      .object({
        status: z.enum(['sending', 'sent', 'failed']),
        number: z.string().nullable().default(null),
        error: z.string().nullable().default(null),
      })
      .nullable()
      .default(null),
    /** Why the POS called it off, when it said. */
    cancel_reason: z.string().nullable().default(null),
    items: z.array(orderItemSchema).default([]),
  })
  .transform((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item, currency: item.currency ?? order.currency })),
  }))

/**
 * One page of `GET /api/orders`: 30 orders, newest first. The owner asks for
 * the next one ("Show more"); an answer without the page numbers is the
 * only page.
 */
export const orderListSchema = z.object({
  data: z.array(orderSchema),
  meta: z.object({
    /** Still waiting, whatever filter is applied. */
    open: z.number().int(),
    current_page: z.number().int().default(1),
    last_page: z.number().int().default(1),
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
export type BuildShape = (typeof BUILD_SHAPES)[number]
export type Built = z.infer<typeof builtSchema>
export type Order = z.infer<typeof orderSchema>
export type OrderList = z.infer<typeof orderListSchema>
export type OrderPulse = z.infer<typeof orderPulseSchema>['data']

/**
 * Which orders a page lists: those to a table (Table orders), or the rest
 * (Orders), as `GET /api/orders?kind=` splits them.
 */
export type OrderKind = 'away' | 'table'
