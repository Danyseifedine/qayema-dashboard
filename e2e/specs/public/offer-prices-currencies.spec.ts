import type { Browser, Locator, Page } from '@playwright/test'
import { expect, test, type Owner, type ScenarioInput } from '../../support/fixtures'
import { callApi } from '../../support/helpers'

/**
 * Offer prices in every currency (../qayema docs/architecture/offers.md):
 * a percent, an amount and a pair deal on a menu in Lebanese pounds with
 * dishes in dollars, from the dish card through the sheet, the cart, the
 * order the server keeps, the guest's tracking and the owner's order card;
 * the best of two offers; pairs counted again when the cart changes; and an
 * offer that stops while the guest's cart waits.
 */

type Placed = { total: string; tracking_url: string }

/** A pound menu with dollar dishes, the rate 89,000, ordering in the menu for pickup. */
function poundMenu(input: Partial<ScenarioInput>): ScenarioInput {
  return {
    package: 'premium',
    order_mode: 'menu',
    order_types: ['pickup'],
    currency: 'LBP',
    second_currency: 'USD',
    exchange_rate: '89000',
    ...input,
  }
}

/** A guest's own wide browser on the menu (the cart beside it), failing on any script error. */
async function asGuest(
  browser: Browser,
  url: string,
): Promise<{ guest: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  })
  const guest = await context.newPage()
  const errors: string[] = []
  guest.on('pageerror', (error) => errors.push(error.message))
  await guest.goto(url)
  return {
    guest,
    close: async () => {
      expect(errors, 'uncaught errors on the menu').toEqual([])
      await context.close()
    },
  }
}

/** Fills in the guest and sends the order, giving back the server's answer. */
async function send(guest: Page, cart: Locator) {
  const placed = guest.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
  await cart.getByRole('button', { name: /Place order/ }).click()
  return placed
}

async function fillIn(cart: Locator) {
  await cart.getByLabel('Your name').fill('Rami')
  await cart.getByLabel('Phone number').fill('70 123 456')
}

async function place(guest: Page, cart: Locator): Promise<Placed> {
  await fillIn(cart)
  const response = await send(guest, cart)
  expect(response.status()).toBe(201)
  return ((await response.json()) as { data: Placed }).data
}

const POUND_DISHES = {
  name: { en: 'Kitchen' },
  dishes: [
    { name: { en: 'Margherita' }, price: 1250000 },
    { name: { en: 'Pepperoni' }, price: 1450000 },
    { name: { en: 'Burger' }, price: 12.5, currency: 'USD' },
    {
      name: { en: 'Sized pizza' },
      price: null,
      variants: [
        {
          name: { en: 'Size' },
          options: [
            { name: { en: 'Small' }, price: 950000 },
            { name: { en: 'Large' }, price: 1450000 },
          ],
        },
      ],
      addons: [{ name: { en: 'Extra cheese' }, price: 90000 }],
    },
    { name: { en: 'Grill platter' }, price: 12500000 },
    { name: { en: 'Water' }, price: 50000 },
  ],
}

const POUND_OFFERS: NonNullable<ScenarioInput['offers']> = [
  {
    title: { en: 'Pair night' },
    placements: ['banner'],
    discount_type: 'second',
    discount_value: 50,
    dishes: ['Margherita', 'Pepperoni'],
  },
  {
    title: { en: 'Pound off' },
    placements: ['banner'],
    discount_type: 'amount',
    discount_value: 150000,
    dishes: ['Burger', 'Sized pizza'],
  },
  {
    title: { en: 'Grill week' },
    placements: ['banner'],
    discount_type: 'percent',
    discount_value: 15,
    dishes: ['Grill platter'],
  },
]

