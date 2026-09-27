import { z } from 'zod'
import { menuTextSchema, translatableTextSchema } from '@/shared/utils/string/menu-text'

/**
 * Mirrors ../qayema/app/Http/Resources/UserResource.php.
 *
 * `restaurant` is only present once onboarding has created one, which is what
 * the dashboard branches on to decide between the wizard and the app.
 */
const planSchema = z.object({
  qr_studio: z.boolean(),
  ordering: z.boolean(),
  advanced_analytics: z.boolean(),
})

const limit = z.object({
  used: z.number(),
  /** Null means the feature is unlimited for this restaurant. */
  limit: z.number().nullable(),
})

export const restaurantSchema = z.object({
  id: z.number(),
  /** One entry per menu language. */
  name: menuTextSchema,
  slug: z.string(),
  /** What the menu is written in: English, then the second language if any. */
  languages: z.array(z.string()).min(1),
  /** The second language chosen, kept even while "Multiple languages" is off. */
  second_locale: z.string().nullable(),
  /** What the menu opens in: one of `languages`. */
  default_locale: z.string(),
  is_active: z.boolean(),
  template_id: z.number().nullable(),
  logo_url: z.string().nullable(),
  public_url: z.string(),
  qr_url: z.string(),
  /**
   * The package actually in force. An expired assignment reports as the
   * default one, because that is where the limits below came from.
   */
  package: z.object({
    slug: z.string().nullable(),
    name: translatableTextSchema,
    is_contact_only: z.boolean(),
    /** ISO-8601, or null when the package does not expire. */
    ends_at: z.string().nullable(),
  }),
  limits: z.object({
    dishes: limit,
    categories: limit,
    social_links: limit,
  }),
  /** Optional features the owner switched off on the Features page. */
  switched_off: z.array(z.string()),
  /** What this restaurant may use: its package plus any grants. */
  plan: planSchema,
})

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  has_completed_onboarding: z.boolean(),
  has_password: z.boolean(),
  restaurant: restaurantSchema.nullable(),
})

/** Laravel resources wrap the payload in `data`. */
export const userResponseSchema = z.object({ data: userSchema })

export type AuthUser = z.infer<typeof userSchema>
export type AuthRestaurant = z.infer<typeof restaurantSchema>
export type Plan = z.infer<typeof planSchema>
