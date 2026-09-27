import { z } from 'zod'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
export const designSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  thumbnail_url: z.url().nullable(),
})

export const designListSchema = z.object({
  data: z.array(designSchema),
  meta: z.object({
    /** The restaurant's active template, null until one is chosen. */
    current: z.number().int().nullable(),
  }),
})

export type Design = z.infer<typeof designSchema>
export type DesignList = z.infer<typeof designListSchema>
