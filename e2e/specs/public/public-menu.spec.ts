import type { Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { API_URL, DASHBOARD_URL } from '../../support/urls'

/** Classic's accent, and the one the premium Midnight design declares (E2eSeeder). */
const CLASSIC_ACCENT = '#F8D38D'
const MIDNIGHT_ACCENT = '#1F6FEB'

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Starters', ar: 'المقبلات' },
    dishes: [
      { name: { en: 'Hummus', ar: 'حمص' }, price: 6, ingredients: { en: 'Chickpeas, tahini' } },
      { name: { en: 'Fattoush', ar: 'فتوش' }, price: 7 },
      { name: { en: 'Secret special', ar: 'طبق سري' }, price: 99, is_available: false },
    ],
  },
  {
    name: { en: 'Mains', ar: 'الأطباق الرئيسية' },
    dishes: [{ name: { en: 'Kafta', ar: 'كفتة' }, price: 12 }],
  },
  // A category with nothing in it has nothing to show.
  { name: { en: 'Desserts', ar: 'الحلويات' }, dishes: [] },
]

function dish(page: Page, name: string) {
  return page.locator('article.dish', { hasText: name })
}

/** The search box the current layout shows (header on desktop, under the cover on a phone). */
function searchBox(page: Page) {
  return page.locator('[data-menu-search]:visible')
}

async function accent(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toUpperCase(),
  )
}

/** The dashboard API, as the signed-in owner's dashboard calls it. */
async function api<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(`${API_URL}${path}`, {
    headers: { Accept: 'application/json', Referer: `${DASHBOARD_URL}/` },
  })
  expect(response.ok(), `${path}: ${response.status()}`).toBeTruthy()
  return (await response.json()) as T
}

