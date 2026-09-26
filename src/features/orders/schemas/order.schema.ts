import { z } from 'zod'

/** Mirrors ../qayema/app/Enums/OrderStatus.php. */
export const ORDER_STATUSES = ['placed', 'done', 'cancelled'] as const

export const orderStatusSchema = z.enum(ORDER_STATUSES)

/** What each status is called in the dashboard. */
export const ORDER_STATUS_LABELS: Record<(typeof ORDER_STATUSES)[number], string> = {
  placed: 'New',
  done: 'Done',
  cancelled: 'Cancelled',
}

/**
 * One line, as it was ordered. The name and price are copies taken when the
 * guest ordered, not a lookup against today's menu — a dish renamed or
 * repriced since must not rewrite what was asked for.
 */
export const orderItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  unit_price: z.string(),
  quantity: z.number().int(),
  line_total: z.string(),
})

/** Mirrors ../qayema/app/Http/Resources/OrderResource.php. */
export const orderSchema = z.object({
  id: z.number().int(),
  reference: z.string(),
  status: orderStatusSchema,
  currency: z.string(),
  total: z.string(),
  note: z.string().nullable(),
  placed_at: z.string().nullable(),
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

export type OrderStatus = z.infer<typeof orderStatusSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type Order = z.infer<typeof orderSchema>
export type OrderList = z.infer<typeof orderListSchema>
