import type { Browser, Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi, openMenuCart } from '../../support/helpers'

/**
 * A guest ordering from the public menu, the cases the main flows in
 * dashboard/orders.spec.ts leave out: the dish sheet's quantity, a phone's
 * cart sheet, an Arabic menu, delivery alone, a price that went up, a page
 * left open too long, two pages changing one order, WhatsApp asking for the
 * guest's details, and orders at a table on either way.
 */

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Grills', ar: 'مشاوي' },
    dishes: [
      { name: { en: 'Kafta', ar: 'كفتة' }, price: 12.5 },
      { name: { en: 'Shish Taouk', ar: 'شيش طاووق' }, price: 9 },
      { name: { en: 'Hummus', ar: 'حمص' }, price: 5 },
      {
        name: { en: 'Burger', ar: 'برغر' },
        price: 8,
        variants: [
          {
            name: { en: 'Size', ar: 'الحجم' },
            options: [
              { name: { en: 'Small', ar: 'صغير' }, price: 0 },
              { name: { en: 'Large', ar: 'كبير' }, price: 3 },
            ],
          },
        ],
        addons: [{ name: { en: 'Extra cheese', ar: 'جبنة إضافية' }, price: 1 }],
      },
    ],
  },
]

type Placed = { reference: string; total: string; tracking_url: string }

function dish(page: Page, name: string): Locator {
  return page.locator('article.dish', { hasText: name })
}

/** The answer to the order the cart sends next. */
function nextOrder(page: Page) {
  return page.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
}

/**
 * A guest on a computer in a browser of their own, with any error on the
 * page failing the test; `located` lets the menu see where they are.
 */
