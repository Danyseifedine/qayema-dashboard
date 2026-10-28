import type { Browser, Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'

/**
 * The Orders group on the Features page, set through its own controls: how
 * guests send orders (WhatsApp or in the menu), what is taken (delivery,
 * pickup, the last one staying on) and what a WhatsApp order asks for, each
 * checked in the guest's cart. The cart itself is public/ordering-guest.spec.ts.
 */

const MENU = [{ name: { en: 'Grills' }, dishes: [{ name: { en: 'Kafta' }, price: 12.5 }] }]

/** Waits for one of the Features page's ordering saves. */
function saved(page: Page, path: 'ordering' | 'whatsapp-fields') {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/features/${path}`) && response.request().method() === 'PUT',
  )
}

/** The guest's cart with Kafta in it, in a signed-out browser. */
async function cartOf(browser: Browser, url: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(url)
  await guest
    .locator('article.dish', { hasText: 'Kafta' })
    .getByRole('button', { name: 'Add Kafta' })
    .click()
  return { cart: guest.locator('aside.col-aside'), close: () => context.close() }
}

test.describe('features: how guests order', () => {
  test('orders move from WhatsApp into the menu and back, and the guest’s cart follows', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', categories: MENU })
    await page.goto('/features')
    const ways = page.getByRole('tablist', { name: 'How guests send orders' })
    await expect(ways.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // On WhatsApp with nothing asked, the guest only adds a note.
    let guest = await cartOf(browser, restaurant.public_url)
    await expect(guest.cart.getByLabel('Phone number')).toHaveCount(0)
    await guest.close()

    let done = saved(page, 'ordering')
    await ways.getByRole('tab', { name: 'Dashboard' }).click()
    expect((await done).ok()).toBeTruthy()
    await expect(page.getByText('Guests order inside your menu.', { exact: false })).toBeVisible()
    guest = await cartOf(browser, restaurant.public_url)
    await expect(guest.cart.getByLabel('Phone number')).toBeVisible()
    await expect(guest.cart.getByRole('button', { name: /Place order/ })).toBeVisible()
    await guest.close()

    done = saved(page, 'ordering')
    await ways.getByRole('tab', { name: 'WhatsApp' }).click()
    expect((await done).ok()).toBeTruthy()
    await page.reload()
    await expect(ways.getByRole('tab', { name: 'WhatsApp' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('with delivery off, pickup is the one way, its switch stays on, and the cart offers only it', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', order_mode: 'menu', categories: MENU })
    await page.goto('/features')
    const delivery = page.getByRole('switch', { name: 'Delivery', exact: true })
    const pickup = page.getByRole('switch', { name: 'Pickup', exact: true })
    await expect(pickup).toBeEnabled()

    const done = saved(page, 'ordering')
    await delivery.click()
    expect((await done).ok()).toBeTruthy()
    await expect(delivery).toHaveAttribute('aria-checked', 'false')
    // The last way left cannot go: nobody could order.
    await expect(pickup).toBeDisabled()
    await expect(pickup).toHaveAttribute('aria-checked', 'true')

    const { cart, close } = await cartOf(browser, restaurant.public_url)
    await expect(cart.getByRole('radio', { name: 'Delivery' })).toHaveCount(0)
    await expect(cart.getByLabel('Address')).toBeHidden()
    await close()

    await page.reload()
    await expect(delivery).toHaveAttribute('aria-checked', 'false')
    await expect(pickup).toBeDisabled()
  })

  test('on WhatsApp, asking for the address brings delivery and pickup, and the cart asks for it', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', categories: MENU })
    await page.goto('/features')
    await expect(page.getByRole('switch', { name: 'Delivery', exact: true })).toHaveCount(0)

    const done = saved(page, 'whatsapp-fields')
    await page
      .getByRole('tablist', { name: 'Delivery address: what to ask' })
      .getByRole('tab', { name: 'Required' })
      .click()
    const body = JSON.parse((await done).request().postData() ?? '{}')
    expect(body.away).toEqual({ name: 'off', phone: 'off', address: 'required' })
    // The guest now picks delivery or pickup, so both switches show.
    await expect(page.getByRole('switch', { name: 'Delivery', exact: true })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Pickup', exact: true })).toBeVisible()

    const { cart, close } = await cartOf(browser, restaurant.public_url)
    await expect(cart.getByRole('radio', { name: 'Delivery' })).toBeChecked()
    await cart.getByRole('button', { name: /Place order|WhatsApp/ }).click()
    await expect(cart).toContainText('Add your address for the delivery.')
    await close()

    await page.reload()
    await expect(
      page
        .getByRole('tablist', { name: 'Delivery address: what to ask' })
        .getByRole('tab', { name: 'Required' }),
    ).toHaveAttribute('aria-selected', 'true')
  })
})
