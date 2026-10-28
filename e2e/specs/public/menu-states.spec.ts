import type { Page } from '@playwright/test'
import { daysFromNow, expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi } from '../../support/helpers'
import { API_URL, DASHBOARD_URL } from '../../support/urls'

/**
 * The menu's states a guest may land on: a menu still empty, a category
 * whose dishes are all sold out, a package ended (online in its grace days,
 * then offline, though the owner may still preview), lunch and dinner
 * shifts, a table's QR code, a long menu's far tabs, and what search
 * engines and sharing read from the head.
 */

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Starters' },
    description: { en: 'Cold and hot mezze.' },
    dishes: [
      { name: { en: 'Hummus' }, price: 6, ingredients: { en: 'Chickpeas, tahini' } },
      { name: { en: 'Fattoush' }, price: 7.5 },
    ],
  },
  {
    name: { en: 'Specials' },
    dishes: [{ name: { en: 'Secret mansaf' }, price: 20, is_available: false }],
  },
]

function dish(page: Page, name: string) {
  return page.locator('article.dish', { hasText: name })
}

async function classicId(page: Page): Promise<number> {
  const response = await page.request.get(`${API_URL}/api/templates`, {
    headers: { Accept: 'application/json', Referer: `${DASHBOARD_URL}/` },
  })
  const designs = (await response.json()) as { data: { id: number; slug: string }[] }
  return designs.data.find((design) => design.slug === 'classic')!.id
}

test.describe('a menu with little or nothing on it', () => {
  test('an empty menu says it is being prepared, offers no search, and asks not to be indexed @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: [{ name: { en: 'Soon' }, dishes: [] }] })
    const response = await page.goto(owner.restaurant.public_url)
    expect(response?.status()).toBe(200)

    await expect(page.getByText('This menu is still being prepared.')).toBeVisible()
    await expect(page.locator('[data-menu-search]')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Categories' })).toHaveCount(0)
    await expect(page.getByText('Nothing on the menu matches that.')).toBeHidden()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
    // The credit and the way to share it are still there.
    await expect(page.locator('.menu-credit')).toHaveText('Menu by Qayema')
  })

  test('a category whose dishes are all sold out leaves the menu, tab and heading', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: MENU })
    await page.goto(owner.restaurant.public_url)

    const tabs = page.getByRole('navigation', { name: 'Categories' })
    await expect(tabs.getByRole('button')).toHaveText(['All', 'Starters'])
    await expect(page.getByRole('heading', { name: 'Specials' })).toHaveCount(0)
    await expect(page.getByText('Secret mansaf')).toHaveCount(0)
    // Nor is it in what search engines read.
    const schema = await page.locator('script[type="application/ld+json"]').textContent()
    expect(schema).not.toContain('Secret mansaf')
  })
})

test.describe('a package that ended', () => {
  test('the menu stays online in the grace days, then is not found for guests', async ({
    page,
    scenario,
  }) => {
    const inGrace = await scenario({
      package: 'pro',
      package_starts_at: daysFromNow(-40),
      package_ends_at: daysFromNow(-1),
      categories: MENU,
    })
    const offline = await scenario({
      package: 'pro',
      package_starts_at: daysFromNow(-40),
      package_ends_at: daysFromNow(-5),
      categories: MENU,
    })

    expect((await page.goto(inGrace.restaurant.public_url))?.status()).toBe(200)
    await expect(dish(page, 'Hummus')).toBeVisible()

    expect((await page.goto(offline.restaurant.public_url))?.status()).toBe(404)
    // Its QR code's address, a language, and the QR pop-up's data are gone too.
    expect((await page.goto(`${offline.restaurant.public_url}?qr=1`))?.status()).toBe(404)
    const options = await page.request.get(`${offline.restaurant.public_url}/qr-options`)
    expect(options.status()).toBe(404)
  })

  test('the owner can still preview an offline menu', async ({ page, owner, browser }) => {
    const restaurant = await owner({
      package: 'pro',
      package_starts_at: daysFromNow(-40),
      package_ends_at: daysFromNow(-5),
      categories: MENU,
    })
    const preview = `${restaurant.restaurant.public_url}?preview=${await classicId(page)}`

    expect((await page.goto(preview))?.status()).toBe(200)
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')

    const guest = await browser.newPage()
    try {
      expect((await guest.goto(preview))?.status()).toBe(404)
    } finally {
      await guest.close()
    }
  })
})

