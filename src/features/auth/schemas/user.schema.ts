import { z } from 'zod'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/**
 * Mirrors ../qayema/app/Http/Resources/UserResource.php.
 *
 * `restaurant` is only present once onboarding has created one, which is what
 * the dashboard branches on to decide between the wizard and the app.
 */
const planSchema = z.object({
  multiple_languages: z.boolean(),
  variants: z.boolean(),
  addons: z.boolean(),
  appearance: z.boolean(),
  premium_designs: z.boolean(),
  qr_studio: z.boolean(),
  ordering: z.boolean(),
  menu_ordering: z.boolean(),
  dine_in: z.boolean(),
  analytics: z.boolean(),
  advanced_analytics: z.boolean(),
})

/** A package named in the session, in both interface languages. */
const packageSummary = {
  slug: z.string().nullable(),
  name: translatableTextSchema,
}

const limit = z.object({
  used: z.number(),
  /** Null means the feature is unlimited for this restaurant. */
  limit: z.number().nullable(),
})

const restaurantSchema = z.object({
  /** Names the live orders channel. */
  id: z.number().int(),
  /** What the menu is written in: English, then the second language if any. */
  languages: z.array(z.string()).min(1),
  /** The second language chosen, kept even while "Multiple languages" is off. */
  second_locale: z.string().nullable(),
  /** What the menu opens in: one of `languages`. */
  default_locale: z.string(),
  template_id: z.number().nullable(),
  public_url: z.string(),
  /**
   * The package actually in force. An assignment that has not started or has
   * ended reports as the default one, because that is where the limits below
   * came from.
   */
  package: z.object({
    ...packageSummary,
    is_contact_only: z.boolean(),
    /** ISO-8601, or null when the package does not end. */
    ends_at: z.string().nullable(),
    /** Whole days until it ends, 0 on its last day; null when it does not end. */
    days_left: z.number().int().nullable(),
  }),
  /** The package the restaurant was given when it has ended. */
  lapsed: z.object({ ...packageSummary, ended_at: z.string().nullable() }).nullable(),
  /** The package the restaurant was given when it starts later. */
  upcoming: z.object({ ...packageSummary, starts_at: z.string().nullable() }).nullable(),
  limits: z.object({
    dishes: limit,
    categories: limit,
    social_links: limit,
  }),
  /** Optional features the owner switched off on the Features page. */
  switched_off: z.array(z.string()),
  /**
   * How guests send their orders while ordering is on: to WhatsApp, or in
   * the menu (only while the package includes it), and which kinds of order
   * the menu takes.
   */
  ordering: z.object({
    mode: z.enum(['whatsapp', 'menu']),
    types: z.array(z.enum(['delivery', 'pickup'])).min(1),
  }),
  /** What this restaurant may use: its package plus any grants. */
  plan: planSchema,
})

const userSchema = z.object({
  name: z.string(),
  email: z.email(),
  has_completed_onboarding: z.boolean(),
  has_password: z.boolean(),
  /**
   * An admin viewing this account from /admin (Users → Impersonate): their
   * name, and the link that hands the session back. Null for the owner.
   */
  impersonation: z
    .object({ admin: z.string().nullable(), leave_url: z.string() })
    .nullable()
    .default(null),
  restaurant: restaurantSchema.nullable(),
})

/** Laravel resources wrap the payload in `data`. */
export const userResponseSchema = z.object({ data: userSchema })

export type AuthUser = z.infer<typeof userSchema>
export type AuthRestaurant = z.infer<typeof restaurantSchema>
export type Plan = z.infer<typeof planSchema>
export type OrderMode = AuthRestaurant['ordering']['mode']
export type OrderType = AuthRestaurant['ordering']['types'][number]
