import type { Browser, Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { callApi } from '../../support/helpers'

/**
 * What the owner can still do to an order, with the guest watching: edit
 * it, cancel it, delete it, finish it, and serve one at a table.
 */

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
    // Hidden from guests, but the kitchen may still make it for an order.
    { name: { en: 'Fries' }, price: 4, is_available: false },
  ],
}

type Placed = { reference: string; tracking_url: string }

/**
 * A guest on the public menu in a browser of their own, with any error on
 * the page failing the test, as the dashboard's own page does.
 */
async function openGuest(browser: Browser, url: string, { clock = false } = {}) {
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
  // Without Pusher the tracking asks once a minute: its clock is moved on
  // rather than waited for.
  if (clock) await guest.clock.install()
  await guest.goto(url)
  return {
    guest,
    cart: guest.locator('.col-aside'),
    close: async () => {
      expect(errors, 'uncaught errors on the public menu').toEqual([])
      await context.close()
    },
  }
}

/** The guest picks dishes and sends a pickup order in the menu. */
async function placePickup(guest: Page, dishes: string[]): Promise<Placed> {
  for (const name of dishes) {
    await guest.getByRole('button', { name: `Add ${name}` }).click()
  }
  const cart = guest.locator('.col-aside')
  await cart.getByLabel('Your name').fill('Rami')
  await cart.getByLabel('Phone number').fill('70 123 456')
  const placed = guest.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
  await cart.getByRole('button', { name: /Place order/ }).click()
  const response = await placed
  expect(response.status()).toBe(201)
  await expect(guest.getByRole('status').filter({ hasText: 'Order sent' })).toBeVisible()
  return ((await response.json()) as { data: Placed }).data
}

