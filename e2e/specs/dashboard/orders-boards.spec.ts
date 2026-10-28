import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi } from '../../support/helpers'

/**
 * The owner's Orders and Table orders boards beyond the main flows of
 * orders.spec.ts and edge-orders.spec.ts: a guest's change crossing the
 * owner's tap, a dish added with its choices in the editor, and a table
 * board worked through every status, its filters, edit, cancel and delete.
 */

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Grills' },
    dishes: [
      { name: { en: 'Kafta' }, price: 12.5 },
      { name: { en: 'Shish Taouk' }, price: 9 },
      {
        name: { en: 'Burger' },
        price: 8,
        variants: [
          {
            name: { en: 'Size' },
            options: [
              { name: { en: 'Small' }, price: 0 },
              { name: { en: 'Large' }, price: 3 },
            ],
          },
        ],
        addons: [{ name: { en: 'Extra cheese' }, price: 1 }],
      },
    ],
  },
]

/** A guest on a computer in a browser of their own; any page error fails the test. */
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

/** A guest at a table orders one dish there; nothing to fill in. */
async function orderAtTable(browser: Browser, url: string, dish: string) {
  const { guest, cart, close } = await openGuest(browser, url)
  await guest.getByRole('button', { name: `Add ${dish}` }).click()
  const placed = guest.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
  await cart.getByRole('button', { name: /Place order/ }).click()
  expect((await placed).status()).toBe(201)
  await close()
}

/** Opens a card's ⋮ menu. */
async function openMore(page: Page, reference: string) {
  await page
    .getByRole('button', {
      name: either(`More for order ${reference}`, `المزيد للطلب ${reference}`),
    })
    .click()
}

