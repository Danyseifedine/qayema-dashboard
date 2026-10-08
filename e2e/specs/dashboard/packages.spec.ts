import type { Locator, Page } from '@playwright/test'
import { daysFromNow, either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { ADMIN_URL, API_URL } from '../../support/urls'

type PackageSlug = NonNullable<ScenarioInput['package']>

/** The sidebar, opened first on a phone where it lives in a drawer (below Tailwind's lg). */
async function sidebar(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') }).click()
  }
  return page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })
}

/** A sidebar row, whatever chip follows its label (`\\b` knows no Arabic letters). */
function row(nav: Locator, english: string, arabic: string): Locator {
  return nav.getByRole('button', { name: startsWith(english, arabic) })
}

/** A heading that begins with a label in either language, whatever chip follows it. */
function startsWith(english: string, arabic: string): RegExp {
  return new RegExp(`^\\s*(${english}|${arabic})(\\s|$)`)
}

/** Run one step per item, one after the other: every step drives the same page. */
function inOrder<T>(items: readonly T[], step: (item: T) => Promise<void>): Promise<void> {
  return items.reduce<Promise<void>>(
    (previous, item) => previous.then(() => step(item)),
    Promise.resolve(),
  )
}

/** The dates the Package page prints, as the browser (Asia/Beirut, en) does. */
function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Beirut',
  }).format(new Date(iso))
}

const LOCKED_BUTTON = either('See packages', 'عرض الباقات')

/** Which of the three gated sections each package leaves locked, and the chip each shows. */
const LOCKS: Record<PackageSlug, { analytics?: RegExp; appearance?: RegExp; orders?: RegExp }> = {
  free: {
    analytics: /Pro|برو/,
    appearance: /Pro|برو/,
    orders: /Premium|مميّز/,
  },
  pro: { orders: /Premium|مميّز/ },
  premium: {},
  custom: {},
}

/** The three sections a package can close, with the title their locked page shows. */
const SECTIONS = [
  {
    key: 'analytics',
    en: 'Analytics',
    ar: 'الإحصاءات',
    locked: startsWith('See how guests use your menu', 'اعرف كيف يستخدم الضيوف قائمتك'),
  },
  {
    key: 'appearance',
    en: 'Appearance',
    ar: 'المظهر',
    locked: startsWith('Make the menu look like yours', 'اجعل القائمة تشبهك'),
  },
  {
    key: 'orders',
    en: 'Orders',
    ar: 'الطلبات',
    locked: startsWith('Take orders from the menu', 'استقبل الطلبات من القائمة'),
  },
] as const

test.describe('packages: what each package opens', () => {
  for (const slug of ['free', 'pro', 'premium', 'custom'] as const) {
    test(`${slug}: sidebar chips and locked pages @matrix`, async ({ page, owner }) => {
      await owner({ package: slug })
      await page.goto('/overview')

      const nav = await sidebar(page)
      await Promise.all(
        SECTIONS.map(async (section) => {
          const chip = LOCKS[slug][section.key]
          const item = row(nav, section.en, section.ar)
          await expect(item).toBeVisible()
          await (chip
            ? expect(item).toContainText(chip)
            : expect(item).toHaveAccessibleName(either(section.en, section.ar)))
        }),
      )

      await inOrder(SECTIONS, async (section) => {
        await page.goto(`/${section.key}`)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          either(section.en, section.ar),
        )
        // The plan comes with the session, which the heading already waited
        // for, so the locked page is either there now or not at all.
        const locked = page.getByRole('heading', { name: section.locked })
        if (LOCKS[slug][section.key]) {
          await expect(locked).toBeVisible()
          await expect(page.getByRole('button', { name: LOCKED_BUTTON })).toBeVisible()
        } else {
          await expect(locked).toHaveCount(0)
        }
      })
    })
  }

  test('a locked page names its package and leads to the Package page', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/orders')

    await expect(page.getByText('Take orders from the menu')).toBeVisible()
    await expect(page.getByText(/Comes with the Premium package/)).toBeVisible()
    await page.getByRole('button', { name: 'See packages' }).click()
    await expect(page).toHaveURL(/\/package$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Package')
  })
})