test.describe('orders: edge cases', () => {
  test('the owner edits an order: one more, one off, a hidden dish added, and the guest sees it @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [GRILLS],
    })
    const { guest, close } = await openGuest(browser, restaurant.restaurant.public_url)
    const order = await placePickup(guest, ['Kafta', 'Shish Taouk'])

    await page.goto('/orders')
    const card = page.getByRole('article').filter({ hasText: order.reference })
    await expect(card).toContainText('$21.50', { timeout: 20_000 })
    await card
      .getByRole('button', {
        name: either(`More for order ${order.reference}`, `المزيد للطلب ${order.reference}`),
      })
      .click()
    await page
      .getByRole('menuitem', {
        name: either(`Edit order ${order.reference}`, `تعديل الطلب ${order.reference}`),
      })
      .click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Kafta +1' }).click()
    await dialog.getByRole('button', { name: 'Shish Taouk -1' }).click()
    // Off the menu for guests, still on the kitchen's list.
    await dialog.getByRole('combobox', { name: either('Dish', 'الطبق') }).click()
    const fries = page.getByRole('option', { name: /Fries/ })
    await expect(fries).toContainText(/Hidden from guests|مخفي عن الزبائن/)
    await fries.click()
    await dialog.getByRole('button', { name: either('How many +1', 'الكمية +1') }).click()
    await dialog.getByRole('button', { name: either('Add', 'إضافة') }).click()
    await expect(dialog.getByText(either('Added', 'مضاف'))).toBeVisible()
    await dialog.getByRole('button', { name: either('Save changes', 'حفظ التعديلات') }).click()
    await expect(dialog).toBeHidden()

    // Saving a new order accepts it, and the card says the owner changed it.
    await expect(card).toContainText(/Accepted|مقبول/)
    await expect(card.getByText(/^(Changed by you at|عدّلته في) /)).toBeVisible()
    const lines = card.getByRole('listitem')
    await expect(lines).toHaveCount(2)
    await expect(lines.filter({ hasText: 'Kafta' })).toContainText('2×')
    await expect(lines.filter({ hasText: 'Fries' })).toContainText('2×')
    await expect(card).not.toContainText('Shish Taouk')
    // 2 × 12.50 kept at its price, plus 2 × 4 priced by the server.
    await expect(card).toContainText('$33.00')

    // The guest's tracking shows the order as the restaurant left it.
    await guest.reload()
    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    const sheet = guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(sheet.locator('.track-title')).toHaveText('Accepted')
    await expect(sheet).toContainText('The restaurant updated your order at')
    await expect(sheet).toContainText('Fries')
    await expect(sheet).not.toContainText('Shish Taouk')
    await expect(sheet).toContainText('$33')
    await expect(sheet.getByRole('button', { name: 'Change my order' })).toHaveCount(0)
    await close()
  })

  test('an order needs a dish: taking every line off is refused with the way out', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 1 })
    await page.goto('/orders')
    const card = page.getByRole('article')
    await card.getByRole('button', { name: /^More for order/ }).click()
    await page.getByRole('menuitem', { name: /^Edit order/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Kafta -1' }).click()
    await expect(dialog).toContainText('$0.00')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(
      dialog.getByText('An order needs at least one dish. To call it off, cancel it.'),
    ).toBeVisible()

    // Cancel leaves the order as it was.
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(card).toContainText('$12.50')
    await expect(card).toContainText('New')
  })

  test('deleting an order asks first, and the guest following it is let go', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [GRILLS],
    })
    const { guest, cart, close } = await openGuest(browser, restaurant.restaurant.public_url)
    const order = await placePickup(guest, ['Kafta'])
    await expect(guest.locator('.order-bar')).toBeVisible()

    await page.goto('/orders')
    const card = page.getByRole('article').filter({ hasText: order.reference })
    await card.getByRole('button', { name: `More for order ${order.reference}` }).click()
    await page.getByRole('menuitem', { name: `Delete order ${order.reference}` }).click()
    const confirm = page.getByRole('dialog', { name: `Delete order ${order.reference}?` })
    await expect(confirm).toContainText('a guest following it no longer can')
    await confirm.getByRole('button', { name: 'Delete for good' }).click()
    await expect(page.getByText(`Order ${order.reference} deleted`)).toBeVisible()
    await expect(card).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('No orders yet')).toBeVisible()

    // The guest's way back to it goes, and the cart takes a new order.
    await guest.reload()
    await expect(guest.locator('.order-bar')).toHaveCount(0)
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).not.toContainText('Adding to your order')
    await expect(cart.getByLabel('Your name')).toBeVisible()
    await expect(cart.getByRole('button', { name: /Place order/ })).toBeEnabled()
    // Its tracking link leads nowhere now.
    expect((await guest.request.get(order.tracking_url)).status()).toBe(404)
    await close()
  })

  test('a cancelled order says so to the guest, who can then order again', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [GRILLS],
    })
    const { guest, cart, close } = await openGuest(browser, restaurant.restaurant.public_url)
    const order = await placePickup(guest, ['Kafta'])

    await page.goto('/orders')
    const card = page.getByRole('article').filter({ hasText: order.reference })
    await card.getByRole('button', { name: `More for order ${order.reference}` }).click()
    await page.getByRole('menuitem', { name: 'Cancel order' }).click()
    await page
      .getByRole('dialog')
      .filter({ hasText: 'Cancel this order?' })
      .getByRole('button', { name: 'Cancel order' })
      .click()
    await expect(card).toContainText('Cancelled')

    await guest.reload()
    await expect(guest.locator('.order-bar-status')).toHaveText('Cancelled')
    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    const sheet = guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(sheet.locator('.track-title')).toHaveText('Cancelled')
    await expect(sheet).toContainText('The restaurant cancelled this order.')
    await expect(sheet.getByRole('button', { name: 'Change my order' })).toHaveCount(0)
    await guest.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    // Nothing is being made, so nothing holds the next order back.
    await guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await expect(cart).not.toContainText('Adding to your order')
    await expect(cart.getByRole('button', { name: /Place order/ })).toBeEnabled()
    await close()
  })

  test('unfinished orders come first: one marked done drops below those still waiting', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 3 })
    await page.goto('/orders')
    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(3)

    // The newest is on top; it is the one finished.
    const more = await cards
      .first()
      .getByRole('button', { name: /^More for order/ })
      .getAttribute('aria-label')
    const reference = more!.replace('More for order ', '')
    const newest = cards.filter({ hasText: reference })
    await newest.getByRole('button', { name: 'Accept', exact: true }).click()
    await newest.getByRole('button', { name: 'On its way', exact: true }).click()
    await newest.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(newest.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0)

    await page.reload()
    await expect(cards).toHaveCount(3)
    await expect(cards.last()).toContainText(reference)
    await expect(cards.first().getByRole('button', { name: 'Accept', exact: true })).toBeVisible()
  })

  test('a table order is started and served, and the guest follows it to their table', async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: [GRILLS] })

    // Before the first one, the page says where table orders come from.
    await page.goto('/table-orders')
    await expect(page.getByText('No table orders yet')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Set up your tables' }).click()
    await expect(page).toHaveURL(/\/tables$/)

    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace'] })
    expect(created.status()).toBe(201)
    const table = ((await created.json()) as { data: { url: string }[] }).data[0]!

    const { guest, cart, close } = await openGuest(browser, table.url, { clock: true })
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).toContainText('Terrace')
    // At the table the restaurant can see who ordered: nothing to fill in.
    await cart.getByRole('button', { name: /Place order/ }).click()
    const toast = guest.getByRole('status').filter({ hasText: 'Order sent' })
    await toast.getByRole('link', { name: 'Track your order' }).click()
    const sheet = guest.getByRole('dialog', { name: 'Order tracking' })
    const title = sheet.locator('.track-title')
    await expect(title).toHaveText('Order sent')

    // Delivery and pickup's page keeps out of it.
    await page.goto('/orders')
    await expect(page.getByText('No orders yet')).toBeVisible()

    await page.goto('/table-orders')
    const card = page.getByRole('article').filter({ hasText: 'Kafta' })
    await expect(card).toContainText('Terrace')
    await expect(card).toContainText('New')
    await card.getByRole('button', { name: 'Start preparing' }).click()
    await expect(card.getByText('Preparing', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Served' })).toBeVisible()
    await guest.clock.fastForward(61_000)
    await expect(title).toHaveText('Being prepared')

    await card.getByRole('button', { name: 'Served' }).click()
    await expect(card.getByRole('button', { name: 'Served' })).toHaveCount(0)
    await expect(card.getByText('Served', { exact: true })).toBeVisible()
    await guest.clock.fastForward(61_000)
    await expect(title).toHaveText('Served')
    await expect(sheet).toContainText('Enjoy your meal!')
    await expect(sheet).toContainText('Terrace')
    await close()
  })
})

test.describe('prices in Arabic', () => {
  test.use({ uiLanguage: 'ar' })

  test('a price keeps Western digits in the order editor, as on the order card', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 1 })
    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card).toContainText('12.50', { timeout: 20_000 })

    await card.getByRole('button', { name: /^المزيد للطلب/ }).click()
    await page.getByRole('menuitem', { name: /^تعديل الطلب/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('group', { name: 'Kafta' })).toBeVisible()
    // The line's price and the total, as the card beside it writes them.
    await expect(dialog).toContainText('12.50')
    await expect(dialog).not.toContainText('١٢٫٥٠')
  })
})
