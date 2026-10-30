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
  offers: z.boolean(),
  dine_in_whatsapp: z.boolean(),
  order_tracking: z.boolean(),
  offer_schedules: z.boolean(),
  offer_discounts: z.boolean(),
  /**
   * Dishes may carry "build your own" (half and half pizzas). On no
   * package: an admin switches it on per restaurant. False from a server
   * from before it.
   */
  build_your_own: z.boolean().default(false),
  /**
   * Connect to POS: the menu may take its categories and dishes from a POS
   * branch. On no package: an admin switches it on per restaurant. False
   * from a server from before it.
   */
  pos_connection: z.boolean().default(false),
})

/** A package named in the session, in both interface languages. */
const packageSummary = {
  slug: z.string().nullable(),
  /** Its crown's metal, as the admin set it; null from a server from before it. */
  tier: z.enum(['bronze', 'silver', 'gold']).nullable().default(null),
  name: translatableTextSchema,
}

const limit = z.object({
  used: z.number(),
  /** Null means the feature is unlimited for this restaurant. */
  limit: z.number().nullable(),
})

/** How a WhatsApp order asks the guest for one thing. */
const askLevel = z.enum(['off', 'optional', 'required'])

const restaurantSchema = z.object({
  /** Names the live orders channel. */
  id: z.number().int(),
  /** What the menu is written in: the main language, then the second if any. */
  languages: z.array(z.string()).min(1),
  /** The language every name is written in, any on the list (English by default). */
  main_locale: z.string().default('en'),
  /** The second language chosen, kept even while "Multiple languages" is off. */
  second_locale: z.string().nullable(),
  /** What the menu opens in: one of `languages`. */
  default_locale: z.string(),
  template_id: z.number().nullable(),
  public_url: z.string(),
  /**
   * The package actually in force. An assignment that has not started yet
   * reports as the default one, because that is where the limits below came
   * from; an ended one is kept (`lapsed` says when the menu goes offline).
   */
  package: z.object({
    ...packageSummary,
    is_contact_only: z.boolean(),
    /** ISO-8601, or null when the package does not end. */
    ends_at: z.string().nullable(),
    /** Whole days until it ends, 0 on its last day; null when it does not end. */
    days_left: z.number().int().nullable(),
  }),
  /**
   * The package the restaurant was given when it has ended: the menu stays
   * online until `offline_at` (a few days of grace), then is offline until
   * the package is renewed. The defaults read an API from before these.
   */
  lapsed: z
    .object({
      ...packageSummary,
      ended_at: z.string().nullable(),
      offline_at: z.string().nullable().default(null),
      offline: z.boolean().default(false),
    })
    .nullable(),
  /** The package the restaurant was given when it starts later. */
  upcoming: z.object({ ...packageSummary, starts_at: z.string().nullable() }).nullable(),
  limits: z.object({
    dishes: limit,
    categories: limit,
    social_links: limit,
    /** Dishes guests build (Build your own); 3 unless an admin sets another. */
    builds: limit.default({ used: 0, limit: 3 }),
  }),
  /** Dishes still without a photo (Home's checklist), counted by the server. */
  dishes_without_photo: z.number().int().default(0),
  /**
   * Linked to a POS branch (and Connect to POS on): the POS owns the
   * categories and dishes (no adding or deleting, its fields read-only),
   * and Offers and Build your own are off. False from a server from before it.
   */
  pos_connected: z.boolean().default(false),
  /** Optional features the owner switched off on the Features page. */
  switched_off: z.array(z.string()),
  /**
   * The `plan` flags an admin turned off for this restaurant, whatever its
   * package says (already false in `plan`). Said as "turned off for your
   * restaurant", never as an upgrade. Empty from an API from before it.
   */
  turned_off: z.array(z.string()).default([]),
  /**
   * How guests send their orders while ordering is on: to WhatsApp, or in
   * the menu (only while the package includes it), and which kinds of order
   * the menu takes. Orders at the table have their own way in (`dine_in`,
   * the owner's choice), and WhatsApp needs a number it can reach
   * (`whatsapp_number`); without one they arrive here. `whatsapp_fields`
   * is what a WhatsApp order asks the guest for: `away` for delivery and
   * pickup, `table` for orders at the table.
   */
  ordering: z.object({
    mode: z.enum(['whatsapp', 'menu']),
    types: z.array(z.enum(['delivery', 'pickup'])).min(1),
    dine_in: z.enum(['whatsapp', 'menu']),
    whatsapp_number: z.boolean(),
    whatsapp_fields: z.object({
      away: z.object({ name: askLevel, phone: askLevel, address: askLevel }),
      table: z.object({ name: askLevel, phone: askLevel }),
    }),
  }),
  /** What this restaurant may use: its package plus any grants. */
  plan: planSchema,
  /**
   * The AI buttons (translate, write a description): null while off (no
   * provider, or no credits on the package), else the month's credits, the
   * only limit: how many and those left (null for no cap), the day they
   * come back and each action's price (null from a server from before them).
   */
  writing_help: z
    .object({
      credits: z
        .object({
          limit: z.number().int().nullable(),
          left: z.number().int().nullable(),
          resets_on: z.string(),
          prices: z.object({ translation: z.number().int(), description: z.number().int() }),
        })
        .nullable()
        .default(null),
    })
    .nullable()
    .default(null),
})

const userSchema = z.object({
  name: z.string(),
  /**
   * How the account signs in: an account made with a username has no email,
   * one made with Google no username. At least one is always set.
   */
  username: z.string().nullable().default(null),
  email: z.email().nullable(),
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
export type WhatsAppFields = AuthRestaurant['ordering']['whatsapp_fields']
export type AskLevel = z.infer<typeof askLevel>
