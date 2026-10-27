import type { Browser, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi } from '../../support/helpers'
import { API_URL } from '../../support/urls'

/**
 * The guest's edge cases the main menu spec leaves out: links that carry
 * more than the menu reads, a link that leads nowhere, a cart kept across
 * reloads and languages, a dish sold out while it waits in a cart, and a
 * table whose code changes under the guest.
 */

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Starters', ar: 'المقبلات' },
    dishes: [
      { name: { en: 'Hummus', ar: 'حمص' }, price: 6 },
      { name: { en: 'Fattoush', ar: 'فتوش' }, price: 7 },
    ],
  },
  {
    name: { en: 'Grills', ar: 'المشاوي' },
    dishes: [
      { name: { en: 'Kafta', ar: 'كفتة' }, price: 12.5 },
      { name: { en: 'Shish Taouk', ar: 'شيش طاووق' }, price: 9 },
    ],
  },
]

/**
 * A guest's own browser, with any error on the page failing the test.
 * WhatsApp is answered locally, so nothing leaves the machine.
 */
async function openGuest(browser: Browser, url: string) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  })
  const guest = await context.newPage()
  const errors: string[] = []
  guest.on('pageerror', (error) => errors.push(error.message))
  guest.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(message.text())
    }
  })
  await guest.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title>' }),
  )
  await guest.goto(url)
  return {
    guest,
    cart: guest.locator('aside.col-aside'),
    close: async () => {
      expect(errors, 'uncaught errors on the public menu').toEqual([])
      await context.close()
    },
  }
}

/** The menu's language switcher, to the language with this code. */
async function switchLanguage(guest: Page, code: 'en' | 'ar') {
  await guest.getByRole('button', { name: code === 'ar' ? 'Language' : 'اللغة' }).click()
  await guest.locator(`#pop-lang a[lang="${code}"]`).click()
  await expect(guest.locator('html')).toHaveAttribute('lang', code)
}

/** The owner marks a dish sold out on the Dishes page. */
async function soldOut(page: Page, name: string) {
  await page.goto('/dishes')
  const toggle = page.getByRole('switch', { name: `${name} is available` })
  await expect(toggle).toBeChecked({ timeout: 20_000 })
  const saved = page.waitForResponse(
    (response) => /\/api\/dishes\/\d+\/availability$/.test(response.url()) && response.ok(),
  )
  await toggle.click()
  await saved
}

test.describe('links: edge cases', () => {
  test("a shared link's tracking tags are dropped, keeping only what the menu reads", async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })
    const url = owner.restaurant.public_url

    // Facebook's tag alone: a permanent move to the clean link, the same for
    // every guest, so the next one from that post is answered at the edge.
    const moved = await page.request.get(`${url}?fbclid=IwAR0abc`, { maxRedirects: 0 })
    expect(moved.status()).toBe(301)
    expect(moved.headers().location).toBe(url)
    expect(moved.headers()['cache-control']).toContain('s-maxage=')

    // Tags mixed in with what the menu reads: those stay, in their order.
    await page.goto(`${url}?utm_source=instagram&lang=ar&utm_medium=story&qr=1&gclid=x1`)
    await expect(page).toHaveURL(`${url}?lang=ar&qr=1`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 2, name: 'المقبلات' })).toBeVisible()

    // A clean link is served as it is.
    const clean = await page.request.get(`${url}?lang=ar`, { maxRedirects: 0 })
    expect(clean.status()).toBe(200)
  })

  test('a link that leads to no restaurant says so, in the language it asked for', async ({
    page,
  }) => {
    const missing = `${API_URL}/no-such-restaurant-${Date.now()}`

    const response = await page.goto(missing)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page is off the menu')
    await expect(page.getByRole('link', { name: 'Back to home' }).first()).toBeVisible()

    // An Arabic link that went stale is answered in Arabic, right to left.
    expect((await page.goto(`${missing}?lang=ar`))?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('هذه الصفحة ليست في القائمة')
    await expect(page.getByRole('link', { name: 'العودة إلى الرئيسية' }).first()).toBeVisible()
  })
})

