import { z } from 'zod'
import { translatableTextSchema } from '../../categories/schemas/category.schema'

/**
 * Mirrors ../qayema/app/Http/Resources/DishResource.php.
 *
 * `price` comes back as a decimal STRING ("24.50") or null, because the column
 * is decimal(10,2) and the resource casts it. Requests send a number.
 */
export const dishSchema = z.object({
  id: z.number().int(),
  name: translatableTextSchema,
  ingredients: translatableTextSchema,
  price: z.string().nullable(),
  is_available: z.boolean(),
  display_order: z.number().int(),
  // Null once its category has been deleted; the dish survives, orphaned.
  category_id: z.number().int().nullable(),
  category: z.object({ id: z.number().int(), name: translatableTextSchema }).nullable().optional(),
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
    name: z.object({
      en: z.string().trim().max(255, 'Keep the name under 255 characters.'),
      ar: z.string().trim().max(255, 'Keep the name under 255 characters.'),
    }),
    ingredients: z.object({
      en: z.string().trim().max(2000, 'Keep the ingredients under 2000 characters.'),
      ar: z.string().trim().max(2000, 'Keep the ingredients under 2000 characters.'),
    }),
    price: z
      .number('Enter a price, or leave it empty.')
      .min(0, 'A price cannot be negative.')
      .max(MAX_PRICE, 'That price is too high.')
      .nullable(),
    // Nullable on the way in so the form can start empty, but the parse
    // must yield a real id: a literal 0 used to slip through and be
    // sent as a foreign key.
    category_id: z
      .number()
      .int()
      .nullable()
      .pipe(z.number('Choose a category.').int().positive('Choose a category.')),
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
  .superRefine((values, ctx) => {
    if (values.name.en === '' && values.name.ar === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['name', 'en'],
        message: 'A dish name is required in at least one language.',
      })
    }
  })

export type DishFormInput = z.input<typeof dishFormSchema>
export type DishFormValues = z.output<typeof dishFormSchema>
