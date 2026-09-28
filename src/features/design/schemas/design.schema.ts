import { z } from 'zod'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
const designSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  thumbnail_url: z.url().nullable(),
  /** Needs a package with premium designs. */
  is_premium: z.boolean(),
  /** Premium, and this restaurant's package does not include it. */
  locked: z.boolean(),
})

export const designListSchema = z.object({
  data: z.array(designSchema),
  meta: z.object({
    /** The restaurant's chosen template, null until one is chosen. */
    current: z.number().int().nullable(),
    /**
     * What the menu is drawn in: the choice, or the first free design while
     * the package does not include a premium choice.
     */
    shown: z.number().int().nullable(),
  }),
})

export type Design = z.infer<typeof designSchema>
export type DesignList = z.infer<typeof designListSchema>
