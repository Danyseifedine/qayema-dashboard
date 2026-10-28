import { expect, test } from '../../support/fixtures'

/**
 * A menu in Lebanese pounds with a dish in dollars: each dish reads in its
 * own money, and the cart, the order and its total are in pounds at the
 * owner's rate.
 */
test.describe('two currencies', () => {
  test('a guest orders a dollar dish and a pound dish, with one total in pounds', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      currency: 'LBP',
      second_currency: 'USD',
      exchange_rate: '89000',
      categories: [
        {
          name: { en: 'Grills' },
          dishes: [
            { name: { en: 'Burger' }, price: 5, currency: 'USD' },
            { name: { en: 'Kafta' }, price: 450000 },
          ],
        },
      ],
    })
    await page.goto(restaurant.restaurant.public_url)

    const burger = page.locator('article.dish', { hasText: 'Burger' })
    const kafta = page.locator('article.dish', { hasText: 'Kafta' })
    await expect(burger.locator('.price')).toHaveText('$5')
    await expect(kafta.locator('.price')).toHaveText('L.L 450,000')

    await burger.getByRole('button', { name: 'Add Burger' }).click()
    await burger.getByRole('button', { name: 'Add', exact: true }).click()
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()

    const cart = page.locator('aside.col-aside')
    // Each line in its own money; the total in pounds at the rate, which it names.
    await expect(cart.locator('.cart-line', { hasText: 'Burger' })).toContainText('$10')
    await expect(cart.locator('.cart-line', { hasText: 'Kafta' })).toContainText('L.L 450,000')
    await expect(cart.locator('.cart-total')).toContainText('L.L 1,340,000')
    await expect(cart.locator('.cart-rate')).toHaveText('$1 = L.L 89,000')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    expect((await response.json()).data.total).toBe('1340000.00')
  })

  test('the owner adds dollars beside pounds and prices a dish in them', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      currency: 'LBP',
      categories: [{ name: { en: 'Grills' }, dishes: [{ name: { en: 'Burger' }, price: 5 }] }],
    })
    await page.goto('/restaurant')

    await page.getByRole('combobox', { name: /Second currency/ }).click()
    await page.getByRole('option', { name: /USD/ }).first().click()
    // Dollars and pounds start on the usual rate, written the readable way round.
    await expect(page.getByRole('tab', { name: '1 USD' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByLabel(/Exchange rate/)).toHaveValue(/89,?000/)
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/restaurant') && response.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    const body = await (await saved).json()
    expect(body.data.second_currency).toBe('USD')
    expect(body.data.exchange_rate).toBe('89000')

    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Burger', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('tablist', { name: 'Dish currency' })
      .getByRole('tab', { name: 'USD' })
      .click()
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('article', { hasText: 'Burger' }).first()).toContainText('$5')
  })
})
