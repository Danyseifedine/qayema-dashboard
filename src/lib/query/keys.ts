/**
 * Root key segments, one per API resource.
 *
 * Every feature builds its keys from these, so an invalidation by prefix
 * cannot miss a hand-written array that spelled the resource differently.
 */
export const QUERY_ROOTS = {
  session: 'session',
  stats: 'stats',
  categories: 'categories',
  dishes: 'dishes',
  settings: 'settings',
  templates: 'templates',
  packages: 'packages',
  qr: 'qr',
  socialLinks: 'social-links',
} as const

export type QueryRoot = (typeof QUERY_ROOTS)[keyof typeof QUERY_ROOTS]
