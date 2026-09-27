import type account from '@/locales/en/account.json'
import type common from '@/locales/en/common.json'
import type menu from '@/locales/en/menu.json'
import type orders from '@/locales/en/orders.json'
import type overview from '@/locales/en/overview.json'
import type packages from '@/locales/en/packages.json'
import type qr from '@/locales/en/qr.json'
import type settings from '@/locales/en/settings.json'
import type social from '@/locales/en/social.json'
import type templates from '@/locales/en/templates.json'

/**
 * The English files are the source of truth for what keys exist, so a typo in
 * `t('menu:dish.nmae')` fails the typecheck. A new area's file is added here
 * once; a new *language* never touches this file.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      menu: typeof menu
      settings: typeof settings
      account: typeof account
      social: typeof social
      overview: typeof overview
      orders: typeof orders
      packages: typeof packages
      templates: typeof templates
      qr: typeof qr
    }
  }
}