test.describe('packages: the Package page', () => {
  test('the default package runs forever', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/package')

    await expect(page.getByText('Yours for as long as you like.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Free package. Open your package.' }),
    ).toBeVisible()
  })

  test('a paid package with no end has no end date', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/package')

    await expect(page.getByText('No end date.')).toBeVisible()
    await expect(page.getByText('Yours for as long as you like.')).toHaveCount(0)
  })

  test('ending soon warns, offers to extend, and marks the topbar pill', async ({
    page,
    owner,
  }) => {
    const endsAt = daysFromNow(3)
    await owner({ package: 'pro', package_ends_at: endsAt })
    await page.goto('/package')

    await expect(page.getByText(`Until ${shortDate(endsAt)}`)).toBeVisible()
    await expect(page.getByText('3 days left')).toBeVisible()
    await expect(
      page.getByText('Ending soon. Ask us to extend it so nothing switches off.'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Pro package, ending soon. Open your package.' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Ask to extend' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ask about Pro' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
  })

  test('a package with an end date shows the days left, without a warning', async ({
    page,
    owner,
  }) => {
    const endsAt = daysFromNow(60)
    await owner({ package: 'premium', package_ends_at: endsAt })
    await page.goto('/package')

    await expect(page.getByText(`Until ${shortDate(endsAt)}`)).toBeVisible()
    await expect(page.getByText('60 days left')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask to extend' })).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Premium package. Open your package.' }),
    ).toBeVisible()
  })

  test('a lapsed package offers to renew and the owner is back on Free', async ({
    page,
    owner,
  }) => {
    const endedAt = daysFromNow(-1)
    await owner({ package: 'pro', package_starts_at: daysFromNow(-60), package_ends_at: endedAt })
    await page.goto('/package')

    await expect(page.getByText(`Your Pro package ended on ${shortDate(endedAt)}`)).toBeVisible()
    await expect(
      page.getByText('You are on Free now. Everything you made is kept and comes back with Pro.'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Free package. Open your package.' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Ask to renew' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ask about Pro' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // Pro's sections leave the sidebar again.
    const nav = await sidebar(page)
    await expect(row(nav, 'Analytics', 'الإحصاءات')).toHaveCount(0)
    await expect(row(nav, 'Appearance', 'المظهر')).toHaveCount(0)
    await page.goto('/analytics')
    await expect(page.getByRole('button', { name: 'See packages' })).toBeVisible()
  })

  test('an upcoming package is announced while Free is in force', async ({ page, owner }) => {
    const startsAt = daysFromNow(3)
    await owner({ package: 'premium', package_starts_at: startsAt })
    await page.goto('/package')

    await expect(page.getByText(`Premium starts on ${shortDate(startsAt)}.`)).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Free package. Open your package.' }),
    ).toBeVisible()
    const nav = await sidebar(page)
    await expect(row(nav, 'Orders', 'الطلبات')).toHaveCount(0)
  })

  test('the cards: popular, what each adds, and who can ask', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/package')

    const card = (name: string) =>
      page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })

    await expect(page.getByRole('article')).toHaveCount(4)
    await expect(card('Premium')).toContainText('Most popular')
    await expect(card('Pro')).not.toContainText('Most popular')
    await expect(card('Free')).not.toContainText('Most popular')
    await expect(card('Free')).toContainText('Includes:')
    await expect(card('Pro')).toContainText('Everything in Free, plus:')
    await expect(card('Premium')).toContainText('Everything in Pro, plus:')
    await expect(card('Pro')).toContainText('150 dishes')
    await expect(card('Custom')).toContainText("Let's talk")

    await expect(card('Free').getByRole('button', { name: 'Your package' })).toBeDisabled()
    await expect(card('Pro').getByRole('button', { name: 'Request this package' })).toBeEnabled()
    await expect(card('Custom').getByRole('button', { name: 'Talk to us' })).toBeEnabled()
  })

  test('the comparison table reads every package side by side', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/package')

    const table = page.getByRole('table')
    await expect(table.locator('thead').getByRole('columnheader')).toHaveText([
      'Feature',
      'Free',
      /^ProYours$/,
      'Premium',
      'Custom',
    ])

    const cells = (name: string) =>
      table.getByRole('row', { name: new RegExp(`^${name}\\b`) }).getByRole('cell')
    // Premium's dishes and categories read unlimited (1,000 each is fair use).
    await expect(cells('Dishes')).toHaveText(['40', '150', 'Unlimited', 'Unlimited'])
    await expect(cells('Categories')).toHaveText(['8', '15', 'Unlimited', 'Unlimited'])
    await expect(cells('Social links')).toHaveText(['1', '2', '10', 'Unlimited'])
    await expect(cells('Orders on WhatsApp')).toHaveText([
      'Not included',
      'Not included',
      'Included',
      'Included',
    ])
    await expect(cells('Analytics')).toHaveText([
      'Not included',
      'Included',
      'Included',
      'Included',
    ])
  })

  test('requesting a package sends a note the admin reads', async ({ page, owner, signIn }) => {
    const created = await owner({ package: 'free' })
    const note = `Two branches, about 90 dishes (${created.user.email})`
    await page.goto('/package')

    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Pro', exact: true }) })
      .getByRole('button', { name: 'Request this package' })
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ask about Pro' })).toBeVisible()
    await dialog.getByLabel(/Anything we should know\?/).fill(note)
    await dialog.getByRole('button', { name: 'Send request' }).click()

    await expect(page.getByText('Request sent')).toBeVisible()
    await expect(dialog).toBeHidden()

    // A fresh session for the admin, as on another browser.
    await page.context().clearCookies()
    await signIn('admin@e2e.test')
    await page.goto(`${ADMIN_URL}/contact-messages`)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    await expect(message).toContainText('Pro')
    await expect(message).toContainText('Two branches, about 90 dishes')
  })
})