test.describe('opening hours with shifts', () => {
  test('lunch and dinner both show, and the menu is closed between them', async ({
    page,
    scenario,
  }) => {
    // 12 October 2026 is a Monday; Beirut is UTC+3.
    const owner = await scenario({
      categories: MENU,
      opening_hours: {
        mon: [
          { open: '12:00', close: '15:00' },
          { open: '18:00', close: '23:00' },
        ],
      },
    })
    const label = page.locator('.facts-row [data-hours-label]')
    const value = page.locator('.facts-row [data-hours-value]')
    const at = async (utc: string) => {
      await page.clock.setFixedTime(new Date(utc))
      await page.goto(owner.restaurant.public_url)
    }

    await at('2026-10-12T10:00:00Z')
    await expect(label).toHaveText('Open now')
    await expect(value).toHaveText('12:00 - 15:00, 18:00 - 23:00')

    // 16:30, between the two.
    await at('2026-10-12T13:30:00Z')
    await expect(label).toHaveText('Closed now')
    await expect(value).toHaveText('12:00 - 15:00, 18:00 - 23:00')

    // 19:00, dinner.
    await at('2026-10-12T16:00:00Z')
    await expect(label).toHaveText('Open now')

    // A menu left open turns at the minute: dinner ends at 23:00.
    await page.clock.setFixedTime(new Date('2026-10-12T20:01:00Z'))
    await page.clock.runFor(61_000)
    await expect(label).toHaveText('Closed now')

    // The search data has one opening per shift.
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    ) as { openingHoursSpecification: { dayOfWeek: string; opens: string; closes: string }[] }
    expect(schema.openingHoursSpecification).toEqual([
      expect.objectContaining({ dayOfWeek: 'Monday', opens: '12:00', closes: '15:00' }),
      expect.objectContaining({ dayOfWeek: 'Monday', opens: '18:00', closes: '23:00' }),
    ])
  })
})

test.describe('a table’s QR code', () => {
  test('the menu says which table, on a phone and in the header', async ({
    page,
    owner,
    browser,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: MENU })
    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace 4'] })
    const table = ((await created.json()) as { data: { code: string; url: string }[] }).data[0]!

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const guest = await context.newPage()
    try {
      await guest.goto(table.url)
      await expect(guest.locator('.info')).toContainText('Your table')
      await expect(guest.locator('.info')).toContainText('Terrace 4')

      await guest.setViewportSize({ width: 1440, height: 900 })
      await expect(guest.locator('.facts-row')).toContainText('Terrace 4')
    } finally {
      await context.close()
    }
  })

  test('a menu that takes no table orders ignores the table in its address', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'free', categories: MENU })
    await page.goto(`${owner.restaurant.public_url}?table=ABCDEFGH`)

    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(page.getByText('Your table')).toHaveCount(0)
  })
})

test.describe('a long menu', () => {
  test('a tab far along the row opens its section under the pill, and All brings every section back', async ({
    page,
    scenario,
  }) => {
    const categories = Array.from({ length: 14 }, (_, i) => ({
      name: { en: `Section ${i + 1}` },
      dishes: Array.from({ length: 4 }, (_plate, j) => ({
        name: { en: `Plate ${i + 1}.${j + 1}` },
        price: 5 + j,
      })),
    }))
    const owner = await scenario({ categories })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(owner.restaurant.public_url)

    const row = page.locator('.tabs-inner')
    const last = row.getByRole('button', { name: 'Section 14' })
    await last.click()
    await expect(last).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('article.dish:visible')).toHaveCount(4)
    await expect(dish(page, 'Plate 14.1')).toBeInViewport()
    // The pill sits under the chosen tab.
    await expect
      .poll(async () => {
        const [pill, tab] = await Promise.all([
          page.locator('.tab-pill').boundingBox(),
          last.boundingBox(),
        ])
        return Math.round(Math.abs((pill?.x ?? 0) - (tab?.x ?? 0)))
      })
      .toBe(0)

    // Back to All: every section.
    const all = row.getByRole('button', { name: 'All' })
    await all.click()
    await expect(page.locator('section.category:visible')).toHaveCount(14)
  })
})

test.describe('what search engines and sharing read', () => {
  test('the head names the menu, its dishes and prices, and the cover picture', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      name: { en: 'Beit Beirut' },
      description: { en: 'Grills and mezze since 1987.' },
      cover: true,
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/beit-beirut' }],
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)

    await expect(page).toHaveTitle('Beit Beirut: menu and prices')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Grills and mezze since 1987.',
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow, max-image-preview:large',
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Beit Beirut: menu and prices',
    )
    // The cover is the sharing picture, and the page's first picture is never lazy.
    const cover = page.locator('img.cover-photo')
    await expect(cover).toHaveAttribute('fetchpriority', 'high')
    await expect(cover).not.toHaveAttribute('loading', 'lazy')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      (await cover.getAttribute('src')) ?? '',
    )

    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    ) as Record<string, unknown> & {
      hasMenu: { hasMenuSection: { name: string; hasMenuItem: Record<string, unknown>[] }[] }
    }
    expect(schema['@type']).toBe('Restaurant')
    expect(schema.name).toBe('Beit Beirut')
    expect(schema.telephone).toBe('+96170123456')
    expect(schema.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 33.8938, longitude: 35.5018 })
    expect(schema.sameAs).toEqual(['https://instagram.com/beit-beirut'])
    expect(schema.hasMenu.hasMenuSection).toHaveLength(1)
    expect(schema.hasMenu.hasMenuSection[0]!.hasMenuItem).toEqual([
      expect.objectContaining({
        name: 'Hummus',
        description: 'Chickpeas, tahini',
        offers: { '@type': 'Offer', price: '6.00', priceCurrency: 'USD' },
      }),
      expect.objectContaining({
        name: 'Fattoush',
        offers: { '@type': 'Offer', price: '7.50', priceCurrency: 'USD' },
      }),
    ])
  })
})
