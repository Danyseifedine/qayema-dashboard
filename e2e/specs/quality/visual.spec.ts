import type { Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { LOGIN_URL } from '../../support/urls'

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
          variants: [
            {
              name: { en: 'Serving', ar: 'التقديم' },
              options: [
                { name: { en: 'Sandwich', ar: 'سندويش' }, price: 0 },
                { name: { en: 'Plate', ar: 'صحن' }, price: 4 },
              ],
            },
          ],
          addons: [
            { name: { en: 'Extra garlic', ar: 'ثوم إضافي' }, price: 0.5 },
            { name: { en: 'Fries', ar: 'بطاطا' }, price: 2 },
          ],
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

  test('the dish form with variants and add-ons @visual', async ({ page, owner }) => {
    const restaurantSlug = slug()
    await owner({ ...RESTAURANT, slug: restaurantSlug })
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Kafta' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Variant name')).toHaveValue('Serving')
    await settle(page)

    // The variants block alone: the whole section is taller than a phone.
    const variants = dialog
      .getByRole('region', { name: 'Variants and add-ons' })
      .locator('div', { has: page.getByRole('heading', { level: 4, name: 'Variants' }) })
      .first()
    await expect(variants).toHaveScreenshot('dish-form-choices.png')
  })

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

  test('the dish sheet @visual', async ({ page, scenario }) => {
    const created = await scenario({ ...RESTAURANT, slug: slug() })
    await page.goto(created.restaurant.public_url)
    await page.getByRole('button', { name: 'See options: Kafta' }).click()
    const sheet = page.getByRole('dialog', { name: 'Kafta' })
    await sheet.getByText('Plate').click()
    await sheet.getByText('Extra garlic').click()
    // Still, so the shot is not taken mid-slide.
    await expect(sheet).toHaveJSProperty('className', 'dish-sheet')
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    )
    await settle(page)

    await expect(page).toHaveScreenshot('dish-sheet.png')
  })

  test('the cart, ordering in the menu, and the note that it went @visual', async ({
    page,
    scenario,
  }) => {
    const created = await scenario({ ...RESTAURANT, slug: slug(), order_mode: 'menu' })
    await page.goto(created.restaurant.public_url)
    await page.getByRole('button', { name: 'Add Shish taouk' }).click()

    // A column of its own on a wide screen, a sheet from the header on a phone.
    const wide = (page.viewportSize()?.width ?? 0) >= 1024
    const cart = wide ? page.locator('aside.col-aside') : page.locator('#cart-sheet')
    if (!wide) await page.getByRole('button', { name: 'Your cart' }).click()
    // Waits out what slides in; a pulse that never ends (the order bar's
    // "waiting" dot) is frozen by the screenshot itself.
    const still = () =>
      page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        ),
      )
    // Empty, so every box shows its hint.
    await still()
    await settle(page)
    await expect(page).toHaveScreenshot('menu-cart.png')

    // The country code's list, searched.
    await cart.getByRole('button', { name: /^Country code/ }).click()
    await cart.getByRole('combobox', { name: 'Search a country or code' }).fill('a')
    await still()
    await expect(page).toHaveScreenshot('menu-cart-countries.png')
    await cart.getByRole('combobox', { name: 'Search a country or code' }).press('Escape')

    // The location shared and the street filled in, the rest typed.
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ latitude: 33.8959, longitude: 35.4784 })
    await cart.getByRole('button', { name: 'Use my current location' }).click()
    await expect(cart.getByLabel('Address')).toHaveValue('Bliss Street, Ras Beirut, Beirut')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByLabel('Phone number').blur()
    await still()
    await expect(page).toHaveScreenshot('menu-cart-located.png')

    await cart.getByRole('button', { name: /Place order/ }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Order sent' })
    await expect(toast).toBeVisible()
    await still()
    // The order number is new every time.
    await expect(page).toHaveScreenshot('order-sent.png', {
      mask: [toast.locator('.menu-toast-text > span'), page.locator('.order-bar-text strong')],
    })

    // The sheet the guest follows it in, over the menu.
    await toast.getByRole('link', { name: 'Track your order' }).click()
    const sheet = page.getByRole('dialog', { name: 'Order tracking' })
    await expect(sheet.locator('.track-status')).toContainText('Order sent')
    await still()
    await settle(page)
    // The order number and the time it was sent change every run.
    await expect(page).toHaveScreenshot('order-tracking.png', {
      mask: [
        sheet.locator('.track-ref'),
        sheet.locator('.track-step-time'),
        page.locator('.order-bar-text strong'),
      ],
    })
  })

  test('the login page @visual', async ({ page }) => {
    await page.goto(LOGIN_URL)
    await expect(page.getByRole('button', { name: /Sign in/ })).toBeVisible()
    await settle(page)

    await expect(page).toHaveScreenshot('login.png', { fullPage: true })
  })
})
