import { z } from 'zod'
import { imageFieldSchema } from '@/features/uploads'
import { t } from '@/lib/i18n'
import { menuTextField, menuTextSchema, requireEnglish } from '@/shared/utils/string/menu-text'
import {
  addonsField,
  addonsSchema,
  requireChoiceNames,
  variantSchema,
  variantsField,
} from '@/features/menu/dishes/schemas/dish-choices.schema'

/**
 * Mirrors ../qayema/app/Http/Resources/DishResource.php.
 *
 * `price` comes back as a decimal STRING ("24.50") or null, because the column
 * is decimal(10,2) and the resource casts it. Requests send a number.
 */
const dishSchema = z.object({
  id: z.number().int(),
  /** One entry per menu language. */
  name: menuTextSchema,
  ingredients: menuTextSchema,
  price: z.string().nullable(),
  is_available: z.boolean(),
  // Null once its category has been deleted; the dish survives, orphaned.
  category_id: z.number().int().nullable(),
  image_url: z.url().nullable(),
  /** Sent whether or not the owner has them switched on. */
  variants: z.array(variantSchema),
  addons: addonsSchema,
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
    image: imageFieldSchema,
    /** Empty while the switch for them is off; they are not sent then. */
    variants: variantsField,
    addons: addonsField,
  })
  .superRefine(
    (values, ctx) => {
      requireEnglish(values.name, 'name', t('menu:dishSchema.nameRequired'), ctx)
      requireChoiceNames(values, ctx)
      // An add-on adds to the price, so the dish needs one, unless its
      // variants price it (a sandwich by size alone).
      if (values.price === null && values.addons.length > 0 && values.variants.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['price'],
          message: t('menu:dishSchema.priceForAddons'),
        })
      }
      // Priced by its first variant, each of its options needs a price: an
      // empty one would be a free sandwich, not a forgotten one.
      if (values.price === null) {
        values.variants[0]?.options.forEach((option, index) => {
          if (option.price === null) {
            ctx.addIssue({
              code: 'custom',
              path: ['variants', 0, 'options', index, 'price'],
              message: t('menu:dishSchema.optionPriceRequired'),
            })
          }
        })
      }
    },
    // Also when another field is wrong, so one submit shows every mistake
    // instead of revealing the missing name only after the rest is fixed.
    { when: () => true },
  )

export type DishFormInput = z.input<typeof dishFormSchema>
export type DishFormValues = z.output<typeof dishFormSchema>
