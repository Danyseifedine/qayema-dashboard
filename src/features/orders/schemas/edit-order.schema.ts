import { z } from 'zod'
import { t } from '@/lib/i18n'

/** The most of one line an order takes, as the server caps it. */
export const LINE_QUANTITY_MAX = 99

const quantity = z.number().int().min(0).max(LINE_QUANTITY_MAX)

/**
 * The order editor's values: every line already on the order with its new
 * quantity (0 takes it off), and the dishes added, each with the guest-style
 * choices picked for it: a dish built from parts carries `builds`, each
 * build's id and the key of the choice in each part ("d12" a dish, "c5" one
 * of its own list). Something has to be left on the order.
 */
export const editOrderFormSchema = z
  .object({
    lines: z.array(z.object({ id: z.number().int(), quantity })),
    add: z.array(
      z.object({
        dish_id: z.number().int(),
        quantity: quantity.min(1),
        options: z.array(z.number().int()),
        addons: z.array(z.number().int()),
        builds: z
          .array(
            z.object({
              build: z.number().int(),
              parts: z.array(z.string()).min(1),
              size: z.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
  })
  .refine((values) => values.lines.some((line) => line.quantity > 0) || values.add.length > 0, {
    path: ['lines'],
    error: () => t('orders:edit.empty'),
  })

export type EditOrderFormValues = z.infer<typeof editOrderFormSchema>
