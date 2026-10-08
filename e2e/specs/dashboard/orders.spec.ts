import type { Browser } from '@playwright/test'
import { either, expect, test, type Owner } from '../../support/fixtures'
import { openSidebar } from '../../support/helpers'

/**
 * A guest on the public menu: a browser of their own, with none of the
 * owner's cookies. WhatsApp is answered locally so the hand-off after an order
 * is seen without leaving the test.
 */
async function openGuestMenu(browser: Browser, owner: Owner, { located = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    // A guest who lets the menu see where they are, or one who does not.
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
  test('a guest orders in the menu and the owner sees it on Orders @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', order_mode: 'menu', categories: [GRILLS] })
    const { guest, close } = await openGuestMenu(browser, restaurant, { located: true })

    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    const taouk = guest.locator('article.dish', { hasText: 'Shish Taouk' })
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    await kafta.getByRole('button', { name: 'Add', exact: true }).click()
    await taouk.getByRole('button', { name: 'Add Shish Taouk' }).click()

    const cart = guest.locator('.col-aside')
    await expect(cart).toContainText('3 items')
    await expect(cart).toContainText('$34.00')

    // Nothing leaves without a way to reach the guest and somewhere to go.
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(cart).toContainText('Add your name so the restaurant knows who to ask for.')
    await expect(cart).toContainText('Add your phone number so the restaurant can call you.')
    await expect(cart).toContainText('Add your address for the delivery.')

    await cart.getByRole('radio', { name: 'Delivery' }).check()
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    // Sharing the location fills in the street; the guest adds the floor.
    await cart.getByRole('button', { name: 'Use my current location' }).click()
    await expect(cart).toContainText('Location added')
    await expect(cart).toContainText('We filled in your street. Add the building and floor.')
    const address = cart.getByLabel('Address')
    await expect(address).toHaveValue('Bliss Street, Ras Beirut, Beirut')
    await address.fill('Bliss Street, Ras Beirut, Beirut, 3rd floor')
    await cart.getByLabel(/Note for the restaurant/).fill('Ring twice')

    const placed = guest.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    const data = (
      (await response.json()) as {
        data: { reference: string; total: string; tracking_url: string }
      }
    ).data
    expect(data.total).toBe('34.00')

    // No WhatsApp: a note at the top says it went, with the number to quote.
    const toast = guest.getByRole('status').filter({ hasText: 'Order sent' })
    await expect(toast).toContainText(data.reference)
    await expect(toast).toContainText('The restaurant will call you to confirm.')
    await expect(toast.getByRole('link', { name: 'Track your order' })).toHaveAttribute(
      'href',
      data.tracking_url,
    )
    await expect(guest).toHaveURL(restaurant.restaurant.public_url)
    // The menu keeps the way back to it, after a reload too.
    const back = guest.getByRole('link', {
      name: `Your order #${data.reference}. Track your order`,
    })
    await expect(back).toHaveAttribute('href', data.tracking_url)
    await expect(cart).toContainText('Nothing added yet.')

    // One order at a time: what goes in the cart now joins this order, after
    // a reload too, and asks for nothing the order already has.
    for (const reload of [false, true]) {
      if (reload) await guest.reload()
      await kafta.getByRole('button', { name: 'Add Kafta' }).click()
      await expect(cart).toContainText(`Adding to your order #${data.reference}`)
      await expect(cart.getByLabel('Your name')).toBeHidden()
      await expect(cart.getByRole('button', { name: /Add to order/ })).toBeVisible()
      await kafta.getByRole('button', { name: 'Remove' }).click()
    }
    await close()

    await page.goto('/overview')
    const nav = await openSidebar(page)
    // The dashboard noticed it before the Orders page was opened.
    await expect(nav.getByLabel(either('1 order waiting', 'طلب واحد بانتظارك'))).toBeVisible()
    await expect(page).toHaveTitle(/^\(1\) /)
    // The count is part of the button's name: "Orders, 1 order waiting".
    await nav.getByRole('button', { name: /^(Orders|الطلبات)/ }).click()
    await expect(page).toHaveURL(/\/orders$/)

    const card = page.getByRole('article').filter({ hasText: data.reference })
    await expect(card).toBeVisible()
    await expect(card.getByRole('listitem')).toHaveCount(2)
    await expect(card.getByRole('listitem').filter({ hasText: 'Kafta' })).toContainText('2×')
    await expect(card.getByRole('listitem').filter({ hasText: 'Kafta' })).toContainText('$25.00')
    await expect(card).toContainText('$34.00')
    await expect(card.getByText(either('New', 'جديد'))).toBeVisible()
    await expect(card.getByText(either('Delivery', 'توصيل'))).toBeVisible()
    await expect(card.getByRole('link', { name: '+96170123456' })).toHaveAttribute(
      'href',
      'tel:+96170123456',
    )
    await expect(card).toContainText('Rami')
    await expect(card).toContainText('Bliss Street, Ras Beirut, Beirut, 3rd floor')
    await expect(
      card.getByRole('link', {
        name: either('Open their location on the map', 'افتح موقعه على الخريطة'),
      }),
    ).toHaveAttribute('href', 'https://www.google.com/maps?q=33.8959000,35.4784000')
    await expect(card.getByText('Ring twice', { exact: true })).toBeVisible()

    // The guest follows it on its link: the menu, with the tracking sheet up.
    // Without Pusher (as here) the sheet asks once a minute; its clock is
    // moved on instead of waited.
    const follower = await openGuestMenu(browser, restaurant)
    await follower.guest.clock.install()
    await follower.guest.goto(data.tracking_url)
    const sheet = follower.guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(sheet).toBeVisible()
    await expect(follower.guest).toHaveURL(restaurant.restaurant.public_url)
    const status = sheet.locator('.track-status')
    await expect(status).toContainText('Waiting for the restaurant to accept it.')
    await expect(status).toContainText(`Order #${data.reference}`)

    // Each tap is on the server before the guest's clock moves on: the next
    // button only shows once the change is saved.
    const heading = sheet.locator('.track-title')
    await card.getByRole('button', { name: either('Accept', 'اقبل') }).click()
    await expect(
      card.getByRole('button', { name: either('On its way', 'في الطريق') }),
    ).toBeVisible()
    await follower.guest.clock.fastForward(61_000)
    await expect(status).toContainText('The restaurant is preparing your order.')

    await card.getByRole('button', { name: either('On its way', 'في الطريق') }).click()
    await expect(card.getByRole('button', { name: either('Done', 'منجز') })).toBeVisible()
    await follower.guest.clock.fastForward(61_000)
    await expect(heading).toHaveText('On its way')
    await expect(status).toContainText('Your order has left the restaurant.')

    await card.getByRole('button', { name: either('Done', 'منجز') }).click()
    await expect(card.getByRole('button', { name: either('Done', 'منجز') })).toHaveCount(0)
    await follower.guest.clock.fastForward(61_000)
    await expect(heading).toHaveText('Delivered')
    await expect(status).toContainText('Enjoy your meal!')

    // Done: nothing more to ask about.
    await expect(sheet.getByText('Bliss Street, Ras Beirut, Beirut, 3rd floor')).toBeVisible()

    // Delivered: the menu's bar back to the order goes.
    await follower.guest.goto(restaurant.restaurant.public_url)
    await follower.guest.evaluate(
      ([key, value]) => window.localStorage.setItem(key!, value!),
      [
        `qayema-order-${restaurant.restaurant.slug}`,
        JSON.stringify({ reference: data.reference, url: data.tracking_url, at: Date.now() }),
      ],
    )
    await follower.guest.reload()
    await expect(follower.guest.locator('.order-bar')).toHaveCount(0)
    await follower.close()
  })

  test('a pickup asks for no address, and the country code is found by searching', async ({
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
    const { guest, close } = await openGuestMenu(browser, restaurant)

    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    const cart = guest.locator('.col-aside')
    // One kind of order: nothing to choose, and no address to give.
    await expect(cart.getByRole('radio')).toHaveCount(0)
    await expect(cart.getByLabel('Address')).toBeHidden()

    await cart.getByLabel('Your name').fill('Rami')

    // The code opens a list to search by name or by digits.
    const code = cart.getByRole('button', { name: /^Country code: Lebanon \+961/ })
    await code.click()
    const search = cart.getByRole('combobox', { name: 'Search a country or code' })
    await expect(search).toBeFocused()
    await search.fill('emir')
    await expect(cart.getByRole('option')).toHaveCount(1)
    await search.fill('zzz')
    await expect(cart.getByText('No country matches that.')).toBeVisible()
    await search.fill('971')
    await search.press('Enter')
    await expect(cart.getByRole('listbox')).toBeHidden()
    await expect(
      cart.getByRole('button', { name: /^Country code: United Arab Emirates \+971/ }),
    ).toBeVisible()
    // Picking one goes straight on to the number.
    await expect(cart.getByLabel('Phone number')).toBeFocused()

    await cart.getByLabel('Phone number').fill('050 123 4567')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Order sent' })).toBeVisible()
    await close()

    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card.getByText('Pickup')).toBeVisible()
    await expect(card.getByRole('link', { name: '+971501234567' })).toBeVisible()
  })

  test('a guest changes their order until it is accepted, and the owner can tell', async ({
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
    const { guest, close } = await openGuestMenu(browser, restaurant)
    const cart = guest.locator('.col-aside')

    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByRole('button', { name: /Place order/ }).click()
    const toast = guest.getByRole('status').filter({ hasText: 'Order sent' })
    // The tracking sheet opens over the menu, not on a page of its own.
    await toast.getByRole('link', { name: 'Track your order' }).click()
    const sheet = guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(sheet.locator('.track-title')).toHaveText('Order sent')

    // Back in the cart, as it was sent, and anything on the menu can join it.
    await sheet.getByRole('button', { name: 'Change my order' }).click()
    await expect(sheet).toBeHidden()
    await expect(cart).toContainText(/Changing order #\w{6}/)
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await expect(cart.getByLabel('Your name')).toHaveValue('Rami')
    await expect(cart.getByLabel('Phone number')).toHaveValue('70123456')

    await guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await cart.getByLabel(/Note for the restaurant/).fill('Two forks')
    await cart.getByRole('button', { name: /Update order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Order updated' })).toBeVisible()
    // The guest's own cart is theirs again, and empty.
    await expect(cart).toContainText('Nothing added yet.')

    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card).toContainText(/Changed by the guest at/)
    await expect(card).toContainText('Shish Taouk')
    await expect(card).toContainText('$21.50')
    await expect(card.getByText('Two forks', { exact: true })).toBeVisible()

    // The sheet still offers the change; the owner accepts before the tap
    // lands, so it is refused with the reason.
    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    await expect(sheet.getByRole('button', { name: 'Change my order' })).toBeVisible()
    await card.getByRole('button', { name: 'Accept' }).click()
    await expect(card.getByRole('button', { name: 'Ready' })).toBeVisible()
    await sheet.getByRole('button', { name: 'Change my order' }).click()
    await expect(
      guest.getByRole('status').filter({ hasText: 'This order can no longer be changed' }),
    ).toBeVisible()
    await expect(cart.locator('.cart-editing')).not.toContainText('Changing order')

    // Opened again: accepted, and no way to change it any more.
    await guest
      .getByRole('link', { name: /Track your order/ })
      .first()
      .click()
    await expect(sheet.locator('.track-title')).toHaveText('Accepted')
    await expect(sheet.getByText(/You changed this order at/)).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Change my order' })).toHaveCount(0)
    await close()
  })

  test('one order at a time: more dishes join it until accepted, then a new one waits', async ({
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
    const { guest, close } = await openGuestMenu(browser, restaurant)
    const cart = guest.locator('.col-aside')

    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Order sent' })).toBeVisible()

    // More dishes go into the same order while it waits to be accepted.
    await guest.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await expect(cart).toContainText(/Adding to your order #\w{6}/)
    await cart.getByRole('button', { name: /Add to order/ }).click()
    await expect(guest.getByRole('status').filter({ hasText: 'Added to your order' })).toBeVisible()
    await expect(cart).toContainText('Nothing added yet.')

    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText('Kafta')
    await expect(card).toContainText('Shish Taouk')
    await expect(card).toContainText('$21.50')
    await expect(card.getByText(/Changed by the guest at/)).toBeVisible()

    // Accepted: nothing more joins it, and nothing new until it is done.
    await card.getByRole('button', { name: 'Accept' }).click()
    await expect(card.getByRole('button', { name: 'Ready' })).toBeVisible()
    await guest.reload()
    await guest.getByRole('button', { name: 'Add Kafta' }).click()
    await expect(cart).toContainText(/is being prepared\. You can order again once it is done\./)
    await expect(cart.getByRole('button', { name: 'One order at a time' })).toBeDisabled()

    // Ready at the counter: still waiting for it to be picked up.
    await card.getByRole('button', { name: 'Ready' }).click()
    await expect(card.getByRole('button', { name: 'Done' })).toBeVisible()
    await guest.reload()
    await expect(cart).toContainText(/is ready for pickup\. You can order again once you have it\./)
    await expect(cart.getByRole('button', { name: 'One order at a time' })).toBeDisabled()

    // Picked up: the guest orders as usual again.
    await card.getByRole('button', { name: 'Done' }).click()
    await expect(card.getByRole('button', { name: 'Done' })).toHaveCount(0)
    await guest.reload()
    await expect(cart.getByRole('button', { name: /Place order/ })).toBeEnabled()
    await expect(cart.getByLabel('Your name')).toBeVisible()
    await close()
  })

  test('orders sent to WhatsApp stay out of Orders, which says where they went', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({ package: 'premium', orders: 2, order_channel: 'whatsapp' })
    await page.goto('/orders')

    await expect(page.getByText('Your orders go to WhatsApp')).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: 'Filter orders by status' })).toHaveCount(0)
    await expectAccessible()

    await page.getByRole('button', { name: 'Open Features' }).click()
    await expect(page).toHaveURL(/\/features$/)

    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features/ordering') && response.request().method() === 'PUT',
    )
    await page.getByRole('tab', { name: 'In your menu' }).click()
    expect((await saved).ok()).toBeTruthy()
    await expect(page.getByRole('tab', { name: 'Both' })).toHaveAttribute('aria-selected', 'true')

    await page.goto('/orders')
    await expect(page.getByText('No orders yet')).toBeVisible()
  })

  test('a menu that switched to WhatsApp sends the guest back to refresh', async ({
    browser,
    owner,
    page,
  }) => {
    const restaurant = await owner({ package: 'premium', order_mode: 'menu', categories: [GRILLS] })
    const { guest, close } = await openGuestMenu(browser, restaurant)
    await guest.getByRole('button', { name: 'Add Kafta' }).click()

    // The owner switches while the guest still has the menu open.
    await page.goto('/features')
    await page.getByRole('tab', { name: 'WhatsApp' }).click()
    await expect(page.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.waitForResponse((response) => response.url().endsWith('/api/features/ordering'))

    const cart = guest.locator('.col-aside')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByLabel('Address').fill('Hamra')
    await cart.getByRole('button', { name: /Place order/ }).click()
    await expect(cart).toContainText(
      'This menu was just updated. Please refresh the page to order.',
    )
    await close()
  })

  test('status chips count what is waiting and filter by status', async ({ page, owner }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 3 })
    await page.goto('/orders')

    const chips = page.getByRole('tablist', { name: 'Filter orders by status' })
    const cards = page.getByRole('article')
    await expect(cards).toHaveCount(3)
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('3')
    await expect(chips.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('3 orders are still waiting.')).toBeVisible()

    // Accept the first, which takes it off the waiting count, then finish it.
    await cards.first().getByRole('button', { name: 'Accept', exact: true }).click()
    await expect(page.getByText(/marked Accepted/)).toBeVisible()
    await expect(chips.getByRole('tab', { name: /^New/ })).toContainText('2')
    await expect(page.getByText('2 orders are still waiting.')).toBeVisible()
    await cards.first().getByRole('button', { name: 'On its way', exact: true }).click()
    await expect(cards.first().getByText('On its way', { exact: true })).toBeVisible()
    await cards.first().getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByText(/marked Done/)).toBeVisible()
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
    await owner({ package: 'premium', order_mode: 'menu', orders: 1 })
    await page.goto('/orders')

    const card = page.getByRole('article')
    await card.getByRole('button', { name: 'Cancel', exact: true }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Cancel this order?' })
    await expect(dialog).toContainText("The guest's order page will say it was cancelled")
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(card).toContainText('New')
    await expect(card.getByRole('button', { name: 'Accept', exact: true })).toBeEnabled()
  })

  test('an empty filter says so', async ({ page, owner }) => {
    await owner({ package: 'premium', order_mode: 'menu' })
    await page.goto('/orders')
    await expect(page.getByText('No orders yet')).toBeVisible()

    await page.getByRole('tab', { name: 'Cancelled' }).click()
    await expect(page.getByText('Nothing with that status')).toBeVisible()
  })

  for (const pkg of ['free', 'pro'] as const) {
    test(`a ${pkg} owner has no Orders in the sidebar; a link names Premium`, async ({
      page,
      owner,
      expectAccessible,
    }) => {
      await owner({ package: pkg })
      await page.goto('/overview')

      const nav = await openSidebar(page)
      await expect(nav.getByRole('button', { name: /Orders/ })).toHaveCount(0)
      await page.goto('/orders')

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
