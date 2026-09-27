import { z } from 'zod'
import { t } from '@/lib/i18n'
import { menuTextField, menuTextSchema, requireEnglish } from '@/shared/utils/string/menu-text'

/**
 * Mirrors ../qayema/app/Http/Resources/DishResource.php.
 *
 * `price` comes back as a decimal STRING ("24.50") or null, because the column
 * is decimal(10,2) and the resource casts it. Requests send a number.
 */
export const dishSchema = z.object({
  id: z.number().int(),
  /** One entry per menu language. */
  name: menuTextSchema,
  ingredients: menuTextSchema,
  price: z.string().nullable(),
  is_available: z.boolean(),
  display_order: z.number().int(),
  // Null once its category has been deleted; the dish survives, orphaned.
  category_id: z.number().int().nullable(),
  category: z.object({ id: z.number().int(), name: menuTextSchema }).nullable().optional(),
  image_url: z.url().nullable(),
})

export const dishListSchema = z.object({
  data: z.array(dishSchema),
  meta: z.object({
    used: z.number().int(),
    /** Null means unlimited on this package. */
    limit: z.number().int().nullable(),
    currency: z.string(),
  }),
})

export const dishCollectionSchema = z.object({ data: z.array(dishSchema) })

export const dishResponseSchema = z.object({ data: dishSchema })

export type Dish = z.infer<typeof dishSchema>
export type DishList = z.infer<typeof dishListSchema>

const MAX_PRICE = 99_999_999.99

export const dishFormSchema = z
  .object({
    name: menuTextField(255, () => t('menu:fields.name')),
    ingredients: menuTextField(2000, () => t('menu:fields.ingredients')),
    price: z
      .number({ error: () => t('menu:dishSchema.priceInvalid') })
      .min(0, { error: () => t('menu:dishSchema.priceNegative') })
      .max(MAX_PRICE, { error: () => t('menu:dishSchema.priceTooHigh') })
      .nullable(),
    // Nullable on the way in so the form can start empty, but the parse
    // must yield a real id: a literal 0 used to slip through and be
    // sent as a foreign key.
    category_id: z
      .number()
      .int()
      .nullable()
      .pipe(
        z
          .number({ error: () => t('menu:dishSchema.categoryRequired') })
          .int()
          .positive({ error: () => t('menu:dishSchema.categoryRequired') }),
      ),
    is_available: z.boolean(),
    image: z
      .object({
        key: z.string(),
        previewUrl: z.string(),
        name: z.string(),
        optimizedSize: z.string(),
        savedPercent: z.number(),
      })
      .nullable(),
    /** Set when the owner removes an existing image without picking a new one. */
    delete_image: z.boolean(),
  })
  .superRefine((values, ctx) =>
    requireEnglish(values.name, 'name', t('menu:dishSchema.nameRequired'), ctx),
  )

export type DishFormInput = z.input<typeof dishFormSchema>
export type DishFormValues = z.output<typeof dishFormSchema>