test.describe('public menu', () => {
  test('shows the restaurant, its categories and the dishes guests can order @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ name: { en: 'Beit Beirut' }, categories: MENU })

    const response = await page.goto(owner.restaurant.public_url)
    expect(response?.status()).toBe(200)

    await expect(page).toHaveTitle('Beit Beirut: menu and prices')
    await expect(page.getByRole('heading', { level: 1, name: 'Beit Beirut' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Starters' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Mains' })).toBeAttached()
    await expect(dish(page, 'Hummus')).toContainText('$6')
    await expect(dish(page, 'Hummus')).toContainText('Chickpeas, tahini')
    await expect(dish(page, 'Fattoush')).toBeVisible()
    await expect(dish(page, 'Kafta')).toContainText('$12')

    // An unavailable dish and an empty category are not on the menu at all.
    await expect(page.getByText('Secret special')).toHaveCount(0)
    const tabs = page.getByRole('navigation', { name: 'Categories' })
    await expect(tabs.getByRole('button')).toHaveText(['All', 'Starters', 'Mains'])

    // A guest can find a dish by typing.
    await searchBox(page).fill('kaf')
    await expect(dish(page, 'Kafta')).toBeVisible()
    await expect(dish(page, 'Hummus')).toBeHidden()
  })

  test('a category tab shows only that category, and All brings the rest back', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: MENU })
    await page.goto(owner.restaurant.public_url)
    const tabs = page.getByRole('navigation', { name: 'Categories' })

    await tabs.getByRole('button', { name: 'Mains' }).click()
    await expect(tabs.getByRole('button', { name: 'Mains' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(tabs.getByRole('button', { name: 'All' })).toHaveAttribute('aria-current', 'false')
    await expect(dish(page, 'Kafta')).toBeVisible()
    await expect(dish(page, 'Hummus')).toBeHidden()
    await expect(page.getByRole('heading', { level: 2, name: 'Starters' })).toBeHidden()

    await tabs.getByRole('button', { name: 'All' }).click()
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(dish(page, 'Kafta')).toBeVisible()
  })

  test('search finds dishes by name or ingredient, and says when nothing matches', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: MENU })
    await page.goto(owner.restaurant.public_url)
    const noResults = page.getByText('Nothing on the menu matches that.')

    await expect(noResults).toBeHidden()

    await searchBox(page).fill('TAHINI')
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(dish(page, 'Fattoush')).toBeHidden()
    await expect(dish(page, 'Kafta')).toBeHidden()

    await searchBox(page).fill('shawarma')
    await expect(noResults).toBeVisible()
    await expect(page.locator('article.dish:visible')).toHaveCount(0)

    await searchBox(page).fill('')
    await expect(noResults).toBeHidden()
    await expect(page.locator('article.dish:visible')).toHaveCount(3)
  })

  test('a two-language menu switches to Arabic, right to left', async ({ page, scenario }) => {
    const owner = await scenario({
      package: 'pro',
      second_locale: 'ar',
      name: { en: 'Cedar Grill', ar: 'مشاوي الأرز' },
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await page.getByRole('button', { name: 'Language' }).click()
    await page.locator('#pop-lang a[lang="ar"]').click()

    await expect(page).toHaveURL(`${owner.restaurant.public_url}?lang=ar`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('heading', { level: 1, name: 'مشاوي الأرز' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'المقبلات' })).toBeVisible()
    await expect(dish(page, 'حمص')).toBeVisible()
    await expect(page.getByText('Hummus')).toHaveCount(0)
    await expect(searchBox(page)).toHaveAttribute('placeholder', 'ابحث في القائمة')

    // And back to English.
    await page.getByRole('button', { name: 'اللغة' }).click()
    await page.locator('#pop-lang a[lang="en"]').click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(dish(page, 'Hummus')).toBeVisible()
  })

  test('the menu reports its own visit once, and a language switch is not a second one', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })
    const events = `${owner.restaurant.public_url}/events`
    const sent = () =>
      page.waitForRequest((request) => request.url() === events && request.method() === 'POST')

    // A QR scan: the visit goes out on its own a moment after the page opens,
    // with the menu token and the browser's anonymous id.
    const first = sent()
    await page.goto(`${owner.restaurant.public_url}?qr=1`)
    const visit = await first
    const body = visit.postDataJSON() as {
      visitor: string
      visit?: { qr: boolean; locale: string }
    }
    expect(body.visitor).toMatch(/^[a-f0-9]{32}$/)
    expect(body.visit).toEqual({ locale: 'en', qr: true })
    expect(visit.headers()['x-menu-token']).toMatch(/^\d+\.[a-f0-9]{64}$/)
    expect((await visit.response())?.status()).toBe(204)

    // Switching to Arabic sends the tap; the page it opens counts no visit.
    const tap = sent()
    await page.getByRole('button', { name: 'Language' }).click()
    await page.locator('#pop-lang a[lang="ar"]').click()
    expect((await tap).postDataJSON()).toMatchObject({
      visitor: body.visitor,
      events: [{ type: 'language' }],
    })
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

    const next = sent()
    await page.evaluate(() =>
      document.dispatchEvent(new CustomEvent('qayema:track', { detail: { type: 'map' } })),
    )
    const after = (await next).postDataJSON() as Record<string, unknown>
    expect(after.visit).toBeUndefined()
    expect(after.visitor).toBe(body.visitor)
  })

  test("a browser's anonymous id is kept, and made anew after 13 months", async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', categories: MENU })
    const events = `${owner.restaurant.public_url}/events`
    const visitorSent = async () => {
      const request = await page.waitForRequest((r) => r.url() === events && r.method() === 'POST')
      return (request.postDataJSON() as { visitor: string }).visitor
    }
    const keep = (id: string, daysAgo: number) =>
      page.evaluate(
        ([value, days]) => {
          const day = Math.floor(Date.now() / 86400000) - Number(days)
          localStorage.setItem('qayema-visitor', `${value}.${day}`)
        },
        [id, daysAgo] as const,
      )
    const recent = 'a'.repeat(32)

    await page.goto(owner.restaurant.public_url)
    await keep(recent, 394)
    const sameVisitor = visitorSent()
    await page.reload()
    expect(await sameVisitor).toBe(recent)

    await keep(recent, 395)
    const newVisitor = visitorSent()
    await page.reload()
    const fresh = await newVisitor
    expect(fresh).toMatch(/^[a-f0-9]{32}$/)
    expect(fresh).not.toBe(recent)
    expect(await page.evaluate(() => localStorage.getItem('qayema-visitor'))).toMatch(
      new RegExp(`^${fresh}\\.\\d+$`),
    )
  })

  test('an English-only menu on Free has no language switcher, even with Arabic written', async ({
    page,
    scenario,
  }) => {
    // Free has no multiple languages, so the Arabic names wait unused.
    const owner = await scenario({ package: 'free', second_locale: 'ar', categories: MENU })

    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Language' })).toHaveCount(0)
    await expect(page.locator('#pop-lang')).toHaveCount(0)
  })

  test("open or closed is the phone's own clock, so a cached page is never wrong", async ({
    page,
    scenario,
  }) => {
    // Beirut is UTC+3 in October; 12 October 2026 is a Monday.
    const owner = await scenario({
      categories: MENU,
      opening_hours: {
        mon: { open: '12:00', close: '15:00' },
        tue: { open: '18:00', close: '01:00' },
        wed: null,
      },
    })
    const label = page.locator('[data-hours-label]').first()
    const value = page.locator('[data-hours-value]').first()
    const at = async (utc: string) => {
      await page.clock.setFixedTime(new Date(utc))
      await page.goto(owner.restaurant.public_url)
    }

    // Monday 10:00 in Beirut, before lunch.
    await at('2026-10-12T07:00:00Z')
    await expect(label).toHaveText('Closed now')
    await expect(label).toHaveClass(/fact-shut/)
    await expect(value).toHaveText('12:00 - 15:00')

    // Monday 13:00, during it.
    await at('2026-10-12T10:00:00Z')
    await expect(label).toHaveText('Open now')
    await expect(label).toHaveClass(/fact-open/)

    // Wednesday 00:30: Tuesday's shift runs past midnight and is still
    // going, so it is the one shown, never "Closed today" beside "Open now".
    await at('2026-10-13T21:30:00Z')
    await expect(label).toHaveText('Open now')
    await expect(value).toHaveText('18:00 - 01:00')

    // Wednesday 02:00: that shift is over, and Wednesday has none.
    await at('2026-10-13T23:00:00Z')
    await expect(label).toHaveText('Closed now')
    await expect(value).toHaveText('Closed today')
  })

  test('ordering in the menu waits for the opening hours on the same clock', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      categories: MENU,
      opening_hours: { mon: { open: '12:00', close: '15:00' } },
    })
    const cart = page.locator('aside.col-aside')
    const at = async (utc: string) => {
      await page.clock.setFixedTime(new Date(utc))
      await page.goto(restaurant.restaurant.public_url)
    }

    // Monday 10:00 in Beirut: the cart keeps what was picked and says why it waits.
    await at('2026-10-12T07:00:00Z')
    await dish(page, 'Hummus').getByRole('button', { name: 'Add Hummus' }).click()
    await expect(cart).toContainText('We are closed right now. Ordering opens again when we do.')

    // Monday 13:00, the same cart (kept in the phone): open.
    await at('2026-10-12T10:00:00Z')
    await expect(cart).toContainText('Hummus')
    await expect(cart).not.toContainText('We are closed right now.')
    await expect(cart.getByRole('button', { name: /Place order/ })).toBeEnabled()
  })

  test('opening hours, phone, map and social links show when the owner set them', async ({
    page,
    scenario,
  }) => {
    // A range that ends before it starts runs past midnight: open around the clock.
    const allDay = { open: '06:00', close: '05:59' }
    const owner = await scenario({
      categories: MENU,
      phone: '+96171234567',
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      opening_hours: {
        mon: allDay,
        tue: allDay,
        wed: allDay,
        thu: allDay,
        fri: allDay,
        sat: allDay,
        sun: allDay,
      },
      social_links: [
        { platform: 'instagram', url: 'https://instagram.com/e2e-kitchen' },
        { platform: 'facebook', url: 'https://facebook.com/e2e-kitchen' },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const facts = page.locator('.facts-row')
    await expect(facts).toContainText('Open now')
    await expect(facts).toContainText('06:00 - 05:59')
    await expect(facts.getByRole('link', { name: /\+96171234567/ })).toHaveAttribute(
      'href',
      'tel:+96171234567',
    )
    await expect(facts.getByRole('link', { name: /Find us/ })).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=33.8938,35.5018',
    )

    await page.getByRole('button', { name: 'WhatsApp' }).click()
    const contact = page.locator('#pop-contact')
    await expect(contact.getByRole('link', { name: 'Open WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/96171234567',
    )
    await expect(contact.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/e2e-kitchen',
    )
    await expect(contact.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://facebook.com/e2e-kitchen',
    )
    await contact.getByRole('button', { name: 'Close' }).click()
    await expect(contact).toBeHidden()
  })

  test('without hours, map or links, none of them are shown', async ({ page, scenario }) => {
    const owner = await scenario({ categories: MENU })
    await page.goto(owner.restaurant.public_url)

    await expect(page.getByText('Open now')).toHaveCount(0)
    await expect(page.getByText('Find us')).toHaveCount(0)
    await expect(page.locator('#pop-map')).toHaveCount(0)
    // The phone is always there: it is required during setup.
    await expect(page.locator('.facts-row a[href^="tel:"]')).toBeVisible()
  })

  test('the Share pop-up draws the menu QR code (phone)', async ({ page, scenario }) => {
    const owner = await scenario({ categories: MENU })
    // The dock that carries Share is the phone layout.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(owner.restaurant.public_url)

    await page.getByRole('button', { name: 'Share menu' }).click()

    const pop = page.locator('#pop-qr')
    await expect(pop.getByRole('heading', { name: 'Scan to open this menu' })).toBeVisible()
    await expect(pop.locator('[data-qr-canvas] svg, [data-qr-canvas] canvas').first()).toBeVisible()
    await expect(pop).toContainText(owner.restaurant.public_url)
    await pop.getByRole('button', { name: 'Close' }).click()
    await expect(pop).toBeHidden()
  })

  test('the QR code is ready before the guest asks for it', async ({ page, scenario }) => {
    const owner = await scenario({ categories: MENU })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(owner.restaurant.public_url)

    // Drawn in the closed pop-up once the menu has loaded, with no tap.
    const code = page.locator('#pop-qr [data-qr-canvas] svg')
    await expect(code).toBeAttached()

    // So the tap asks the server for nothing more.
    let fetched = 0
    page.on('request', (request) => {
      if (/qr-options|qr-code-styling/.test(request.url())) fetched++
    })
    await page.locator('.topbar').getByRole('button', { name: 'Share menu' }).click()
    await expect(code).toBeVisible()
    expect(fetched).toBe(0)
  })

  test('on a wide screen the header opens the same QR pop-up', async ({ page, scenario }) => {
    const owner = await scenario({ categories: MENU })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(owner.restaurant.public_url)

    // The dock is hidden here; the header button is the only way in.
    await expect(page.locator('.dock')).toBeHidden()
    await page.locator('.topbar').getByRole('button', { name: 'Share menu' }).click()

    const pop = page.locator('#pop-qr')
    await expect(pop.getByRole('heading', { name: 'Scan to open this menu' })).toBeVisible()
    await expect(pop.locator('[data-qr-canvas] svg, [data-qr-canvas] canvas').first()).toBeVisible()
    await pop.getByRole('button', { name: 'Close' }).click()
    await expect(pop).toBeHidden()
  })

  test('a Premium guest builds a cart and sends the order, with a note, on WhatsApp', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: MENU })
    await page.goto(restaurant.restaurant.public_url)
    const cart = page.locator('aside.col-aside')
    const total = cart.locator('.cart-total')

    await expect(cart).toContainText('Nothing added yet.')

    await dish(page, 'Hummus').getByRole('button', { name: 'Add Hummus' }).click()
    await expect(dish(page, 'Hummus').locator('output')).toHaveText('1')
    await expect(total).toHaveText('Total$6')

    await dish(page, 'Hummus').getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dish(page, 'Hummus').locator('output')).toHaveText('2')
    await expect(total).toHaveText('Total$12')

    await dish(page, 'Kafta').getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).toContainText('3 items')
    await expect(total).toHaveText('Total$24')

    // Stepping down in the cart itself, then down to nothing removes the line.
    const hummusLine = cart.locator('.cart-line', { hasText: 'Hummus' })
    await hummusLine.getByRole('button', { name: 'Remove' }).click()
    await expect(hummusLine.locator('output')).toHaveText('1')
    await expect(total).toHaveText('Total$18')
    await hummusLine.getByRole('button', { name: 'Remove' }).click()
    await expect(cart.locator('.cart-line', { hasText: 'Hummus' })).toHaveCount(0)
    await expect(dish(page, 'Hummus').getByRole('button', { name: 'Add Hummus' })).toBeVisible()
    await expect(total).toHaveText('Total$12')

    await dish(page, 'Fattoush').getByRole('button', { name: 'Add Fattoush' }).click()
    await expect(total).toHaveText('Total$19')

    // On WhatsApp the cart asks only for a note, which goes into the message.
    await expect(cart.getByLabel('Phone number')).toHaveCount(0)
    await cart.getByLabel(/Note for the restaurant/).fill('Extra lemon')

    // WhatsApp is the hand-off; it is stood in for so nothing leaves the machine.
    await page.route('https://wa.me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }),
    )
    await cart.getByRole('button', { name: /Place order/ }).click()

    await expect(page).toHaveURL(/^https:\/\/wa\.me\/96170123456\?text=/)
    const text = new URL(page.url()).searchParams.get('text') ?? ''
    // The owner's copy, in WhatsApp's bold (WhatsAppLink::message in ../qayema).
    const lines = text.split('\n')
    expect(lines[0]).toBe('*New order · E2E Kitchen*')
    expect(lines).toContain('*1 × Kafta*   $12')
    expect(lines).toContain('*1 × Fattoush*   $7')
    expect(lines).toContain('*Total: $19*')
    expect(lines).toContain('Note: Extra lemon')

    // Whether it was sent and served happens in WhatsApp, so the Orders page
    // says so instead of listing it.
    await page.goto(`${DASHBOARD_URL}/orders`)
    await expect(page.getByRole('heading', { name: 'Your orders go to WhatsApp' })).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)

    // And the guest's cart was emptied once the order went through.
    await page.goto(restaurant.restaurant.public_url)
    await expect(cart).toContainText('Nothing added yet.')
  })

  test('a menu on Free takes no orders: no cart, no add buttons', async ({ page, scenario }) => {
    const owner = await scenario({ package: 'free', categories: MENU })
    await page.goto(owner.restaurant.public_url)

    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(page.locator('aside.col-aside')).toHaveCount(0)
    await expect(page.locator('[data-open-cart]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Add/ })).toHaveCount(0)

    // Nor does the endpoint take one sent by hand, with the page's own token.
    const token = await page.locator('meta[name="menu-token"]').getAttribute('content')
    const order = await page.request.post(`${owner.restaurant.public_url}/order`, {
      data: { items: [{ dish_id: owner.categories[0]!.dishes[0]!.id, quantity: 1 }] },
      headers: { Accept: 'application/json', 'X-Menu-Token': token ?? '' },
    })
    expect(order.status()).toBe(404)
  })

  test('a switched-off restaurant, an unknown link and a menu with no design are not found', async ({
    page,
    scenario,
  }) => {
    const inactive = await scenario({ is_active: false, categories: MENU })
    const noDesign = await scenario({ template: null, categories: MENU })

    expect((await page.goto(inactive.restaurant.public_url))?.status()).toBe(404)
    expect((await page.goto(`${API_URL}/no-such-restaurant-${Date.now()}`))?.status()).toBe(404)
    expect((await page.goto(noDesign.restaurant.public_url))?.status()).toBe(404)
  })

  test('the owner can preview another design; a guest asking for one gets the live menu', async ({
    page,
    owner,
    browser,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: MENU })
    const designs = await api<{ data: { id: number; slug: string }[] }>(page, '/api/templates')
    const midnight = designs.data.find((design) => design.slug === 'midnight')!
    const previewUrl = `${restaurant.restaurant.public_url}?preview=${midnight.id}`

    await page.goto(restaurant.restaurant.public_url)
    expect(await accent(page)).toBe(CLASSIC_ACCENT)

    await page.goto(previewUrl)
    expect(await accent(page)).toBe(MIDNIGHT_ACCENT)
    // A preview is a dress rehearsal: it takes no orders.
    await expect(page.locator('aside.col-aside')).toHaveCount(0)

    const guest = await browser.newPage()
    try {
      await guest.goto(previewUrl)
      expect(await accent(guest)).toBe(CLASSIC_ACCENT)
      await expect(guest.locator('aside.col-aside')).toHaveCount(1)
    } finally {
      await guest.close()
    }
  })

  test('only the owner can preview a switched-off menu', async ({ page, owner, browser }) => {
    const restaurant = await owner({ is_active: false, categories: MENU })
    const designs = await api<{ data: { id: number; slug: string }[] }>(page, '/api/templates')
    const classic = designs.data.find((design) => design.slug === 'classic')!
    const previewUrl = `${restaurant.restaurant.public_url}?preview=${classic.id}`

    expect((await page.goto(previewUrl))?.status()).toBe(200)
    await expect(dish(page, 'Hummus')).toBeVisible()

    const guest = await browser.newPage()
    try {
      expect((await guest.goto(previewUrl))?.status()).toBe(404)
    } finally {
      await guest.close()
    }
  })

  test('a Premium menu in Midnight falls back to Classic when the package drops to Free', async ({
    page,
    scenario,
    setPackage,
  }) => {
    const owner = await scenario({ package: 'premium', template: 'midnight', categories: MENU })

    await page.goto(owner.restaurant.public_url)
    expect(await accent(page)).toBe(MIDNIGHT_ACCENT)

    await setPackage(owner.restaurant.id, { package: 'free' })

    await page.reload()
    expect(await accent(page)).toBe(CLASSIC_ACCENT)
    await expect(dish(page, 'Hummus')).toBeVisible()
  })
})
