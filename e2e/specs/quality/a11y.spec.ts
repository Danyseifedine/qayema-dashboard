import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { ADMIN_URL, API_URL, LOGIN_URL } from '../../support/urls'

/** A Premium restaurant with something on every page, so no page is scanned empty. */
const FULL: ScenarioInput = {
  package: 'premium',
  second_locale: 'ar',
  logo: true,
  google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
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
                { name: { en: 'Sandwich', ar: 'سندويش' } },
                { name: { en: 'Plate', ar: 'صحن' }, price: 4 },
              ],
            },
          ],
          addons: [{ name: { en: 'Extra garlic', ar: 'ثوم إضافي' }, price: 0.5 }],
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
  social_links: [{ platform: 'instagram', url: 'https://instagram.com/e2e.kitchen' }],
  orders: 3,
  visits: 24,
  qr_scans: 9,
}

/** Every dashboard page, by its address and the heading the topbar gives it. */
const DASHBOARD_PAGES = [
  ['overview', 'Overview', 'نظرة عامة'],
  ['analytics', 'Analytics', 'الإحصاءات'],
  ['categories', 'Categories', 'الأقسام'],
  ['dishes', 'Dishes', 'الأطباق'],
  ['design', 'Design', 'التصميم'],
  ['appearance', 'Appearance', 'المظهر'],
  ['orders', 'Orders', 'الطلبات'],
  ['qr', 'QR code', 'رمز QR'],
  ['social-links', 'Social links', 'روابط التواصل'],
  ['restaurant', 'Restaurant', 'المطعم'],
  ['features', 'Features', 'الميزات'],
  ['package', 'Package', 'الباقة'],
  ['account', 'Account', 'الحساب'],
] as const

/** Open a dashboard page and wait until what it loads has replaced its placeholders. */
async function openDashboardPage(page: Page, key: string, heading: string | RegExp): Promise<void> {
  await page.goto(`/${key}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
  const main = page.getByRole('main')
  await expect(main).not.toBeEmpty()
  await expect(main.locator('.animate-pulse, .animate-spin')).toHaveCount(0)
}

test.describe('accessibility: the dashboard', () => {
  // Every page in every look: phone (the drawer), Arabic (RTL) and dark (contrast).
  for (const [key, english, arabic] of DASHBOARD_PAGES) {
    test(`${key} @matrix`, async ({ page, owner, expectAccessible }) => {
      await owner(FULL)
      await openDashboardPage(page, key, either(english, arabic))
      await expectAccessible()
    })
  }

  for (const [key, heading] of [
    ['analytics', 'Analytics'],
    ['appearance', 'Appearance'],
    ['orders', 'Orders'],
  ] as const) {
    test(`${key}, locked on Free`, async ({ page, owner, expectAccessible }) => {
      await owner({ package: 'free', visits: 5 })
      await openDashboardPage(page, key, heading)
      await expect(page.getByRole('button', { name: 'See packages' })).toBeVisible()
      await expectAccessible()
    })
  }

  test('the dish form with variants and add-ons', async ({ page, owner, expectAccessible }) => {
    await owner(FULL)
    await openDashboardPage(page, 'dishes', 'Dishes')
    await page.getByRole('button', { name: 'Edit Kafta' }).click()
    await expect(page.getByRole('dialog').getByLabel('Variant name')).toHaveValue('Serving')
    await expectAccessible()
  })

  test('the request dialog on the Package page', async ({ page, owner, expectAccessible }) => {
    await owner({ package: 'free' })
    await openDashboardPage(page, 'package', 'Package')
    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Pro', exact: true }) })
      .getByRole('button', { name: 'Request this package' })
      .click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Ask about Pro' }),
    ).toBeVisible()
    await expectAccessible()
  })
})

test.describe('accessibility: what guests see', () => {
  test('the public menu in English @matrix', async ({ page, scenario, expectAccessible }) => {
    const created = await scenario(FULL)
    await page.goto(`${created.restaurant.public_url}?lang=en`)
    await expect(page.getByText('Kafta')).toBeVisible()
    await expectAccessible()
  })

  test('a dish’s sheet of variants and add-ons @matrix', async ({
    page,
    scenario,
    expectAccessible,
  }) => {
    const created = await scenario(FULL)
    await page.goto(`${created.restaurant.public_url}?lang=en`)
    await page.getByRole('button', { name: 'See options: Kafta' }).click()
    const sheet = page.getByRole('dialog', { name: 'Kafta' })
    await sheet.getByText('Plate').click()
    await sheet.getByText('Extra garlic').click()
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    )
    await expectAccessible()
  })

  test('the public menu in Arabic', async ({ page, scenario, expectAccessible }) => {
    const created = await scenario(FULL)
    await page.goto(`${created.restaurant.public_url}?lang=ar`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByText('كفتة')).toBeVisible()
    await expectAccessible()
  })

  test('the printable QR card', async ({ page, scenario, expectAccessible }) => {
    const created = await scenario(FULL)
    await page.goto(`${created.restaurant.public_url}/qr`)
    await expect(page.locator('canvas, svg').first()).toBeVisible()
    await expectAccessible()
  })

  test('the landing page', async ({ page, expectAccessible }) => {
    await page.goto(`${API_URL}/`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectAccessible()
  })

  // The topic, pricing and guide pages, in English and in Arabic.
  for (const path of [
    '/qr-menu-lebanon',
    '/digital-menu-for-cafes',
    '/pricing',
    '/guides',
    '/guides/how-to-make-a-qr-menu',
    '/ar/qr-menu-lebanon',
    '/ar/pricing',
    '/ar/guides/qr-menu-vs-paper-menu-cost',
  ]) {
    test(`the ${path} page`, async ({ page, expectAccessible }) => {
      await page.goto(`${API_URL}${path}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectAccessible()
    })
  }
})

test.describe('accessibility: signing in and setting up', () => {
  test('the login page', async ({ page, expectAccessible }) => {
    await page.goto(LOGIN_URL)
    await expect(page.getByRole('button', { name: /Sign in/ })).toBeVisible()
    await expectAccessible()
  })

  test('the forgot-password page', async ({ page, expectAccessible }) => {
    await page.goto(`${API_URL}/forgot-password`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectAccessible()
  })

  test('onboarding', async ({ page, owner, expectAccessible }) => {
    await owner({ restaurant: false, onboarded: false })
    await page.goto(`${API_URL}/onboarding`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expectAccessible()
  })
})

test.describe('accessibility: the admin panel', () => {
  test('the admin login', async ({ page, expectAccessible }) => {
    await page.goto(`${ADMIN_URL}/login`)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expectAccessible()
  })

  test('the restaurants list', async ({ page, scenario, signIn }) => {
    await scenario({ package: 'pro', logo: true })
    await signIn('admin@e2e.test')
    await page.goto(`${ADMIN_URL}/restaurants`)
    await expect(page.getByRole('heading', { level: 1, name: 'Restaurants' })).toBeVisible()
    await expect(page.getByRole('table').locator('tbody').getByRole('row').first()).toBeVisible()

    // Filament's ToggleColumn draws its switch without any way to label it
    // (vendor/filament/tables/src/Columns/ToggleColumn.php takes no
    // attributes for it), so only that one widget is left out of the scan.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.fi-ta-toggle [role="switch"]')
      .analyze()
    const serious = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
    expect(serious, 'serious accessibility violations').toEqual([])
  })
})
