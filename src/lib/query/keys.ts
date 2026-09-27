/**
 * Root key segments, one per API resource.
 *
 * Every feature builds its keys from these, so an invalidation by prefix
 * cannot miss a hand-written array that spelled the resource differently.
 */
export const QUERY_ROOTS = {
  session: 'session',
  analytics: 'analytics',
  categories: 'categories',
  dishes: 'dishes',
  restaurant: 'restaurant',
  design: 'design',
  colorsFonts: 'colors-fonts',
  orders: 'orders',
  package: 'package',
  qr: 'qr',
  socialLinks: 'social-links',
} as const

export type QueryRoot = (typeof QUERY_ROOTS)[keyof typeof QUERY_ROOTS]
