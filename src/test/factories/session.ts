import type { AuthUser, Plan } from '@/features/auth'

/** Every flag on: the tests of a page are about the page, not its lock. */
export const FULL_PLAN: Plan = {
  multiple_languages: true,
  variants: true,
  addons: true,
  appearance: true,
  premium_designs: true,
  qr_studio: true,
  ordering: true,
  menu_ordering: true,
  dine_in: true,
  analytics: true,
  advanced_analytics: true,
}

/** Every flag off, as the Free package ships. */
export const EMPTY_PLAN: Plan = {
  multiple_languages: false,
  variants: false,
  addons: false,
  appearance: false,
  premium_designs: false,
  qr_studio: false,
  ordering: false,
  menu_ordering: false,
  dine_in: false,
  analytics: false,
  advanced_analytics: false,
}

/**
 * A signed-in owner as `GET /api/user` returns one, with a menu written in
 * English and Arabic unless the test says otherwise.
 */
export function makeSessionUser(
  restaurant: Partial<NonNullable<AuthUser['restaurant']>> = {},
): AuthUser {
  return {
    name: 'Dany',
    username: null,
    email: 'owner@example.com',
    has_completed_onboarding: true,
    has_password: true,
    impersonation: null,
    restaurant: {
      id: 7,
      languages: ['en', 'ar'],
      main_locale: 'en',
      second_locale: 'ar',
      default_locale: 'en',
      template_id: 1,
      public_url: 'https://qayema.test/beit-qayema',
      package: {
        slug: 'free',
        name: { en: 'Free', ar: null },
        is_contact_only: false,
        ends_at: null,
        days_left: null,
      },
      lapsed: null,
      upcoming: null,
      limits: {
        dishes: { used: 0, limit: 40 },
        categories: { used: 0, limit: 10 },
        social_links: { used: 0, limit: 2 },
      },
      switched_off: [],
      ordering: {
        mode: 'whatsapp',
        types: ['delivery', 'pickup'],
        dine_in: 'menu',
        whatsapp_number: true,
      },
      plan: FULL_PLAN,
      ...restaurant,
    },
  }
}
