import type { Browser, Page } from '@playwright/test'
import { expect, test, type Owner } from '../../support/fixtures'
import { API_URL, DASHBOARD_URL } from '../../support/urls'

/**
 * Offers as guests meet them (Premium): the banner carousel,
 * a discount the cart and the order really charge, "See the dishes", a
 * pop-up shown once, an ad that closes by itself, and an offer whose time
 * has not come staying off the menu.
 */

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}
const DRINKS = { name: { en: 'Drinks' }, dishes: [{ name: { en: 'Lemonade' }, price: 3 }] }

/** A guest's own browser on the menu, failing the test on any script error. */
async function asGuest(
  browser: Browser,
  owner: Owner,
  { wide = false } = {},
): Promise<{ guest: Page; close: () => Promise<void> }> {
  // A phone by default; wide shows the cart beside the menu.
  const context = await browser.newContext({
    viewport: wide ? { width: 1280, height: 900 } : { width: 390, height: 844 },
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

test.describe('offers on the menu', () => {
  test('a discount shows on the dish and is what the cart and the order charge @matrix', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS, DRINKS],
      offers: [
        {
          title: { en: 'Grill week' },
          description: { en: '20% off our grills.' },
          placements: ['banner'],
          action: 'dishes',
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner, { wide: true })

    await expect(guest.locator('.offers-banner .offer', { hasText: 'Grill week' })).toBeVisible()
    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await expect(kafta.locator('.price')).toHaveText('$10')
    await expect(kafta.locator('.price-was')).toHaveText('$12.50')
    // Beside the price, never over the photo.
    await expect(kafta.locator('.price-group .dish-badge')).toHaveText('-20%')

    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    const cart = guest.locator('.col-aside')
    await expect(cart).toContainText('$10')

    // The styled choice's own label takes the tap.
    await cart.getByText('Pickup', { exact: true }).click()
    await expect(cart.getByRole('radio', { name: 'Pickup' })).toBeChecked()
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = guest.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    expect(((await response.json()) as { data: { total: string } }).data.total).toBe('10.00')
    await close()
  })

  test('a cart that costs more than the guest saw is not sent until they see the price', async ({
    browser,
    scenario,
  }) => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000)
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
          // Not started for the server: only a phone whose clock runs a
          // day ahead thinks it is on.
          starts_at: tomorrow.toISOString().replace('T', ' ').slice(0, 19),
        },
      ],
    })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    })
    const guest = await context.newPage()
    await guest.clock.setFixedTime(new Date(tomorrow.getTime() + 3600 * 1000))
    await guest.goto(owner.restaurant.public_url)

    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await expect(kafta.locator('.price')).toHaveText('$10')
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    const cart = guest.locator('.col-aside')
    await cart.getByText('Pickup', { exact: true }).click()
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')

    // The server charges $12.50: nothing is sent, the guest is told and
    // sees the price as it is.
    const refused = guest.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    expect((await refused).status()).toBe(409)
    await expect(cart.getByText(/Some prices changed since you opened the menu/)).toBeVisible()
    await expect(kafta.locator('.price')).toHaveText('$12.50')
    await expect(cart).toContainText('$12.50')

    const placed = guest.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    expect(((await response.json()) as { data: { total: string } }).data.total).toBe('12.50')
    await context.close()
  })

  test('"See the dishes" shows only the offer\'s dishes until the guest asks for the whole menu', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS, DRINKS],
      offers: [
        {
          title: { en: 'Thirsty?' },
          placements: ['banner'],
          action: 'dishes',
          dishes: ['Lemonade'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    await guest.locator('.offers-banner').getByRole('button', { name: 'See the dishes' }).click()
    await expect(guest.locator('article.dish', { hasText: 'Lemonade' })).toBeVisible()
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeHidden()
    // Under an "Offers" tab beside "All", picked; no bar over the menu.
    const tabs = guest.getByRole('navigation', { name: 'Categories' })
    const tab = tabs.getByRole('button', { name: 'Offers', exact: true })
    await expect(tab).toHaveAttribute('aria-current', 'true')
    await expect(guest.getByText('Show the whole menu')).toHaveCount(0)

    // "All" brings the whole menu back and takes the tab away.
    await tabs.getByRole('button', { name: 'All' }).click()
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(tab).toHaveCount(0)
    await close()
  })

  test('a picture alone is the whole card, and tapping it shows its dishes', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS, DRINKS],
      offers: [
        {
          title: { en: 'Thirsty?' },
          show_text: false,
          image: true,
          placements: ['banner'],
          action: 'dishes',
          dishes: ['Lemonade'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const card = guest.locator('.offers-banner .offer-picture-only')
    await expect(card.locator('img.offer-photo')).toBeVisible()
    await expect(card.getByRole('heading')).toHaveCount(0)
    await card.getByRole('button', { name: 'Thirsty?' }).click()
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeHidden()
    await expect(guest.locator('article.dish', { hasText: 'Lemonade' })).toBeVisible()
    await close()
  })

  test("the banner carousel slides on by itself, a dot per offer, in each offer's shape", async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS],
      offers: [
        { title: { en: 'First deal' }, placements: ['banner'] },
        { title: { en: 'Second deal' }, placements: ['banner'], banner_shape: 'square' },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const dots = guest.locator('.offers-dots').getByRole('button')
    await expect(dots).toHaveCount(2)
    await expect(dots.first()).toHaveAttribute('aria-current', 'true')
    await expect(guest.getByRole('button', { name: 'Offer: Second deal' })).toBeVisible()

    // A rectangle is twice as wide as tall, a square as tall as wide.
    const first = await guest.locator('.offer-banner', { hasText: 'First deal' }).boundingBox()
    const second = await guest.locator('.offer-banner', { hasText: 'Second deal' }).boundingBox()
    expect(Math.round(first!.width / first!.height)).toBe(2)
    expect(Math.round(second!.width / second!.height)).toBe(1)

    // It slides to the second by itself, and a dot brings the first back.
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true', { timeout: 8000 })
    await dots.first().click()
    await expect(dots.first()).toHaveAttribute('aria-current', 'true')
    await close()
  })

  test('a pop-up set to "only once" does not come back', async ({ browser, scenario }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Welcome' },
          placements: ['popup'],
          show_again: 'once',
          popup_shape: 'tall',
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const popup = guest.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await expect(popup).toContainText('Welcome')
    // Tall: three wide for four high.
    const card = await popup.locator('.offer-popup').boundingBox()
    expect(card!.width / card!.height).toBeCloseTo(0.75, 1)
    await popup.getByRole('button', { name: 'Close' }).click()
    await expect(popup).toBeHidden()

    await guest.reload()
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    // Past its delay and more: it stays closed for this guest.
    await guest.waitForFunction(() => document.readyState === 'complete')
    await expect(popup).toBeHidden({ timeout: 2000 })
    await close()
  })

  test('a pop-up set to "every time" shows again on a refresh, not on a language switch', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      second_locale: 'ar',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Tonight', ar: 'الليلة' },
          placements: ['popup'],
          show_again: 'every_visit',
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const popup = guest.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()

    await guest.reload()
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()

    // The menu's own language switch reloads it: no second pop-up for that.
    await guest.goto(`${owner.restaurant.public_url}?lang=ar`, {
      referer: owner.restaurant.public_url,
    })
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await guest.waitForFunction(() => document.readyState === 'complete')
    await expect(popup).toBeHidden({ timeout: 2000 })
    await close()
  })

  test('an offer that is a pop-up and an ad shows the ad once the pop-up is closed', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner', 'popup', 'ad'],
          ad_delay_seconds: 2,
          ad_seconds: 30,
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    const popup = guest.locator('dialog.offer-pop')
    const ad = guest.locator('.offer-ad-wrap')
    await expect(popup).toBeVisible()
    // Not while the pop-up is open, however long it stays.
    await guest.waitForTimeout(2500)
    await expect(ad).toBeHidden()

    await popup.getByRole('button', { name: 'Close' }).click()
    const closedAt = Date.now()
    await expect(ad).toBeVisible({ timeout: 5000 })
    expect(Date.now() - closedAt).toBeGreaterThanOrEqual(1500)
    await expect(ad).toContainText('Grill week')
    await close()
  })

  test('a short ad cannot be skipped: its seconds count down, then the guest closes it', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS],
      offers: [{ title: { en: 'Free dessert' }, placements: ['ad'], ad_seconds: 3 }],
    })
    const { guest, close } = await asGuest(browser, owner)

    const ad = guest.locator('.offer-ad-wrap')
    const closeButton = ad.getByRole('button', { name: 'Close' })
    await expect(ad).toBeVisible()
    await expect(ad).toContainText('Free dessert')
    // The countdown first, and no way to close it yet.
    await expect(ad.locator('[data-offer-count]')).toHaveText(/^[1-3]$/)
    await expect(closeButton).toBeHidden()

    // Its seconds up, the X comes; the ad stays until the guest closes it.
    await expect(closeButton).toBeVisible({ timeout: 5000 })
    await expect(ad.locator('[data-offer-count]')).toBeHidden()
    await expect(ad).toBeVisible()
    await closeButton.click()
    await expect(ad).toBeHidden()
    await close()
  })

  test('an offer whose time has not come stays off the menu, and nothing shows without Premium', async ({
    browser,
    scenario,
  }) => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)
    const later = await scenario({
      package: 'premium',
      categories: [GRILLS],
      offers: [{ title: { en: 'Coming soon' }, placements: ['banner'], starts_at: tomorrow }],
    })
    const pro = await scenario({
      package: 'pro',
      categories: [GRILLS],
      offers: [{ title: { en: 'Not on Pro' }, placements: ['banner'] }],
    })

    const first = await asGuest(browser, later)
    await expect(first.guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(first.guest.getByText('Coming soon')).toBeHidden()
    await first.close()

    const second = await asGuest(browser, pro)
    await expect(second.guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(second.guest.getByText('Not on Pro')).toHaveCount(0)
    await second.close()
  })

  test('only the parts of offers on the package reach guests', async ({ browser, scenario }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [GRILLS],
      overrides: [
        { feature: 'offer_popup_limit', value: 0 },
        { feature: 'offer_discounts', value: 0 },
      ],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner', 'popup'],
          action: 'dishes',
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner)

    // A banner, as a promotion: no pop-up, no discount.
    await expect(guest.locator('.offers-banner .offer', { hasText: 'Grill week' })).toBeVisible()
    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await expect(kafta.locator('.price')).toHaveText('$12.50')
    await expect(kafta.locator('.dish-badge')).toHaveCount(0)
    await guest.waitForTimeout(1500)
    await expect(guest.locator('dialog.offer-pop')).toHaveCount(0)
    await close()
  })

  test('a deal in the cart whose offer stops is taken off, and the guest is told', async ({
    browser,
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS, { name: { en: 'Deals' }, dishes: [] }],
      offers: [
        {
          title: { en: 'Family Monday' },
          placements: ['banner'],
          action: 'dishes',
          deal: { name: { en: 'Family meal' }, price: 25, category: 'Deals' },
        },
      ],
    })
    const { guest, close } = await asGuest(browser, owner, { wide: true })
    await guest.getByRole('button', { name: 'Add Family meal' }).click()
    await expect(guest.locator('aside.col-aside')).toContainText('Family meal')

    // The owner pauses the offer: its deal leaves the menu.
    await signIn(owner.user.email)
    const headers = {
      Accept: 'application/json',
      Origin: DASHBOARD_URL,
      Referer: `${DASHBOARD_URL}/`,
    }
    const csrf = await page.context().request.get(`${API_URL}/api/csrf-token`, { headers })
    const { token } = (await csrf.json()) as { token: string }
    const paused = await page
      .context()
      .request.fetch(`${API_URL}/api/offers/${owner.offers[0]!.id}/active`, {
        method: 'PATCH',
        headers: { ...headers, 'X-CSRF-TOKEN': token },
        data: { is_active: false },
      })
    expect(paused.ok()).toBe(true)

    await guest.reload()
    const toast = guest.locator('.menu-toast')
    await expect(toast).toContainText('Taken off your cart')
    await expect(toast).toContainText('Family meal is not available right now.')
    await expect(guest.locator('aside.col-aside')).not.toContainText('Family meal')
    await close()
  })
})