test.describe('orders boards', () => {
  test("a guest's change crossing the owner's Accept is refused, and the card shows it", async ({
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
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByRole('button', { name: /Place order/ }).click()
    const toast = guest.getByRole('status').filter({ hasText: 'Order sent' })

    // The owner has the order on screen as it came in.
    await page.goto('/orders')
    const card = page.getByRole('article').filter({ hasText: 'Kafta' })
    await expect(card).toContainText('$12.50', { timeout: 20_000 })

    // Meanwhile the guest adds a dish to it.
    await toast.getByRole('link', { name: 'Track your order' }).click()
    await guest
      .getByRole('dialog', { name: 'Order tracking' })
      .getByRole('button', { name: 'Change my order' })
      .click()
    await expect(cart).toContainText(/Changing order #\w{6}/)
    await guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await cart.getByRole('button', { name: /Update order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Order updated' })).toBeVisible()
    await close()

    // Taking on what the screen showed is refused with the reason, and the
    // card is read again.
    await card.getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(
      page.getByText('The guest just changed this order. Look at it again before taking it on.'),
    ).toBeVisible()
    await expect(card).toContainText('Shish Taouk')
    await expect(card).toContainText('$21.50')
    await expect(card.getByText(/^Changed by the guest at /)).toBeVisible()

    // Seen now: accepted.
    await card.getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(card.getByRole('button', { name: 'Ready', exact: true })).toBeVisible()
  })

  test('the owner adds a dish with its size and an add-on, priced by the server', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: MENU, orders: 1 })
    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card).toContainText('$12.50', { timeout: 20_000 })
    await card.getByRole('button', { name: /^More for order/ }).click()
    await page.getByRole('menuitem', { name: /^Edit order/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'Dish' }).click()
    await page.getByRole('option', { name: /^Burger/ }).click()
    // A size must be picked before it can go on.
    const add = dialog.getByRole('button', { name: 'Add', exact: true })
    await expect(add).toBeDisabled()
    await dialog.getByRole('combobox', { name: 'Size' }).click()
    await page.getByRole('option', { name: /^Large/ }).click()
    await dialog.getByRole('switch', { name: 'Extra cheese' }).click()
    await expect(dialog).toContainText('$12.00')
    await add.click()
    await expect(dialog.getByText('Added')).toBeVisible()
    await expect(dialog).toContainText('$24.50')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const burger = card.getByRole('listitem').filter({ hasText: 'Burger' })
    await expect(burger).toContainText('Size: Large · + Extra cheese')
    await expect(burger).toContainText('$12.00')
    await expect(card).toContainText('$24.50')
    await expect(card.getByText(/^Changed by you at /)).toBeVisible()
  })

  test('a table board worked through: started, edited, cancelled, served, filtered and deleted @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: MENU })
    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace', 'Window'] })
    expect(created.status()).toBe(201)
    const [terrace, window] = ((await created.json()) as { data: { url: string }[] }).data
    await orderAtTable(browser, terrace!.url, 'Kafta')
    await orderAtTable(browser, window!.url, 'Shish Taouk')

    await page.goto('/table-orders')
    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(2, { timeout: 20_000 })
    const chips = page.getByRole('tablist', {
      name: either('Filter orders by status', 'تصفية الطلبات حسب الحالة'),
    })
    await expect(chips.getByRole('tab', { name: /^(New|جديد)/ })).toContainText('2')
    const atTerrace = cards.filter({ hasText: 'Terrace' })
    const atWindow = cards.filter({ hasText: 'Window' })
    const referenceOf = async (card: typeof atTerrace) =>
      (await card
        .getByRole('button', { name: /^(More for order|المزيد للطلب) / })
        .getAttribute('aria-label'))!.replace(/^(More for order|المزيد للطلب) /, '')
    const windowRef = await referenceOf(atWindow)
    const terraceRef = await referenceOf(atTerrace)

    // The kitchen starts on the terrace.
    await atTerrace.getByRole('button', { name: either('Start preparing', 'ابدأ التحضير') }).click()
    await expect(atTerrace.getByText(either('Preparing', 'قيد التحضير'))).toBeVisible()
    await expect(chips.getByRole('tab', { name: /^(New|جديد)/ })).toContainText('1')

    // The window asks for one more; saving takes it on.
    await openMore(page, windowRef)
    await page
      .getByRole('menuitem', {
        name: either(`Edit order ${windowRef}`, `تعديل الطلب ${windowRef}`),
      })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Shish Taouk +1' }).click()
    await dialog.getByRole('button', { name: either('Save changes', 'حفظ التعديلات') }).click()
    await expect(dialog).toBeHidden()
    await expect(atWindow.getByRole('listitem')).toContainText('2×')
    await expect(atWindow).toContainText('$18.00')
    await expect(atWindow.getByText(either('Preparing', 'قيد التحضير'))).toBeVisible()

    // Then they leave: cancelled, and a cancelled order can only be deleted.
    await openMore(page, windowRef)
    await page.getByRole('menuitem', { name: either('Cancel order', 'إلغاء الطلب') }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: either('Cancel order', 'إلغاء الطلب') })
      .click()
    await expect(atWindow.getByText(either('Cancelled', 'ملغى'))).toBeVisible()
    await openMore(page, windowRef)
    await expect(page.getByRole('menuitem')).toHaveCount(1)
    await expect(
      page.getByRole('menuitem', {
        name: either(`Delete order ${windowRef}`, `حذف الطلب ${windowRef}`),
      }),
    ).toBeVisible()
    await page.keyboard.press('Escape')

    // The terrace is served: no step left.
    await atTerrace.getByRole('button', { name: either('Served', 'قُدِّم') }).click()
    await expect(atTerrace.getByRole('button', { name: either('Served', 'قُدِّم') })).toHaveCount(0)

    // Each filter shows its own.
    await chips.getByRole('tab', { name: either('Served', 'قُدِّم') }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Terrace')
    await chips.getByRole('tab', { name: either('Cancelled', 'ملغى') }).click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Window')
    await chips.getByRole('tab', { name: either('Preparing', 'قيد التحضير') }).click()
    await expect(
      page.getByText(either('Nothing with that status', 'لا شيء بهذه الحالة')),
    ).toBeVisible()

    // The cancelled one is deleted for good.
    await chips.getByRole('tab', { name: either('All', 'الكل') }).click()
    await expect(cards).toHaveCount(2)
    await openMore(page, windowRef)
    await page
      .getByRole('menuitem', {
        name: either(`Delete order ${windowRef}`, `حذف الطلب ${windowRef}`),
      })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: either('Delete for good', 'حذف نهائي') })
      .click()
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText(terraceRef)
    await page.reload()
    await expect(cards).toHaveCount(1)
  })
})
