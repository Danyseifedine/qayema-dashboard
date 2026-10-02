import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_URL } from './urls'

/** A dish or category name in each menu language written. */
type MenuText = { en: string; ar?: string }

/** What POST /__e2e/scenario accepts (see E2eController::scenario). */
export type ScenarioInput = {
  package?: 'free' | 'pro' | 'premium' | 'custom'
  package_starts_at?: string
  package_ends_at?: string
  template?: 'classic' | 'midnight' | null
  onboarded?: boolean
  restaurant?: boolean
  has_password?: boolean
  name?: MenuText
  description?: MenuText
  slug?: string
  second_locale?: string | null
  is_active?: boolean
  switched_off?: string[]
  phone?: string
  google_maps_url?: string
  opening_hours?: Record<string, { open: string; close: string } | null>
  categories?: {
    name: MenuText
    description?: MenuText
    dishes?: {
      name: MenuText
      price?: number
      ingredients?: MenuText
      is_available?: boolean
      variants?: { name: MenuText; options: { name: MenuText; price?: number }[] }[]
      addons?: { name: MenuText; price?: number }[]
    }[]
  }[]
  social_links?: { platform: string; url: string }[]
  orders?: number
  /** The orders' line carries a size and an add-on. */
  order_choices?: boolean
  visits?: number
  qr_scans?: number
  settings?: Record<string, string | boolean>
  qr_settings?: Record<string, unknown>
  logo?: boolean
}

export type Owner = {
  user: { email: string; password: string }
  restaurant: { id: number; slug: string; public_url: string }
  categories: { id: number; dishes: { id: number }[] }[]
}

export type Options = {
  /** The dashboard's interface language, as the owner picked it. */
  uiLanguage: 'en' | 'ar'
  uiTheme: 'light' | 'dark'
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
  /** Fail on serious or critical accessibility problems on the current page. */
  expectAccessible: (page?: Page) => Promise<void>
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
  uiTheme: ['light', { option: true }],

  page: async ({ page, uiLanguage, uiTheme }, provide) => {
    await page.addInitScript(
      ([language, theme]) => {
        // Only a first visit: a switch the owner makes during the test must
        // survive a reload, as it does for them.
        try {
          if (localStorage.getItem('qayema.dashboard.locale.v1') === null) {
            localStorage.setItem('qayema.dashboard.locale.v1', language)
          }
          if (localStorage.getItem('qayema.dashboard.theme.v1') === null) {
            localStorage.setItem('qayema.dashboard.theme.v1', theme)
          }
        } catch {
          // A page that forbids storage simply keeps its defaults.
        }
      },
      [uiLanguage, uiTheme],
    )

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
    await provide(async (target = page) => {
      const results = await new AxeBuilder({ page: target })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const serious = results.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
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
