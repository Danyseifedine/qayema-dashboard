import { z } from 'zod'

/**
 * Mirrors ../qayema/app/Http/Resources/CategoryResource.php and the
 * Store/Update request rules.
 *
 * Names are translatable maps, never plain strings: the API rejects a string
 * with a 422 and always answers with both locale keys present.
 */
export const translatableTextSchema = z.object({
  en: z.string().nullable(),
  ar: z.string().nullable(),
})

export const categorySchema = z.object({
  id: z.number().int(),
  name: translatableTextSchema,
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
 * Form input. The server requires a name in at least one language, so the
 * same rule is applied here rather than waiting for the 422.
 */
export const categoryFormSchema = z
  .object({
    name: z.object({
      en: z.string().trim().max(255, 'Keep the name under 255 characters.'),
      ar: z.string().trim().max(255, 'Keep the name under 255 characters.'),
    }),
  })
  .superRefine((values, ctx) => {
    if (values.name.en === '' && values.name.ar === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['name', 'en'],
        message: 'A category name is required in at least one language.',
      })
    }
  })

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
