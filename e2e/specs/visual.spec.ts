import type { Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../fixtures/test'
import { LOGIN_URL } from '../support/urls'

/**
 * Screenshot baselines (projects `visual` and `visual-phone`). Every owner is
 * the same restaurant; only its slug and email must be new each time (they
 * are unique in the database), so both have a fixed length and are masked,
 * along with whatever depends on the clock or on them (charts' dates, order
 * times and references, QR codes).
 */

/** A slug of fixed length, so the text around it never moves. */
function slug(): string {
  return `vis-${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`
}

const RESTAURANT: ScenarioInput = {
  package: 'premium',
  second_locale: 'ar',
  logo: true,
  name: { en: 'Cedar & Salt', ar: 'أرز وملح' },
  description: { en: 'Grills and mezze, made to share.', ar: 'مشاوي ومازة للمشاركة.' },
  phone: '+96170123456',
  categories: [
    {
      name: { en: 'Grills', ar: 'مشاوي' },
      description: { en: 'Over charcoal.', ar: 'على الفحم.' },
      dishes: [
        {
          name: { en: 'Kafta', ar: 'كفتة' },
          price: 12,
          ingredients: { en: 'Lamb, parsley, onion', ar: 'لحم، بقدونس، بصل' },
        },
        { name: { en: 'Shish taouk', ar: 'شيش طاووق' }, price: 11 },
      ],
    },
    {
      name: { en: 'Mezze', ar: 'مازة' },
      dishes: [
        { name: { en: 'Hummus', ar: 'حمص' }, price: 6 },
        { name: { en: 'Fattoush', ar: 'فتوش' }, price: 7, is_available: false },
      ],
    },
  ],
  social_links: [{ platform: 'instagram', url: 'https://instagram.com/cedarandsalt' }],
  orders: 2,
}

const DASHBOARD_PAGES = [
  ['overview', 'Overview'],
  ['analytics', 'Analytics'],
  ['categories', 'Categories'],
  ['dishes', 'Dishes'],
  ['design', 'Design'],
  ['appearance', 'Appearance'],
  ['orders', 'Orders'],
  ['qr', 'QR code'],
  ['social-links', 'Social links'],
  ['restaurant', 'Restaurant'],
  ['features', 'Features'],
  ['package', 'Package'],
  ['account', 'Account'],
] as const

/** Wait until the page has loaded everything it shows, fonts included. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator('.animate-pulse, .animate-spin')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  await expect
    .poll(() => page.evaluate(() => Array.from(document.images).every((image) => image.complete)))
    .toBe(true)
}

/** What changes from run to run on a dashboard page. */
function dashboardMasks(page: Page, restaurantSlug: string): Locator[] {
  return [
    page.getByText(restaurantSlug),
    page.getByText(/owner-[a-z0-9]+@e2e\.test/),
    page.locator('input[type="email"]'),
    page.locator('.recharts-wrapper'),
    page.locator('canvas'),
    page.getByRole('img', { name: "Your menu's QR code" }),
    page.getByRole('article').locator('.force-ltr'),
    page.getByRole('article').locator('.force-ltr + p'),
  ]
}

test.describe('visual: the dashboard', () => {
  for (const [key, heading] of DASHBOARD_PAGES) {
    test(`${key} @visual`, async ({ page, owner }) => {
      const restaurantSlug = slug()
      await owner({ ...RESTAURANT, slug: restaurantSlug })
      await page.goto(`/${key}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
      await settle(page)

      await expect(page).toHaveScreenshot(`${key}.png`, {
        fullPage: true,
        mask: dashboardMasks(page, restaurantSlug),
      })
    })
  }

  test('analytics, locked on Free @visual', async ({ page, owner }) => {
    const restaurantSlug = slug()
    await owner({ package: 'free', slug: restaurantSlug, name: { en: 'Cedar & Salt' } })
    await page.goto('/analytics')
    await expect(page.getByRole('button', { name: 'See packages' })).toBeVisible()
    await settle(page)

    await expect(page).toHaveScreenshot('analytics-locked.png', {
      fullPage: true,
      mask: dashboardMasks(page, restaurantSlug),
    })
  })
})

test.describe('visual: guests and signing in', () => {
  test('the public menu @visual', async ({ page, scenario }) => {
    const created = await scenario({ ...RESTAURANT, slug: slug() })
    await page.goto(created.restaurant.public_url)
    await expect(page.getByText('Kafta')).toBeVisible()
    await settle(page)

    await expect(page).toHaveScreenshot('public-menu.png', { fullPage: true })
  })

  test('the login page @visual', async ({ page }) => {
    await page.goto(LOGIN_URL)
    await expect(page.getByRole('button', { name: /Sign in/ })).toBeVisible()
    await settle(page)

    await expect(page).toHaveScreenshot('login.png', { fullPage: true })
  })
})
