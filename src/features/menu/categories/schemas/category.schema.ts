import { z } from 'zod'
import { t } from '@/lib/i18n'
import { menuTextField, menuTextSchema, requireEnglish } from '@/shared/utils/string/menu-text'

/**
 * Mirrors ../qayema/app/Http/Resources/CategoryResource.php and the
 * Store/Update request rules. Names are maps with one entry per menu
 * language, never plain strings.
 */
export const categorySchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  /** One optional line under the heading on the public menu. */
  description: menuTextSchema,
  display_order: z.number().int(),
  // Always sent in practice, but the resource marks it conditional.
  dishes_count: z.number().int().optional(),
})

/** The index adds a usage/limit block; reorder does not. */
export const categoryListSchema = z.object({
  data: z.array(categorySchema),
  meta: z.object({
    used: z.number().int(),
    /** Null means unlimited on this package. */
    limit: z.number().int().nullable(),
  }),
})

export const categoryCollectionSchema = z.object({ data: z.array(categorySchema) })

export const categoryResponseSchema = z.object({ data: categorySchema })

export type Category = z.infer<typeof categorySchema>
export type CategoryList = z.infer<typeof categoryListSchema>

/**
 * Form input, one entry per menu language. The server requires the name in
 * English, so the same rule is applied here rather than waiting for the 422.
 */
export const categoryFormSchema = z
  .object({
    name: menuTextField(255, () => t('menu:fields.name')),
    description: menuTextField(300, () => t('menu:fields.description')),
  })
  .superRefine((values, ctx) =>
    requireEnglish(values.name, 'name', t('menu:categorySchema.nameRequired'), ctx),
  )

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
