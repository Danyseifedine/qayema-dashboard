import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_URL } from './urls'

/** A dish or category name in each menu language written (`de`, `ru`... for a menu in those). */
type MenuText = { en?: string; ar?: string; [code: string]: string | undefined }

/** What POST /__e2e/scenario accepts (see E2eController::scenario). */
export type ScenarioInput = {
  /** One of the four, or the slug of one an admin made in the test. */
  package?: 'free' | 'pro' | 'premium' | 'custom' | (string & {})
  package_starts_at?: string
  package_ends_at?: string
  template?: 'classic' | 'midnight' | 'ember' | null
  onboarded?: boolean
  restaurant?: boolean
  has_password?: boolean
  name?: MenuText
  description?: MenuText
  slug?: string
  /** The language every name is written in (English when left out). */
  main_locale?: string
  second_locale?: string | null
  is_active?: boolean
  switched_off?: string[]
  /** null: no phone, so no WhatsApp to reach. */
  phone?: string | null
  google_maps_url?: string
  /** One shift a day, or up to three (lunch and dinner); null closed. */
  opening_hours?: Record<
    string,
    { open: string; close: string } | { open: string; close: string }[] | null
  >
  categories?: {
    name: MenuText
    description?: MenuText
    /** One of the category icons (../qayema/app/Support/CategoryIcons.php). */
    icon?: string
    dishes?: {
      name: MenuText
      /** Null for none (a dish priced by its variants); 10 when left out. */
      price?: number | null
      /** Priced in the restaurant's second currency (its code); the main one when left out. */
      currency?: string
      ingredients?: MenuText
      is_available?: boolean
      /** A photo on the card (and its full size in the photo pop-up). */
      image?: boolean
      variants?: { name: MenuText; options: { name: MenuText; price?: number }[] }[]
      addons?: { name: MenuText; price?: number }[]
      /** Built from parts: from a scenario category (its English name) or a list of its own. */
      builds?: {
        name: MenuText
        shape?: 'split' | 'pieces'
        parts?: number[]
        category?: string
        choices?: { name: MenuText; price?: number; part_prices?: Record<string, string> }[]
        /** A category dish's own price per part size, by its English name. */
        part_prices?: Record<string, Record<string, string>>
      }[]
    }[]
  }[]
  social_links?: { platform: string; url: string }[]
  /** An admin's override: a limit (null unlimited) or an on/off feature (0 off, 1 on). */
  overrides?: { feature: string; value: number | null }[]
  /** The restaurant's own price, in cents, instead of its package's. */
  price_cents?: number
  /** The main currency (USD when left out), and a second one some dishes are priced in, with its rate (main per one second). */
  currency?: string
  second_currency?: string
  exchange_rate?: string
  /** How guests send their orders: WhatsApp (the default) or in the menu. */
  order_mode?: 'whatsapp' | 'menu'
  /** What the menu takes when guests order in it; both when left out. */
  order_types?: ('delivery' | 'pickup')[]
  orders?: number
  /** How the seeded orders came in: placed in the menu (the default, with a phone and an address) or sent to WhatsApp. */
  order_channel?: 'menu' | 'whatsapp'
  /** The orders' line carries a size and an add-on. */
  order_choices?: boolean
  visits?: number
  qr_scans?: number
  settings?: Record<string, string | boolean>
  qr_settings?: Record<string, unknown>
  logo?: boolean
  /** A wide cover picture behind the name. */
  cover?: boolean
  /** Logged AI use with its cost in dollars, for the admin's spending figures. */
  writing_help_days?: {
    days_ago?: number
    uses: number
    input_tokens: number
    output_tokens: number
    cost: string
    /** The month's AI credits they took. */
    credits?: number
  }[]
  /** Offers on the menu (Premium); `dishes` names the scenario's dishes in English. */
  offers?: {
    title: MenuText
    description?: MenuText
    /** False: a picture alone, its words drawn into it (needs `image`). */
    show_text?: boolean
    /** A wide picture. */
    image?: boolean
    placements: ('banner' | 'popup' | 'ad')[]
    banner_shape?: 'rectangle' | 'square'
    popup_shape?: 'square' | 'tall'
    action?: 'none' | 'dishes' | 'link'
    action_url?: string
    show_again?: 'every_visit' | 'daily' | 'once'
    delay_seconds?: number
    /** The ad's wait: after the pop-up closes, or the menu opens. */
    ad_delay_seconds?: number
    ad_seconds?: number
    discount_type?: 'none' | 'percent' | 'amount' | 'second'
    discount_value?: number
    dishes?: string[]
    /** UTC, "2026-11-01 18:00:00". */
    starts_at?: string
    ends_at?: string
    repeat?: 'always' | 'weekly' | 'monthly'
    weekdays?: string[]
    month_days?: number[]
    time_windows?: { from: string; to: string }[]
    /** Shown all the time, the deal only in its days and hours. */
    shows_outside_hours?: boolean
    is_active?: boolean
    /** The offer's own dish (its deal), its one dish; `category` names a scenario category in English. */
    deal?: {
      name: MenuText
      price: number
      category: string
      ingredients?: MenuText
    }
  }[]
}

