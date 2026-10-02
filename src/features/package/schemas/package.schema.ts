import { z } from 'zod'
import { t } from '@/lib/i18n'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/** Mirrors ../qayema/app/Http/Resources/PackageResource.php. */
const packageSchema = z.object({
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
  /** Marked "Most popular". */
  is_featured: z.boolean(),
  features: z.object({
    /** Null is unlimited. */
    dish_limit: z.number().int().nullable(),
    category_limit: z.number().int().nullable(),
    social_link_limit: z.number().int().nullable(),
    multiple_languages: z.boolean(),
    variants: z.boolean(),
    addons: z.boolean(),
    appearance: z.boolean(),
    premium_designs: z.boolean(),
    qr_studio: z.boolean(),
    ordering: z.boolean(),
    analytics: z.boolean(),
    advanced_analytics: z.boolean(),
  }),
})

export const packageListSchema = z.object({
  data: z.array(packageSchema),
  meta: z.object({
    /** The slug in force, null for an owner with no restaurant yet. */
    current: z.string().nullable(),
  }),
})

/** The optional note an owner can add to a request. */
export const requestPackageFormSchema = z.object({
  message: z
    .string()
    .trim()
    .max(2000, { error: () => t('package:request.messageTooLong') }),
})

export type Package = z.infer<typeof packageSchema>
type PackageFeatures = Package['features']
/** The on/off features, the same keys as the session's `plan`. */
export type PackageFlag = {
  [K in keyof PackageFeatures]: PackageFeatures[K] extends boolean ? K : never
}[keyof PackageFeatures]
export type PackageLimit = Exclude<keyof PackageFeatures, PackageFlag>
export type PackageList = z.infer<typeof packageListSchema>
export type RequestPackageFormValues = z.infer<typeof requestPackageFormSchema>
