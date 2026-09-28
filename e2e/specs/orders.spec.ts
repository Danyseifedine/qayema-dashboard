import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type Owner } from '../fixtures/test'

/** The dashboard's sidebar; on a phone it lives in a drawer that has to be opened first. */
async function openSidebar(page: Page) {
  if (test.info().project.name === 'phone') {
    await page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') }).click()
  }
  return page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })
}

/**
 * A guest on the public menu: a browser of their own, with none of the
 * owner's cookies. WhatsApp is answered locally so the hand-off after an order
 * is seen without leaving the test.
 */
async function openGuestMenu(browser: Browser, owner: Owner) {
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
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title><p>WhatsApp</p>' }),
  )
  await guest.goto(owner.restaurant.public_url)

  return {
    guest,
    close: async () => {
      expect(errors, 'uncaught errors on the public menu').toEqual([])
      await context.close()
    },
  }
}

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}

test.describe('orders', () => {
  test('a guest orders from the public menu and the owner sees it on Orders @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: [GRILLS] })
    const { guest, close } = await openGuestMenu(browser, restaurant)

    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    const taouk = guest.locator('article.dish', { hasText: 'Shish Taouk' })
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    await kafta.getByRole('button', { name: 'Add', exact: true }).click()
    await taouk.getByRole('button', { name: 'Add Shish Taouk' }).click()

    const cart = guest.locator('.col-aside')
    await expect(cart).toContainText('3 items')
    await expect(cart).toContainText('$34.00')

    // The page leaves for WhatsApp as soon as the answer lands, which takes
    // the response body with it, so it is read on the way through.
    type Placed = { reference: string; total: string; whatsapp_url: string }
    let answer!: (placed: Placed) => void
    const placed = new Promise<Placed>((resolve) => (answer = resolve))
    await guest.route('**/order', async (route) => {
      const response = await route.fetch()
      expect(response.status()).toBe(201)
      answer(((await response.json()) as { data: Placed }).data)
      await route.fulfill({ response })
    })
    await cart.getByRole('button', { name: /Place order/ }).click()
    const data = await placed

    // The guest is handed to WhatsApp with the order written out.
    await expect(guest).toHaveURL(/^https:\/\/wa\.me\/96170123456\?text=/)
    expect(data.total).toBe('34.00')

    expect(decodeURIComponent(guest.url())).toContain(data.reference)
    await close()

    await page.goto('/overview')
    const nav = await openSidebar(page)
    await nav.getByRole('button', { name: either('Orders', 'الطلبات') }).click()
    await expect(page).toHaveURL(/\/orders$/)

    const card = page.getByRole('article').filter({ hasText: data.reference })
    await expect(card).toBeVisible()
    await expect(card.getByRole('listitem')).toHaveCount(2)
    await expect(card.getByRole('listitem').filter({ hasText: 'Kafta' })).toContainText('2×')
    await expect(card.getByRole('listitem').filter({ hasText: 'Kafta' })).toContainText('$25.00')
    await expect(card.getByRole('listitem').filter({ hasText: 'Shish Taouk' })).toContainText('1×')
    await expect(card).toContainText('$34.00')
    await expect(card.getByText(either('New', 'جديد'))).toBeVisible()
  })

  test('a note the guest sends with the order shows on its card', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: [GRILLS] })
    const { guest, close } = await openGuestMenu(browser, restaurant)
    await expect(guest.getByRole('button', { name: 'Add Kafta' })).toBeVisible()

    // The menu's cart has no note box; the endpoint takes one, so a guest
    // page sends it exactly as the cart sends an order.
    const result = await guest.evaluate(
      async ({ url, dishId }) => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': token ?? '',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            items: [{ dish_id: dishId, quantity: 3 }],
            note: '  No onions, please  ',
            locale: 'en',
          }),
        })
        return { status: response.status, body: await response.json() }
      },
      {
        url: `${restaurant.restaurant.public_url}/order`,
        dishId: restaurant.categories[0]!.dishes[1]!.id,
      },
    )
    expect(result.status).toBe(201)
    await close()

    await page.goto('/orders')
    const card = page.getByRole('article').filter({ hasText: result.body.data.reference })
    await expect(card).toContainText('3×')
    await expect(card).toContainText('Shish Taouk')
    await expect(card).toContainText('$27.00')
    // Trimmed, as the server stores it.
    await expect(card.getByText('No onions, please', { exact: true })).toBeVisible()
  })

  test('status chips count what is waiting and filter by status', async ({ page, owner }) => {
    await owner({ package: 'premium', orders: 3 })
    await page.goto('/orders')

    const chips = page.getByRole('tablist', { name: 'Filter orders by status' })
    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(3)
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('3')
    await expect(chips.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('3 orders are still waiting.')).toBeVisible()

    // Mark the first one done.
    await cards.first().getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByText(/marked Done/)).toBeVisible()
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('2')
    await expect(page.getByText('2 orders are still waiting.')).toBeVisible()
    await expect(cards.first().getByRole('button', { name: 'Done', exact: true })).toHaveCount(0)

    // Cancel another, through the confirm.
    await cards.nth(1).getByRole('button', { name: 'Cancel', exact: true }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Cancel this order?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel order' }).click()
    await expect(dialog).toBeHidden()
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('1')
    await expect(page.getByText('1 order is still waiting.')).toBeVisible()

    await chips.getByRole('tab', { name: /^New/ }).click()
    await expect(chips.getByRole('tab', { name: /^New/ })).toHaveAttribute('aria-selected', 'true')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('New')
    // The waiting line is redundant on the New filter itself.
    await expect(page.getByText('1 order is still waiting.')).toBeHidden()

    await chips.getByRole('tab', { name: 'Done' }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first().getByRole('button')).toHaveCount(0)

    await chips.getByRole('tab', { name: 'Cancelled' }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Cancelled')

    await chips.getByRole('tab', { name: 'All' }).click()
    await expect(cards).toHaveCount(3)

    // What was done persists.
    await page.reload()
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('1')
  })

  test('backing out of the cancel confirm keeps the order open', async ({ page, owner }) => {
    await owner({ package: 'premium', orders: 1 })
    await page.goto('/orders')

    const card = page.getByRole('article')
    await card.getByRole('button', { name: 'Cancel', exact: true }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Cancel this order?' })
    await expect(dialog).toContainText('The guest is not told')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(card).toContainText('New')
    await expect(card.getByRole('button', { name: 'Done', exact: true })).toBeEnabled()
  })

  test('an empty filter says so', async ({ page, owner }) => {
    await owner({ package: 'premium' })
    await page.goto('/orders')
    await expect(page.getByText('No orders yet')).toBeVisible()

    await page.getByRole('tab', { name: 'Cancelled' }).click()
    await expect(page.getByText('Nothing with that status')).toBeVisible()
  })

  for (const pkg of ['free', 'pro'] as const) {
    test(`a ${pkg} owner finds Orders locked, naming Premium`, async ({
      page,
      owner,
      expectAccessible,
    }) => {
      await owner({ package: pkg })
      await page.goto('/overview')

      const nav = await openSidebar(page)
      const row = nav.getByRole('button', { name: /Orders/ })
      await expect(row).toContainText('Premium')
      await row.click()
      await expect(page).toHaveURL(/\/orders$/)

      await expect(page.getByRole('heading', { name: /Take orders from the menu/ })).toBeVisible()
      await expect(
        page.getByText('Comes with the Premium package.', { exact: false }),
      ).toBeVisible()
      await expect(page.getByText('Guests build a cart on your menu')).toBeVisible()
      await expect(page.getByRole('tablist', { name: 'Filter orders by status' })).toHaveCount(0)
      await expectAccessible()

      await page.getByRole('button', { name: 'See packages' }).click()
      await expect(page).toHaveURL(/\/package$/)
    })
  }

  test('switching Orders off hides it from the sidebar and takes the cart off the menu', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: [GRILLS] })

    const before = await openGuestMenu(browser, restaurant)
    await expect(before.guest.getByRole('heading', { name: 'Your cart' })).toBeVisible()
    await before.close()

    await page.goto('/features')
    const nav = page.getByRole('navigation', { name: 'Dashboard' })
    await expect(nav.getByRole('button', { name: /Orders/ })).toBeVisible()

    const toggle = page.getByRole('switch', { name: 'Orders on' })
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features') && response.request().method() === 'PUT',
    )
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect((await saved).ok()).toBeTruthy()
    await expect(nav.getByRole('button', { name: /Orders/ })).toHaveCount(0)
    await expect(
      page.getByText("Guests can't order from your menu while this is off."),
    ).toBeVisible()

    // An open Orders page hands over to the overview.
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/overview$/)

    const after = await openGuestMenu(browser, restaurant)
    await expect(after.guest.getByRole('heading', { name: 'Grills' })).toBeVisible()
    await expect(after.guest.getByRole('heading', { name: 'Your cart' })).toHaveCount(0)
    await expect(after.guest.getByRole('button', { name: 'Add Kafta' })).toHaveCount(0)
    await after.close()
  })
})
