import { z } from 'zod'
import { translatableTextSchema } from '../../menu/categories/schemas/category.schema'

/** Mirrors ../qayema/app/Http/Resources/PackageResource.php. */
export const packageSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  /** Cents. Zero is free; null means the price is not published. */
  price_cents: z.number().int().nullable(),
  currency: z.string(),
  /** True when the owner has to ask rather than buy. */
  is_contact_only: z.boolean(),
  /** The package every restaurant starts on, and falls back to. */
  is_default: z.boolean(),
  sort_order: z.number().int(),
  features: z.object({
    /** Null is unlimited. */
    dish_limit: z.number().int().nullable(),
    category_limit: z.number().int().nullable(),
    social_link_limit: z.number().int().nullable(),
    qr_studio: z.boolean(),
  }),
})

export const packageListSchema = z.object({
  data: z.array(packageSchema),
  meta: z.object({
    /** The slug in force, null for an owner with no restaurant yet. */
    current: z.string().nullable(),
    ends_at: z.string().nullable(),
  }),
})

export const packageRequestResultSchema = z.object({
  data: z.object({
    id: z.number().int(),
    package: z.string(),
  }),
})

/** The optional note an owner can add to a request. */
export const requestPackageFormSchema = z.object({
  message: z.string().trim().max(2000, 'Keep this under 2000 characters.'),
})

export type Package = z.infer<typeof packageSchema>
export type PackageList = z.infer<typeof packageListSchema>
export type PackageRequestResult = z.infer<typeof packageRequestResultSchema>
export type RequestPackageFormValues = z.infer<typeof requestPackageFormSchema>