test.describe('the cart: edge cases', () => {
  test('the cart survives a reload and a trip to Arabic and back', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({ package: 'premium', second_locale: 'ar', categories: MENU })
    const { guest, cart, close } = await openGuest(browser, owner.restaurant.public_url)
    const total = cart.locator('.cart-total')

    const hummus = guest.locator('article.dish', { hasText: 'Hummus' })
    await hummus.getByRole('button', { name: 'Add Hummus' }).click()
    await hummus.getByRole('button', { name: 'Add', exact: true }).click()
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).toContainText('3 items')
    await expect(total).toHaveText('Total$24.50')

    // A phone that reloads (or locks) keeps what was picked.
    await guest.reload()
    await expect(cart).toContainText('3 items')
    await expect(total).toHaveText('Total$24.50')
    await expect(hummus.locator('output')).toHaveText('2')

    // The same lines in Arabic, named in Arabic.
    await switchLanguage(guest, 'ar')
    await expect(cart.locator('.cart-line')).toHaveCount(2)
    await expect(cart.locator('.cart-line', { hasText: 'حمص' }).locator('output')).toHaveText('2')
    await expect(cart.locator('.cart-line', { hasText: 'كفتة' })).toBeVisible()
    await expect(cart).not.toContainText('Hummus')

    await switchLanguage(guest, 'en')
    await expect(cart.locator('.cart-line')).toHaveCount(2)
    await expect(total).toHaveText('Total$24.50')
    await close()
  })

  test('a dish sold out while it waits in a cart is gone from it on the next visit', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: MENU })
    const { guest, cart, close } = await openGuest(browser, restaurant.restaurant.public_url)
    await guest.getByRole('button', { name: 'Add Hummus' }).click()
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart.locator('.cart-line')).toHaveCount(2)

    await soldOut(page, 'Hummus')

    await guest.reload()
    await expect(guest.locator('article.dish', { hasText: 'Hummus' })).toHaveCount(0)
    await expect(guest.locator('.menu-toast')).toContainText('Hummus is not available right now.')
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await expect(cart.locator('.cart-line')).toContainText('Kafta')
    await expect(cart.locator('.cart-total')).toHaveText('Total$12.50')
    await close()
  })

  test('an order sent with a dish sold out meanwhile goes without it, and the guest is told', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
    })
    const { guest, cart, close } = await openGuest(browser, restaurant.restaurant.public_url)
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await expect(cart.locator('.cart-total')).toHaveText('Total$21.50')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')

    // The kitchen runs out while the guest is still on the page.
    await soldOut(page, 'Shish Taouk')

    const placed = guest.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    expect(((await response.json()) as { data: { total: string } }).data.total).toBe('12.50')

    // What went is not what the cart showed, so the note says what was left out.
    const toast = guest.getByRole('status').filter({ hasText: 'Order sent' })
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Shish Taouk is no longer available')
    await close()
  })
})

test.describe('tables: edge cases', () => {
  test('a guest at a table keeps it across languages, and a code replaced meanwhile asks them to scan again', async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', second_locale: 'ar', categories: MENU })
    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace'] })
    expect(created.status()).toBe(201)
    const table = ((await created.json()) as { data: { id: number; code: string; url: string }[] })
      .data[0]!

    const { guest, cart, close } = await openGuest(browser, table.url)
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).toContainText('Terrace')

    // The language links carry the table, so the cart still orders to it.
    await switchLanguage(guest, 'ar')
    expect(new URL(guest.url()).searchParams.get('table')).toBe(table.code)
    await expect(cart).toContainText('Terrace')
    await switchLanguage(guest, 'en')
    expect(new URL(guest.url()).searchParams.get('table')).toBe(table.code)
    await expect(cart).toContainText('Terrace')

    // The owner prints a new card while the guest still has the old page.
    const renewed = await callApi(page, 'POST', `/api/tables/${table.id}/new-code`)
    expect(renewed.ok()).toBeTruthy()

    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(cart).toContainText(
      "This table's code has changed. Scan the code on your table again.",
    )
    // Nothing was sent to the table that no longer is one.
    await page.goto('/table-orders')
    await expect(page.getByText('No table orders yet')).toBeVisible({ timeout: 20_000 })
    await close()
  })
})
