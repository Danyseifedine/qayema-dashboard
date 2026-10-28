import type { Browser, Page } from '@playwright/test'
import { expect, test, type Owner } from '../../support/fixtures'
import { pickPart } from '../../support/helpers'

/**
 * Offer deals as guests pay them (../qayema docs/architecture/offers.md):
 * a discount that covers the size picked, "buy one, get the second half
 * off" in the order dishes went into the cart, and an offer shown all the
 * time whose deal works only in its days.
 */

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}

const PIZZAS = {
  name: { en: 'Pizzas' },
  dishes: [
    {
      name: { en: 'Margherita' },
      price: null,
      variants: [
        {
          name: { en: 'Size' },
          options: [
            { name: { en: 'Small' }, price: 8 },
            { name: { en: 'Large' }, price: 12 },
          ],
        },
      ],
    },
  ],
}

/** A guest's own wide browser on the menu (the cart beside it), failing on any script error. */
async function asGuest(
  browser: Browser,
  owner: Owner,
): Promise<{ guest: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  })
  const guest = await context.newPage()
  const errors: string[] = []
  guest.on('pageerror', (error) => errors.push(error.message))
  await guest.goto(owner.restaurant.public_url)
  return {
    guest,
    close: async () => {
      expect(errors, 'uncaught errors on the menu').toEqual([])
      await context.close()
    },
  }
}

/** Places the cart for pickup and gives back the total the server charged. */
async function place(guest: Page): Promise<string> {
  const cart = guest.locator('.col-aside')
  await cart.getByText('Pickup', { exact: true }).click()
  await cart.getByLabel('Your name').fill('Rami')
  await cart.getByLabel('Phone number').fill('70 123 456')
  const placed = guest.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
  await cart.getByRole('button', { name: /Place order/ }).click()
  const response = await placed
  expect(response.status()).toBe(201)
  return ((await response.json()) as { data: { total: string } }).data.total
}

test.describe('offer deals', () => {
  test('a discount covers the size the guest picks, and the order charges it', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Pizza night' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Margherita'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    // Priced only by its sizes: the card starts at the small one, 20% off.
    const margherita = guest.locator('article.dish', { hasText: 'Margherita' })
    await expect(margherita.locator('.price')).toHaveText('$6.40')
    await expect(margherita.locator('.price-was')).toHaveText('$8')
    await expect(margherita.locator('.dish-badge')).toHaveText('-20%')

    await margherita.click()
    const sheet = guest.getByRole('dialog', { name: 'Margherita' })
    await sheet.getByText('Large', { exact: true }).click()
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('Add$9.60')
    await add.click()
    await expect(sheet).toBeHidden()

    await expect(guest.locator('.col-aside .cart-total')).toHaveText('Total$9.60')
    expect(await place(guest)).toBe('9.60')
    await close()
  })

  test('a discount covers the pizza a guest builds, add-ons aside', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      overrides: [{ feature: 'build_your_own', value: 1 }],
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            {
              name: { en: 'Build your pizza' },
              price: null,
              builds: [
                { name: { en: 'Your pizza' }, shape: 'split', parts: [2], category: 'Pizzas' },
              ],
            },
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Build night' },
          placements: ['banner'],
          action: 'dishes',
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Build your pizza'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const tile = guest.locator('.builds article.dish', { hasText: 'Build your pizza' })
    await expect(tile.locator('.dish-badge')).toHaveText('-20%')
    // Above the tile's name, never over it.
    const badge = await tile.locator('.dish-badge').boundingBox()
    const name = await tile.locator('.dish-name').boundingBox()
    expect(badge!.y + badge!.height).toBeLessThanOrEqual(name!.y)

    // Its only dish is built: "See the dishes" shows that tile, not "nothing matches".
    await guest.getByRole('button', { name: 'See the dishes' }).click()
    await expect(guest.getByRole('button', { name: 'Offers', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(tile).toBeVisible()
    await expect(guest.locator('#menu-no-results')).toBeHidden()

    await tile.click()
    const sheet = guest.getByRole('dialog', { name: 'Build your pizza' })
    await pickPart(sheet, 1, 'Pepperoni')
    // 20% off half of 12 and half of 16.
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('Add$11.20')
    await add.click()
    await expect(sheet).toBeHidden()

    await expect(guest.locator('.col-aside .cart-total')).toHaveText('Total$11.20')
    expect(await place(guest)).toBe('11.20')
    await close()
  })

  test('buy one, get the second 50% off: the second dish added gets it', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Grill pair' },
          placements: ['banner'],
          discount_type: 'second',
          discount_value: 50,
          dishes: ['Kafta', 'Shish Taouk'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    const shish = guest.locator('article.dish', { hasText: 'Shish Taouk' })
    await expect(kafta.locator('.dish-badge')).toHaveText('Buy 2, 2nd 50% off')
    // A pair deal changes no price on the card.
    await expect(kafta.locator('.price')).toHaveText('$12.50')
    await expect(kafta.locator('.price-was')).toHaveCount(0)

    // The cheaper one first: the dearer one, added second, is half price.
    await shish.getByRole('button', { name: 'Add Shish Taouk' }).click()
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    const cart = guest.locator('.col-aside')
    await expect(cart.locator('.cart-line', { hasText: 'Kafta' })).toContainText('1 at 50% off')
    await expect(cart.locator('.cart-total')).toHaveText('Total$15.25')

    expect(await place(guest)).toBe('15.25')
    await close()
  })

  test('an offer shown all the time says when its deal works, and charges nothing off until then', async ({
    browser,
    scenario,
  }) => {
    // Days far from today whatever the restaurant's timezone: never yesterday, today or tomorrow.
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const today = new Date().getUTCDay()
    const away = days.filter((_, index) => ![6, 0, 1].includes((index - today + 7) % 7))
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Grill days' },
          placements: ['banner'],
          action: 'dishes',
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
          repeat: 'weekly',
          weekdays: away,
          time_windows: [{ from: '17:00', to: '19:00' }],
          shows_outside_hours: true,
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const card = guest.locator('.offers-banner .offer', { hasText: 'Grill days' })
    await expect(card).toBeVisible()
    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await expect(kafta.locator('.price')).toHaveText('$12.50')
    await expect(kafta.locator('.dish-badge')).toHaveCount(0)

    // A tap tells the guest when, and opens nothing.
    await card.click()
    const toast = guest.locator('.menu-toast')
    await expect(toast).toContainText('Not available right now')
    await expect(toast).toContainText('5:00 PM to 7:00 PM')
    await expect(guest.locator('.tab', { hasText: 'Offers' })).toHaveCount(0)

    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    expect(await place(guest)).toBe('12.50')
    await close()
  })
})