export type Owner = {
  user: { email: string; password: string }
  restaurant: { id: number; slug: string; public_url: string }
  categories: { id: number; dishes: { id: number }[] }[]
  /** `deal_id`: the offer's deal dish, null without one. */
  offers: { id: number; deal_id: number | null }[]
}

export type Options = {
  /** The dashboard's interface language, as the owner picked it. */
  uiLanguage: 'en' | 'ar'
}

type Fixtures = {
  /** Build an owner on the e2e backend (not signed in). */
  scenario: (input?: ScenarioInput) => Promise<Owner>
  /** Build an owner and sign this browser in as them. */
  owner: (input?: ScenarioInput) => Promise<Owner>
  /** Sign this browser in as any user, without the form. */
  signIn: (email: string) => Promise<void>
  /** Move a restaurant to a package, as an admin would. */
  setPackage: (
    restaurantId: number,
    input: Pick<ScenarioInput, 'package' | 'package_starts_at' | 'package_ends_at'>,
  ) => Promise<void>
  /**
   * Fail on serious or critical accessibility problems on the current page,
   * or only in `include` (a selector): a full-screen sheet hides the page
   * behind it, which axe would read against the sheet's colour.
   */
  expectAccessible: (page?: Page, options?: { include?: string }) => Promise<void>
}

async function post(request: APIRequestContext, path: string, data: object) {
  const response = await request.post(`${API_URL}/__e2e/${path}`, {
    data,
    headers: { Accept: 'application/json' },
  })
  expect(response.ok(), `${path}: ${response.status()} ${await response.text()}`).toBeTruthy()
  return response
}

export const test = base.extend<Fixtures & Options>({
  uiLanguage: ['en', { option: true }],

  page: async ({ page, uiLanguage }, provide) => {
    await page.addInitScript((language) => {
      // Only a first visit: a switch the owner makes during the test must
      // survive a reload, as it does for them.
      try {
        if (localStorage.getItem('qayema.dashboard.locale.v1') === null) {
          localStorage.setItem('qayema.dashboard.locale.v1', language)
        }
      } catch {
        // A page that forbids storage simply keeps its defaults.
      }
    }, uiLanguage)

    // Any uncaught error in the browser is a bug, whatever the test checks.
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        errors.push(message.text())
      }
    })

    await provide(page)

    expect(errors, 'uncaught browser errors').toEqual([])
  },

  scenario: async ({ request }, provide) => {
    await provide(
      async (input = {}) => (await post(request, 'scenario', input)).json() as Promise<Owner>,
    )
  },

  signIn: async ({ page }, provide) => {
    await provide(async (email) => {
      await post(page.context().request, 'login', { email })
    })
  },

  owner: async ({ scenario, signIn }, provide) => {
    await provide(async (input = {}) => {
      const owner = await scenario(input)
      await signIn(owner.user.email)
      return owner
    })
  },

  setPackage: async ({ request }, provide) => {
    await provide(async (restaurantId, input) => {
      await post(request, 'package', { restaurant_id: restaurantId, ...input })
    })
  },

  expectAccessible: async ({ page }, provide) => {
    await provide(async (target = page, { include } = {}) => {
      const builder = new AxeBuilder({ page: target }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ])
      const results = await (include ? builder.include(include) : builder).analyze()
      const serious = results.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map(
          (violation) =>
            `${violation.id}: ${violation.help} (${violation.nodes.length}): ${violation.nodes
              .map((node) => node.target.join(' '))
              .join(', ')}`,
        )
      expect(serious, 'serious accessibility violations').toEqual([])
    })
  },
})

export { expect }

/** A date `days` from now, as the backend reads it. */
export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

/**
 * Matches a label in either interface language, for the @matrix tests that
 * also run in Arabic: `either('Dishes', 'الأطباق')`.
 */
export function either(english: string, arabic: string): RegExp {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\s*(${escape(english)}|${escape(arabic)})\\s*$`)
}
