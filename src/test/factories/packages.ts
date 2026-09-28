import type { Package } from '@/features/package/schemas/package.schema'
import { EMPTY_PLAN, FULL_PLAN } from '@/test/factories/session'

/** One package as `GET /api/packages` returns it: Free's contents unless overridden. */
export function makePackage(
  overrides: Partial<Omit<Package, 'features'>> & { features?: Partial<Package['features']> } = {},
): Package {
  const { features, ...rest } = overrides
  return {
    id: 1,
    slug: 'free',
    name: { en: 'Free', ar: 'مجانية' },
    description: { en: 'Enough to go live.', ar: null },
    price_cents: 0,
    currency: 'USD',
    is_contact_only: false,
    is_default: true,
    is_featured: false,
    ...rest,
    features: {
      dish_limit: 40,
      category_limit: 8,
      social_link_limit: 1,
      ...EMPTY_PLAN,
      ...features,
    },
  }
}

/** The four packages as the backend seeds them. */
export const PACKAGE_CATALOGUE: Package[] = [
  makePackage(),
  makePackage({
    id: 2,
    slug: 'pro',
    name: { en: 'Pro', ar: 'برو' },
    price_cents: 1200,
    is_default: false,
    features: {
      dish_limit: 150,
      category_limit: 15,
      social_link_limit: 2,
      multiple_languages: true,
      appearance: true,
      analytics: true,
    },
  }),
  makePackage({
    id: 3,
    slug: 'premium',
    name: { en: 'Premium', ar: 'مميّز' },
    price_cents: 2900,
    is_default: false,
    is_featured: true,
    features: { dish_limit: 500, category_limit: 30, social_link_limit: 10, ...FULL_PLAN },
  }),
  makePackage({
    id: 4,
    slug: 'custom',
    name: { en: 'Custom', ar: 'مخصّص' },
    price_cents: null,
    is_contact_only: true,
    is_default: false,
    features: { dish_limit: null, category_limit: null, social_link_limit: null, ...FULL_PLAN },
  }),
]
