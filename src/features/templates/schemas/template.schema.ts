import { z } from 'zod'
import { translatableTextSchema } from '../../menu/categories/schemas/category.schema'

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
export const templateSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  thumbnail_url: z.url().nullable(),
  settings_schema: z.unknown(),
})

export const templateListSchema = z.object({
  data: z.array(templateSchema),
  meta: z.object({
    /** The restaurant's active template, null until one is chosen. */
    current: z.number().int().nullable(),
    settings: z.unknown(),
  }),
})

export type Template = z.infer<typeof templateSchema>
export type TemplateList = z.infer<typeof templateListSchema>
