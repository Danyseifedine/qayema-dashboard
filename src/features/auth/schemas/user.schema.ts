import { z } from 'zod'

/**
 * Mirrors ../qayema/app/Http/Resources/UserResource.php.
 *
 * `restaurant` is only present once onboarding has created one, which is what
 * the dashboard branches on to decide between the wizard and the app.
 */
const translatable = z.object({
  en: z.string().nullable(),
  ar: z.string().nullable(),
})

const limit = z.object({
  used: z.number(),
  /** Null means the feature is unlimited for this restaurant. */
  limit: z.number().nullable(),
})

export const restaurantSchema = z.object({
  id: z.number(),
  name: translatable,
  slug: z.string(),
  default_locale: z.string(),
  is_active: z.boolean(),
  template_id: z.number().nullable(),
  logo_url: z.string().nullable(),
  public_url: z.string(),
  qr_url: z.string(),
  limits: z.object({
    dishes: limit,
    categories: limit,
    social_links: limit,
  }),
  features: z.object({
    qr_studio: z.boolean(),
  }),
})

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  has_completed_onboarding: z.boolean(),
  coin_balance: z.number(),
  has_password: z.boolean(),
  restaurant: restaurantSchema.nullable(),
})

/** Laravel resources wrap the payload in `data`. */
export const userResponseSchema = z.object({ data: userSchema })

export type AuthUser = z.infer<typeof userSchema>
export type AuthRestaurant = z.infer<typeof restaurantSchema>