async function openGuest(browser: Browser, url: string, { located = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    ...(located
      ? { geolocation: { latitude: 33.8959, longitude: 35.4784 }, permissions: ['geolocation'] }
      : {}),
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

/** The guest sends a pickup order of these dishes from the wide screen's cart. */
async function placePickup(guest: Page, dishes: string[]): Promise<Placed> {
  for (const name of dishes) await guest.getByRole('button', { name: `Add ${name}` }).click()
  const cart = guest.locator('aside.col-aside')
  await cart.getByLabel('Your name').fill('Rami')
  await cart.getByLabel('Phone number').fill('70 123 456')
  const placed = nextOrder(guest)
  await cart.getByRole('button', { name: /Place order/ }).click()
  const response = await placed
  expect(response.status()).toBe(201)
  return ((await response.json()) as { data: Placed }).data
}

/** WhatsApp is stood in for, so nothing leaves the machine. */
async function standInForWhatsApp(page: Page) {
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp</title><p>WhatsApp</p>' }),
  )
}

/** The lines of the WhatsApp message the guest was sent to. */
function whatsAppLines(page: Page): string[] {
  return (new URL(page.url()).searchParams.get('text') ?? '').split('\n')
}

test.describe('ordering: the guest', () => {
  test('a guest takes two of a dish from its sheet, steps the cart and sends it, on a phone or a computer @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)

    // The sheet's own stepper: up twice, down once.
    await dish(page, 'Burger').getByRole('button', { name: 'See options: Burger' }).click()
    const sheet = page.getByRole('dialog', { name: 'Burger' })
    await sheet.getByText('Large').click()
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await sheet.getByRole('button', { name: 'Remove' }).click()
    await expect(sheet.locator('.dish-sheet-qty output')).toHaveText('2')
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$22')
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()
    await expect(dish(page, 'Burger').locator('.add-count')).toHaveText('2')
    await dish(page, 'Kafta').getByRole('button', { name: 'Add Kafta' }).click()

    const cart = await openMenuCart(page)
    const total = cart.locator('.cart-total')
    const burger = cart.locator('.cart-line', { hasText: 'Burger' })
    const kafta = cart.locator('.cart-line', { hasText: 'Kafta' })
    await expect(burger).toContainText('Large')
    await expect(burger).toContainText('$11 each')
    await expect(burger.locator('.cart-line-total')).toHaveText('$22')
    await expect(cart).toContainText('3 items')
    await expect(total).toHaveText('Total$34.50')

    // One more Kafta, then down to none: the line goes, the burgers stay.
    await kafta.getByRole('button', { name: 'Add' }).click()
    await expect(total).toHaveText('Total$47')
    await kafta.getByRole('button', { name: 'Remove' }).click()
    await kafta.getByRole('button', { name: 'Remove' }).click()
    await expect(kafta).toHaveCount(0)
    await expect(total).toHaveText('Total$22')

    // A phone's sheet closes and opens again with the cart as it was.
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.keyboard.press('Escape')
      await expect(cart).toBeHidden()
      await openMenuCart(page)
      await expect(total).toHaveText('Total$22')
    }

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = nextOrder(page)
    await cart.getByRole('button', { name: /Place order/ }).click()
    const data = ((await (await placed).json()) as { data: Placed }).data
    expect(data.total).toBe('22.00')

    const toast = page.getByRole('status').filter({ hasText: 'Order sent' })
    await expect(toast).toContainText(data.reference)
    await toast.getByRole('link', { name: 'Track your order' }).click()
    const tracking = page.getByRole('dialog', { name: 'Order tracking' })
    await expect(tracking.locator('.track-title')).toHaveText('Order sent')
    await expect(tracking).toContainText('Burger')
    await expect(tracking).toContainText('Large')
    await expect(tracking).toContainText('$22')
  })

  test('an Arabic menu asks, warns and confirms in Arabic, and lists the choices with the Arabic comma', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      second_locale: 'ar',
      categories: MENU,
    })
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await dish(page, 'برغر').getByRole('button', { name: 'عرض الخيارات: برغر' }).click()
    const sheet = page.getByRole('dialog', { name: 'برغر' })
    await sheet.getByText('كبير').click()
    await sheet.getByText('جبنة إضافية').click()
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    const cart = page.locator('aside.col-aside')
    await expect(cart.locator('.cart-line-choices')).toHaveText('كبير، + جبنة إضافية')
    await expect(cart.locator('.cart-total')).toHaveText('المجموع$12')

    // Nothing typed: the cart says what is missing, in Arabic.
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    await expect(cart).toContainText('أضف اسمك ليعرف المطعم من يطلب.')
    await expect(cart).toContainText('تحقّق من التفاصيل أعلاه.')
    await cart.getByLabel('اسمك').fill('رامي')
    // Too short to be a number, caught before anything is sent; Arabic
    // digits are written as Western ones.
    await cart.getByLabel('رقم الهاتف').fill('١٢٣')
    await expect(cart.getByLabel('رقم الهاتف')).toHaveValue('123')
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    await expect(cart).toContainText('تحقّق من رقم هاتفك.')

    await cart.getByLabel('رقم الهاتف').fill('70 123 456')
    const placed = nextOrder(page)
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    expect((await placed).status()).toBe(201)

    const toast = page.getByRole('status').filter({ hasText: 'تم إرسال الطلب' })
    await toast.getByRole('link', { name: 'تابع طلبك' }).click()
    const tracking = page.getByRole('dialog', { name: 'تتبع الطلب' })
    await expect(tracking).toContainText('بانتظار أن يقبل المطعم طلبك.')
    await expect(tracking.locator('.track-line-choices')).toHaveText('كبير، + جبنة إضافية')
    await expect(tracking.getByRole('button', { name: 'تعديل طلبي' })).toBeVisible()
  })

  test('delivery alone asks for the address at once, and a shared location can be taken back', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['delivery'],
      categories: MENU,
    })
    const { guest, cart, close } = await openGuest(browser, owner.restaurant.public_url, {
      located: true,
    })
    await guest.getByRole('button', { name: 'Add Kafta' }).click()

    // One kind of order: no choice, the address straight away.
    await expect(cart.getByRole('radio')).toHaveCount(0)
    const address = cart.getByLabel('Address')
    await expect(address).toBeVisible()

    // The location fills in the street; taking it back empties what it filled.
    const locate = cart.getByRole('button', { name: 'Use my current location' })
    await locate.click()
    await expect(address).toHaveValue('Bliss Street, Ras Beirut, Beirut')
    await cart.locator('.cart-locate-remove').click()
    await expect(address).toHaveValue('')
    await expect(locate).toBeVisible()

    // What the guest typed over it is theirs, and stays.
    await locate.click()
    await expect(address).toHaveValue('Bliss Street, Ras Beirut, Beirut')
    await address.fill('Bliss Street, Ras Beirut, Beirut, 3rd floor')
    await cart.locator('.cart-locate-remove').click()
    await expect(address).toHaveValue('Bliss Street, Ras Beirut, Beirut, 3rd floor')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = nextOrder(guest)
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    // No location went with it once taken back.
    const sent = response.request().postDataJSON() as Record<string, unknown>
    expect(sent.fulfilment).toBe('delivery')
    expect(sent.latitude).toBeNull()
    expect(sent.address).toBe('Bliss Street, Ras Beirut, Beirut, 3rd floor')
    await close()
  })

  test('a price raised while the dish sat in the cart is shown before anything is sent', async ({
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
    await expect(cart.locator('.cart-total')).toHaveText('Total$12.50')

    // The owner raises it while the guest still has the menu open.
    const kafta = restaurant.categories[0]!.dishes[0]!.id
    expect((await callApi(page, 'PATCH', `/api/dishes/${kafta}`, { price: 15 })).ok()).toBeTruthy()

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const refused = nextOrder(guest)
    await cart.getByRole('button', { name: /Place order/ }).click()
    expect((await refused).status()).toBe(409)
    await expect(cart.getByRole('alert')).toHaveText(
      'Some prices changed since you opened the menu (an offer may have ended). Check your cart, then send it again.',
    )
    // The cart and the dish's card show the price now.
    await expect(cart.locator('.cart-total')).toHaveText('Total$15')
    await expect(dish(guest, 'Kafta').locator('.price')).toHaveText('$15')
    await expect(cart.getByLabel('Your name')).toHaveValue('Rami')

    const placed = nextOrder(guest)
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = await placed
    expect(answer.status()).toBe(201)
    expect(((await answer.json()) as { data: Placed }).data.total).toBe('15.00')
    await close()
  })

  test('a page left open too long is asked to refresh in its own language, and sends once it has', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      second_locale: 'ar',
      categories: MENU,
    })
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)
    // A day's token gone stale, as on a phone left on the table overnight.
    await page
      .locator('meta[name="menu-token"]')
      .evaluate((meta) => meta.setAttribute('content', 'stale'))

    await dish(page, 'كفتة').getByRole('button', { name: 'إضافة كفتة' }).click()
    const cart = page.locator('aside.col-aside')
    await cart.getByLabel('اسمك').fill('رامي')
    await cart.getByLabel('رقم الهاتف').fill('70 123 456')
    const refused = nextOrder(page)
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    expect((await refused).status()).toBe(419)
    // The server answers before it knows the guest reads Arabic; the page does.
    await expect(cart.getByRole('alert')).toHaveText(
      'بقيت هذه الصفحة مفتوحة لوقت طويل. حدّثها وحاول مجدداً.',
    )

    // Refreshed: the cart and the details were kept, and it goes.
    await page.reload()
    await expect(cart.locator('.cart-line', { hasText: 'كفتة' })).toBeVisible()
    await expect(cart.getByLabel('اسمك')).toHaveValue('رامي')
    const placed = nextOrder(page)
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    expect((await placed).status()).toBe(201)
  })

  test('no connection, or an error page on the way, says it did not send, and trying again places it once', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)
    await dish(page, 'Kafta').getByRole('button', { name: 'Add Kafta' }).click()
    const cart = page.locator('aside.col-aside')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const place = cart.getByRole('button', { name: /Place order/ })
    const sent: string[] = []

    // The phone lost its signal.
    await page.route('**/order', (route) => {
      sent.push((route.request().postDataJSON() as { client_token: string }).client_token)
      return route.abort('internetdisconnected')
    })
    await place.click()
    await expect(cart.getByRole('alert')).toHaveText('That did not send. Please try again.')

    // A proxy on the way answered with a page of its own, not ours.
    await page.unroute('**/order')
    await page.route('**/order', (route) => {
      sent.push((route.request().postDataJSON() as { client_token: string }).client_token)
      return route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad gateway</h1>' })
    })
    await place.click()
    await expect(cart.getByRole('alert')).toHaveText('That did not send. Please try again.')
    await expect(place).toBeEnabled()

    // Back: it goes, as the same order every time it was tried.
    await page.unroute('**/order')
    const placed = nextOrder(page)
    await place.click()
    const response = await placed
    expect(response.status()).toBe(201)
    const token = (response.request().postDataJSON() as { client_token: string }).client_token
    expect(sent).toEqual([token, token])
    await expect(page.getByRole('status').filter({ hasText: 'Order sent' })).toBeVisible()
  })

  test('a guest takes a dish off their order, and "Keep it as it was" gives back their own cart', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
    })
    const { guest, cart, close } = await openGuest(browser, owner.restaurant.public_url)
    const order = await placePickup(guest, ['Kafta', 'Shish Taouk'])
    const tracking = guest.getByRole('dialog', { name: 'Order tracking' })

    await guest
      .getByRole('status')
      .filter({ hasText: 'Order sent' })
      .getByRole('link', { name: 'Track your order' })
      .click()
    await tracking.getByRole('button', { name: 'Change my order' }).click()
    await expect(cart).toContainText(`Changing order #${order.reference}`)
    await cart
      .locator('.cart-line', { hasText: 'Shish Taouk' })
      .getByRole('button', { name: 'Remove' })
      .click()
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await cart.getByRole('button', { name: /Update order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Order updated' })).toBeVisible()

    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    await expect(tracking).not.toContainText('Shish Taouk')
    await expect(tracking).toContainText('$12.50')
    await guest.keyboard.press('Escape')
    await expect(tracking).toBeHidden()

    // Something new in the cart joins the order; opening the order to change
    // it shows the order alone, and keeping it gives the new dish back.
    await guest.getByRole('button', { name: 'Add Hummus' }).click()
    await expect(cart).toContainText(`Adding to your order #${order.reference}`)
    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    await tracking.getByRole('button', { name: 'Change my order' }).click()
    await expect(cart).toContainText(`Changing order #${order.reference}`)
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await expect(cart.locator('.cart-line')).toContainText('Kafta')
    await cart.getByRole('button', { name: 'Keep it as it was' }).click()
    await expect(cart).toContainText(`Adding to your order #${order.reference}`)
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await expect(cart.locator('.cart-line')).toContainText('Hummus')
    await close()
  })

  test('two pages changing one order: the later one is told to look again, and nothing is undone', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
    })
    const first = await openGuest(browser, owner.restaurant.public_url)
    const order = await placePickup(first.guest, ['Kafta'])
    await first.guest
      .getByRole('status')
      .filter({ hasText: 'Order sent' })
      .getByRole('link', { name: 'Track your order' })
      .click()
    await first.guest
      .getByRole('dialog', { name: 'Order tracking' })
      .getByRole('button', { name: 'Change my order' })
      .click()
    await expect(first.cart).toContainText(`Changing order #${order.reference}`)

    // Someone at the table opens the same order's link and changes it first.
    const second = await openGuest(browser, order.tracking_url)
    await second.guest
      .getByRole('dialog', { name: 'Order tracking' })
      .getByRole('button', { name: 'Change my order' })
      .click()
    await expect(second.cart).toContainText(`Changing order #${order.reference}`)
    await second.guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await second.cart.getByRole('button', { name: /Update order/ }).click()
    await expect(
      second.guest.getByRole('status').filter({ hasText: 'Order updated' }),
    ).toBeVisible()
    await second.close()

    // The first page's change was made from the order as it was.
    await first.guest.getByRole('button', { name: 'Add Hummus' }).click()
    await first.cart.getByRole('button', { name: /Update order/ }).click()
    await expect(first.cart.getByRole('alert')).toHaveText(
      'Your order was changed from another page meanwhile. Open it to see it as it is now, then try again.',
    )

    // The order is as the second page left it.
    await first.cart.getByRole('button', { name: 'Keep it as it was' }).click()
    await first.guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    const tracking = first.guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(tracking).toContainText('Shish Taouk')
    await expect(tracking).not.toContainText('Hummus')
    await first.close()
  })

  test('on WhatsApp the cart asks what the owner chose, the message leads with it, and the form starts over', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: MENU })
    const saved = await callApi(page, 'PUT', '/api/features/whatsapp-fields', {
      away: { name: 'required', phone: 'optional', address: 'required' },
      table: { name: 'optional', phone: 'optional' },
    })
    expect(saved.ok()).toBeTruthy()
    await standInForWhatsApp(page)
    await page.goto(restaurant.restaurant.public_url)

    await dish(page, 'Kafta').getByRole('button', { name: 'Add Kafta' }).click()
    const cart = page.locator('aside.col-aside')
    // Asking for the address asks delivery or pickup too.
    await expect(cart.getByRole('radio', { name: 'Delivery' })).toBeChecked()
    await expect(cart.locator('[data-field="name"]')).not.toContainText('Optional')
    await expect(cart.locator('[data-field="phone"]')).toContainText('Optional')

    // The name and the address are needed; the phone is not.
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(cart).toContainText('Add your name so the restaurant knows who to ask for.')
    await expect(cart).toContainText('Add your address for the delivery.')
    await expect(cart).not.toContainText('Add your phone number')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByLabel('Address').fill('Hamra, Makdessi Street')
    await cart.getByLabel(/Note for the restaurant/).fill('No onions')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(page).toHaveURL(/^https:\/\/wa\.me\/96170123456\?text=/)
    const lines = whatsAppLines(page)
    // Plain and well separated: a blank line between the parts, no "×".
    expect(lines).toEqual([
      '*New order · E2E Kitchen*',
      '*Delivery*',
      '',
      'Name: Rami',
      'Phone: +96170123456',
      'Address: Hamra, Makdessi Street',
      '',
      '*1 Kafta*   $12.50',
      '',
      '*Total: $12.50*',
      '',
      'Note: No onions',
    ])

    // Back on the menu the form is empty: the next order may be someone else's.
    await page.goto(restaurant.restaurant.public_url)
    await dish(page, 'Hummus').getByRole('button', { name: 'Add Hummus' }).click()
    await expect(cart.getByLabel('Your name')).toHaveValue('')
    await expect(cart.getByLabel('Phone number')).toHaveValue('')

    // A pickup needs no address, and an empty phone is left out.
    await cart.locator('label', { hasText: 'Pickup' }).click()
    await expect(cart.getByRole('radio', { name: 'Pickup' })).toBeChecked()
    await expect(cart.getByLabel('Address')).toBeHidden()
    await cart.getByLabel('Your name').fill('Maya')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(page).toHaveURL(/^https:\/\/wa\.me\//)
    const pickup = whatsAppLines(page)
    expect(pickup.slice(0, 4)).toEqual(['*New order · E2E Kitchen*', '*Pickup*', '', 'Name: Maya'])
    expect(pickup.some((line) => line.startsWith('Phone:') || line.startsWith('Address:'))).toBe(
      false,
    )
  })

  test('at a table on WhatsApp the cart names the table, asks its own details, and the message leads with it', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', categories: MENU })
    expect(
      (await callApi(page, 'PUT', '/api/features/dine-in', { mode: 'whatsapp' })).ok(),
    ).toBeTruthy()
    expect(
      (
        await callApi(page, 'PUT', '/api/features/whatsapp-fields', {
          away: { name: 'off', phone: 'off', address: 'off' },
          table: { name: 'required', phone: 'off' },
        })
      ).ok(),
    ).toBeTruthy()
    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace'] })
    const table = ((await created.json()) as { data: { url: string }[] }).data[0]!

    await standInForWhatsApp(page)
    await page.goto(table.url)
    await dish(page, 'Kafta').getByRole('button', { name: 'Add Kafta' }).click()
    const cart = page.locator('aside.col-aside')
    await expect(cart).toContainText('This order is for Terrace.')
    await expect(cart.getByRole('radio')).toHaveCount(0)
    await expect(cart.getByLabel('Phone number')).toHaveCount(0)

    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(cart).toContainText('Add your name so the restaurant knows who to ask for.')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(page).toHaveURL(/^https:\/\/wa\.me\//)
    expect(whatsAppLines(page).slice(0, 4)).toEqual([
      '*New order · E2E Kitchen*',
      '*Table: Terrace*',
      '',
      'Name: Rami',
    ])
  })

  test('a guest reading the menu in Arabic sends the WhatsApp order in Arabic, each choice on its own line', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      name: { en: 'E2E Kitchen', ar: 'مطبخ التجربة' },
      second_locale: 'ar',
      categories: MENU,
    })
    await standInForWhatsApp(page)
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await dish(page, 'برغر').getByRole('button', { name: 'عرض الخيارات: برغر' }).click()
    const sheet = page.getByRole('dialog', { name: 'برغر' })
    await sheet.getByText('كبير').click()
    await sheet.getByText('جبنة إضافية').click()
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()
    await dish(page, 'كفتة').getByRole('button', { name: 'إضافة كفتة' }).click()

    const cart = page.locator('aside.col-aside')
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    await expect(page).toHaveURL(/^https:\/\/wa\.me\/96170123456\?text=/)
    // Labels, the restaurant and the dishes all in Arabic, the way the guest read them.
    expect(whatsAppLines(page)).toEqual([
      '*طلب جديد · مطبخ التجربة*',
      '',
      '*1 برغر*   $12',
      '• كبير',
      '• جبنة إضافية',
      '',
      '*1 كفتة*   $12.50',
      '',
      '*المجموع: $24.50*',
    ])
  })

  test('at a table taking orders in the menu while delivery goes to WhatsApp, the cart says which table', async ({
    page,
    browser,
    owner,
  }) => {
    // Delivery and pickup on WhatsApp (the default), table orders in the menu.
    await owner({ package: 'premium', categories: MENU })
    const created = await callApi(page, 'POST', '/api/tables', { names: ['Terrace'] })
    const table = ((await created.json()) as { data: { url: string }[] }).data[0]!

    const { guest, cart, close } = await openGuest(browser, table.url)
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    // Nothing to choose, so a line names the table the order goes to.
    await expect(cart.getByRole('radio')).toHaveCount(0)
    await expect(cart).toContainText('This order is for Terrace.')
    await expect(cart.locator('[data-field="name"]')).toContainText('Optional')

    const placed = nextOrder(guest)
    await cart.getByRole('button', { name: /Place order/ }).click()
    expect((await placed).status()).toBe(201)
    await expect(guest.getByRole('status').filter({ hasText: 'Order sent' })).toContainText(
      'The restaurant has your order for Terrace.',
    )
    await close()

    await page.goto('/table-orders')
    const card = page.getByRole('article').filter({ hasText: 'Kafta' })
    await expect(card).toContainText('Terrace', { timeout: 20_000 })
    await expect(card).toContainText('New')
  })
})
