import { z } from 'zod'
import { t } from '@/lib/i18n'

const quantity = z.number().int().min(0).max(99)

/**
 * The order editor's values: every line already on the order with its new
 * quantity (0 takes it off), and the dishes added, each with the guest-style
 * choices picked for it. Something has to be left on the order.
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
      }),
    ),
  })
  .refine((values) => values.lines.some((line) => line.quantity > 0) || values.add.length > 0, {
    path: ['lines'],
    error: () => t('orders:edit.empty'),
  })

export type EditOrderFormValues = z.infer<typeof editOrderFormSchema>
