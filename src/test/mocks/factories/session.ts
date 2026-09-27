import type { AuthUser } from '@/features/auth/schemas/user.schema'

/**
 * A signed-in owner as `GET /api/user` returns one, with a menu written in
 * English and Arabic unless the test says otherwise.
 */
export function makeSessionUser(
  restaurant: Partial<NonNullable<AuthUser['restaurant']>> = {},
): AuthUser {
  return {
    id: 1,
    name: 'Dany',
    email: 'owner@example.com',
    role: 'menu_owner',
    has_completed_onboarding: true,
    has_password: true,
    restaurant: {
      id: 1,
      name: { en: 'Beit Qayema', ar: null },
      slug: 'beit-qayema',
      languages: ['en', 'ar'],
      second_locale: 'ar',
      default_locale: 'en',
      is_active: true,
      template_id: 1,
      logo_url: null,
      public_url: 'https://qayema.test/beit-qayema',
      qr_url: 'https://qayema.test/beit-qayema?qr=1',
      package: {
        slug: 'free',
        name: { en: 'Free', ar: null },
        is_contact_only: false,
        ends_at: null,
      },
      limits: {
        dishes: { used: 0, limit: 40 },
        categories: { used: 0, limit: 10 },
        social_links: { used: 0, limit: 2 },
      },
      hidden_sections: [],
      features: { qr_studio: true, ordering: true, advanced_analytics: true },
      ...restaurant,
    },
  }
}
