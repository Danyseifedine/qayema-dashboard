import { z } from 'zod'
import { translatableTextSchema } from '../../menu/categories/schemas/category.schema'

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
export const templateSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  /** Price in coins. Zero is the free design. */
  price: z.number().int(),
  is_free: z.boolean(),
  /** True for a free design, or one already bought. Ownership is permanent. */
  owned: z.boolean(),
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
    balance: z.number().int(),
  }),
})

/** 402 body when coins fall short. */
export const insufficientCoinsSchema = z.object({
  message: z.string(),
  balance: z.number().int(),
  needed: z.number().int(),
  shortfall: z.number().int(),
})

export type Template = z.infer<typeof templateSchema>
export type TemplateList = z.infer<typeof templateListSchema>