test.describe('offer prices in every currency', () => {
  test('a pound menu with dollar dishes charges every offer as the card, the sheet and the cart show it, and the order keeps them', async ({
    browser,
    page,
    owner,
  }) => {
    const restaurant = await owner(poundMenu({ categories: [POUND_DISHES], offers: POUND_OFFERS }))
    const { guest, close } = await asGuest(browser, restaurant.restaurant.public_url)
    const card = (name: string) => guest.locator('article.dish', { hasText: name })

    // A pair deal is a badge only; a percent strikes out the pound price.
    await expect(card('Margherita').locator('.price')).toHaveText('L.L 1,250,000')
    await expect(card('Margherita').locator('.dish-badge')).toHaveText('Buy 2, 2nd 50% off')
    await expect(card('Grill platter').locator('.price')).toHaveText('L.L 10,625,000')
    await expect(card('Grill platter').locator('.price-was')).toHaveText('L.L 12,500,000')
    await expect(card('Grill platter').locator('.dish-badge')).toHaveText('-15%')
    // L.L 150,000 off a dollar dish at the rate: $1.69 off $12.50.
    await expect(card('Burger').locator('.price')).toHaveText('$10.81')
    await expect(card('Burger').locator('.price-was')).toHaveText('$12.50')
    await expect(card('Burger').locator('.dish-badge')).toHaveText('-L.L 150,000')
    // Priced only by its sizes: from the small one, the amount off.
    await expect(card('Sized pizza').locator('.price')).toHaveText('L.L 800,000')
    await expect(card('Sized pizza').locator('.price-was')).toHaveText('L.L 950,000')

    // The sheet says the offer too, and takes it off the size picked, add-ons aside.
    await card('Sized pizza').click()
    const sheet = guest.getByRole('dialog', { name: 'Sized pizza' })
    await expect(sheet.locator('[data-dish-price]')).toHaveText('L.L 800,000')
    await expect(sheet.locator('[data-dish-was]')).toHaveText('L.L 950,000')
    await expect(sheet.locator('.dish-badge')).toHaveText('-L.L 150,000')
    await sheet.getByText('Large', { exact: true }).click()
    await sheet.getByText('Extra cheese', { exact: true }).click()
    await expect(sheet.locator('[data-dish-price]')).toHaveText('L.L 1,390,000')
    await expect(sheet.locator('[data-dish-was]')).toHaveText('L.L 1,540,000')
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('AddL.L 1,390,000')
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    await card('Margherita').getByRole('button', { name: 'Add Margherita' }).click()
    await card('Pepperoni').getByRole('button', { name: 'Add Pepperoni' }).click()
    await card('Burger').getByRole('button', { name: 'Add Burger' }).click()
    await card('Grill platter').getByRole('button', { name: 'Add Grill platter' }).click()

    const cart = guest.locator('.col-aside')
    const line = (name: string) => cart.locator('.cart-line', { hasText: name })
    // Pepperoni went in second: half price.
    await expect(line('Pepperoni')).toContainText('1 at 50% off')
    await expect(line('Pepperoni').locator('.cart-line-total')).toHaveText(
      'L.L 1,450,000L.L 725,000',
    )
    await expect(line('Burger').locator('.cart-line-total')).toHaveText('$12.50$10.81')
    await expect(line('Grill platter').locator('.cart-line-total')).toHaveText(
      'L.L 12,500,000L.L 10,625,000',
    )
    // 1,390,000 + 1,250,000 + 725,000 + $10.81 at 89,000 (962,090) + 10,625,000.
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 14,952,090')
    await expect(cart.locator('.cart-rate')).toHaveText('$1 = L.L 89,000')

    const order = await place(guest, cart)
    expect(order.total).toBe('14952090.00')

    // The guest's tracking names each offer under its line, the price before struck out.
    await guest.goto(order.tracking_url)
    const tracking = guest.getByRole('dialog', { name: 'Order tracking' })
    const tracked = (name: string) => tracking.locator('.track-lines li', { hasText: name })
    await expect(tracked('Pepperoni').filter({ hasText: 'Pair night' })).toContainText(
      'L.L 725,000',
    )
    await expect(tracked('Pepperoni').locator('.track-line-offer')).toHaveText(
      'Pair nightL.L 1,450,000',
    )
    await expect(tracked('Burger').locator('.track-line-offer')).toHaveText('Pound off$12.50')
    await expect(tracked('Sized pizza').locator('.track-line-offer')).toHaveText(
      'Pound offL.L 1,540,000',
    )
    await expect(tracked('Margherita').locator('.track-line-offer')).toHaveCount(0)
    await close()

    // The owner's card says the same.
    await page.goto('/orders')
    const orderCard = page.locator('article', { hasText: 'Grill platter' }).first()
    await expect(orderCard).toContainText('Grill week, was LBP 12,500,000')
    await expect(orderCard).toContainText('Pair night, was LBP 1,450,000')
    await expect(orderCard).toContainText('Pound off, was $12.50')
    await expect(orderCard).toContainText('Pound off, was LBP 1,540,000')
    await expect(orderCard).toContainText('LBP 14,952,090')
  })

  test('pairs are counted again as the cart changes: removing a dish moves the half price', async ({
    browser,
    scenario,
  }) => {
    const restaurant = await scenario(
      poundMenu({ categories: [POUND_DISHES], offers: POUND_OFFERS }),
    )
    const { guest, close } = await asGuest(browser, restaurant.restaurant.public_url)
    const card = (name: string) => guest.locator('article.dish', { hasText: name })
    const cart = guest.locator('.col-aside')
    const line = (name: string) => cart.locator('.cart-line', { hasText: name })

    // Pepperoni first, so Margherita is the second.
    await card('Pepperoni').getByRole('button', { name: 'Add Pepperoni' }).click()
    await card('Water').getByRole('button', { name: 'Add Water' }).click()
    await card('Margherita').getByRole('button', { name: 'Add Margherita' }).click()
    await expect(line('Margherita')).toContainText('1 at 50% off')
    await expect(line('Pepperoni').locator('.cart-line-pair')).toHaveCount(0)
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 2,125,000')

    // Pepperoni gone: Margherita is alone, at its full price.
    await line('Pepperoni').getByRole('button', { name: 'Remove' }).click()
    await expect(line('Pepperoni')).toHaveCount(0)
    await expect(line('Margherita').locator('.cart-line-pair')).toHaveCount(0)
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 1,300,000')

    // Back in, Pepperoni is now the second.
    await card('Pepperoni').getByRole('button', { name: 'Add Pepperoni' }).click()
    await expect(line('Pepperoni')).toContainText('1 at 50% off')
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 2,025,000')

    // Three Margheritas after it: the 3rd dish full, the 4th half price.
    await line('Margherita').getByRole('button', { name: 'Add' }).click()
    await line('Margherita').getByRole('button', { name: 'Add' }).click()
    await expect(line('Margherita')).toContainText('1 at 50% off')
    await expect(line('Margherita').locator('.cart-line-total')).toHaveText(
      'L.L 3,750,000L.L 3,125,000',
    )
    // 1,250,000 x 2 + 625,000 + 725,000 + 50,000.
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 3,900,000')

    expect((await place(guest, cart)).total).toBe('3900000.00')
    await close()
  })

  test('a pair deal paused while the cart waits: the order is not sent until the guest sees the full price', async ({
    browser,
    page,
    owner,
  }) => {
    const restaurant: Owner = await owner(
      poundMenu({ categories: [POUND_DISHES], offers: POUND_OFFERS }),
    )
    const { guest, close } = await asGuest(browser, restaurant.restaurant.public_url)
    const card = (name: string) => guest.locator('article.dish', { hasText: name })
    const cart = guest.locator('.col-aside')

    await card('Margherita').getByRole('button', { name: 'Add Margherita' }).click()
    await card('Pepperoni').getByRole('button', { name: 'Add Pepperoni' }).click()
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 1,975,000')

    // The owner pauses the pair deal; the guest's page still has it.
    const paused = await callApi(page, 'PATCH', `/api/offers/${restaurant.offers[0]!.id}/active`, {
      is_active: false,
    })
    expect(paused.ok()).toBeTruthy()

    await fillIn(cart)
    const refused = await send(guest, cart)
    expect(refused.status()).toBe(409)
    await expect(cart.getByText(/Some prices changed since you opened the menu/)).toBeVisible()
    // The server's word wins: no half price, no badge.
    await expect(cart.locator('.cart-line-pair')).toHaveCount(0)
    await expect(cart.locator('.cart-total')).toHaveText('TotalL.L 2,700,000')
    await expect(card('Pepperoni').locator('.dish-badge')).toHaveCount(0)

    const placed = await send(guest, cart)
    expect(placed.status()).toBe(201)
    expect(((await placed.json()) as { data: Placed }).data.total).toBe('2700000.00')
    await close()
  })

  test('in dollars, the better of two offers wins and beats a pair deal, on a dish opened by its sheet', async ({
    browser,
    scenario,
  }) => {
    const restaurant = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            {
              name: { en: 'Margherita' },
              ingredients: { en: 'Tomato, mozzarella, basil' },
              price: 11,
              variants: [
                {
                  name: { en: 'Size' },
                  options: [
                    { name: { en: 'Regular' }, price: 0 },
                    { name: { en: 'Large' }, price: 4 },
                  ],
                },
              ],
            },
            { name: { en: 'Kafta' }, price: 12.5 },
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Pizza pair' },
          placements: ['banner'],
          discount_type: 'second',
          discount_value: 50,
          dishes: ['Margherita', 'Kafta'],
        },
        {
          title: { en: 'Fifth off' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
        },
        {
          title: { en: 'Three off' },
          placements: ['banner'],
          discount_type: 'amount',
          discount_value: 3,
          dishes: ['Kafta'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, restaurant.restaurant.public_url)

    // The owner's screenshot: "$11", the pair badge, the arrow to its sheet.
    const margherita = guest.locator('article.dish', { hasText: 'Margherita' })
    await expect(margherita.locator('.price')).toHaveText('$11')
    await expect(margherita.locator('.dish-badge')).toHaveText('Buy 2, 2nd 50% off')
    await expect(margherita.locator('.price-was')).toHaveCount(0)
    await expect(margherita.getByRole('button', { name: 'See options: Margherita' })).toBeVisible()
    // $3 off beats 20% off $12.50; the pair deal does not count Kafta.
    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await expect(kafta.locator('.price')).toHaveText('$9.50')
    await expect(kafta.locator('.dish-badge')).toHaveText('-$3')

    await margherita.click()
    const sheet = guest.getByRole('dialog', { name: 'Margherita' })
    // A pair deal changes no price in the sheet, its badge says it.
    await expect(sheet.locator('.dish-badge')).toHaveText('Buy 2, 2nd 50% off')
    await expect(sheet.locator('[data-dish-was]')).toBeHidden()
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    await margherita.click()
    await sheet.getByText('Large', { exact: true }).click()
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    const cart = guest.locator('.col-aside')
    // The Large Margherita is the second of the pair: half of $15.
    await expect(cart.locator('.cart-line', { hasText: 'Large' })).toContainText('1 at 50% off')
    await expect(cart.locator('.cart-total')).toHaveText('Total$28')
    expect((await place(guest, cart)).total).toBe('28.00')
    await close()
  })
})