test.describe('packages: moving down and back up', () => {
  test('limits hold in the API after a downgrade, and nothing is deleted', async ({
    page,
    owner,
    setPackage,
  }) => {
    const categories = Array.from({ length: 10 }, (_, index) => ({
      name: { en: `Section ${index + 1}` },
    }))
    const created = await owner({ package: 'premium', categories })
    await setPackage(created.restaurant.id, { package: 'free' })

    await page.goto('/categories')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Categories')
    await expect(page.getByText('Section 10', { exact: true })).toBeVisible()
    await expect(page.getByText('Section 1', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add category' })).toBeDisabled()
    await expect(
      page.getByText('You have used every category your plan allows. Delete one to add another.'),
    ).toBeVisible()

    // The server refuses too, whatever the page shows.
    const request = page.context().request
    const csrf = (await (await request.get(`${API_URL}/api/csrf-token`)).json()) as {
      token?: string
      csrf_token?: string
    }
    const response = await request.post(`${API_URL}/api/categories`, {
      data: { name: { en: 'One too many' } },
      headers: {
        Accept: 'application/json',
        Origin: 'http://127.0.0.1:5174',
        Referer: 'http://127.0.0.1:5174/',
        'X-CSRF-TOKEN': csrf.token ?? csrf.csrf_token ?? '',
      },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)

    await page.reload()
    await expect(page.getByText('Section 10', { exact: true })).toBeVisible()
    await expect(page.getByText('One too many')).toHaveCount(0)
  })

  test('premium → free locks everything premium gave, and back restores it', async ({
    page,
    owner,
    setPackage,
  }) => {
    // Three rounds of the dashboard and the public menu.
    test.slow()
    const created = await owner({
      package: 'premium',
      template: 'midnight',
      second_locale: 'ar',
      settings: { primary_color: '#AA3355' },
      categories: [
        {
          name: { en: 'Grills', ar: 'مشاوي' },
          dishes: [{ name: { en: 'Kafta', ar: 'كفتة' }, price: 12 }],
        },
      ],
    })
    const menu = await page.context().newPage()

    const expectPremium = async () => {
      await page.goto('/overview')
      const nav = await sidebar(page)
      await Promise.all(
        SECTIONS.map((section) =>
          expect(row(nav, section.en, section.ar)).toHaveAccessibleName(section.en),
        ),
      )
      await page.goto('/orders')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orders')
      await expect(page.getByRole('heading', { name: SECTIONS[2].locked })).toHaveCount(0)
      await page.goto('/design')
      await expect(page.getByText('Currently in use')).toBeVisible()
      await expect(page.getByText('Your menu shows another design for now')).toHaveCount(0)

      await menu.goto(created.restaurant.public_url)
      await expect(menu.getByText('Kafta')).toBeVisible()
      await expect(menu.locator('link[hreflang="ar"]')).toHaveCount(1)
      await expect(menu.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#AA3355')
      // The cart's button sits in the phone header; the desktop shows its panel.
      await expect(menu.locator('[data-open-cart]')).toHaveCount(1)
    }

    await expectPremium()

    await setPackage(created.restaurant.id, { package: 'free' })
    await page.reload()

    const nav = await sidebar(page)
    // The sections Free lacks leave the sidebar; a link still opens their page.
    await expect(row(nav, 'Analytics', 'الإحصاءات')).toHaveCount(0)
    await expect(row(nav, 'Appearance', 'المظهر')).toHaveCount(0)
    await expect(row(nav, 'Orders', 'الطلبات')).toHaveCount(0)
    await inOrder(SECTIONS, async (section) => {
      await page.goto(`/${section.key}`)
      await expect(page.getByRole('heading', { name: section.locked })).toBeVisible()
    })
    await page.goto('/design')
    await expect(page.getByText('Your menu shows another design for now')).toBeVisible()
    await expect(
      page.getByText(/Midnight needs a package with premium designs, so your menu uses Classic/),
    ).toBeVisible()

    await menu.goto(created.restaurant.public_url)
    await expect(menu.getByText('Kafta')).toBeVisible()
    // English only, Classic's own colour (not Midnight's, not the owner's), no cart.
    await expect(menu.locator('link[hreflang="ar"]')).toHaveCount(0)
    await expect(menu.getByRole('button', { name: 'Language' })).toHaveCount(0)
    await expect(menu.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F8D38D')
    await expect(menu.locator('[data-open-cart]')).toHaveCount(0)
    await menu.goto(`${created.restaurant.public_url}?lang=ar`)
    await expect(menu.locator('html')).toHaveAttribute('lang', 'en')
    await expect(menu.getByText('Kafta')).toBeVisible()

    await setPackage(created.restaurant.id, { package: 'premium' })
    await expectPremium()
    await menu.close()
  })
})
