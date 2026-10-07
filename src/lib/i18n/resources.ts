import type account from '@/locales/en/account.json'
import type analytics from '@/locales/en/analytics.json'
import type appearance from '@/locales/en/appearance.json'
import type common from '@/locales/en/common.json'
import type design from '@/locales/en/design.json'
import type features from '@/locales/en/features.json'
import type menu from '@/locales/en/menu.json'
import type orders from '@/locales/en/orders.json'
import type overview from '@/locales/en/overview.json'
import type pkg from '@/locales/en/package.json'
import type qr from '@/locales/en/qr.json'
import type restaurant from '@/locales/en/restaurant.json'
import type socialLinks from '@/locales/en/social-links.json'
import type tables from '@/locales/en/tables.json'

/**
 * The English files are the source of truth for what keys exist, so a typo in
 * `t('menu:dish.nmae')` fails the typecheck. One namespace per feature folder,
 * named after it. A new area's file is added here once; a new *language*
 * never touches this file.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      overview: typeof overview
      analytics: typeof analytics
      menu: typeof menu
      design: typeof design
      appearance: typeof appearance
      orders: typeof orders
      qr: typeof qr
      'social-links': typeof socialLinks
      tables: typeof tables
      restaurant: typeof restaurant
      features: typeof features
      package: typeof pkg
      account: typeof account
    }
  }
}
