import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'

/**
 * The Restaurant page's edges: the exchange rate written either way round,
 * a second currency that still prices dishes, and menu links the server
 * refuses or writes back as the one the menu already had.
 */

/** Saves the form and waits for the server's answer. */
async function save(page: Page) {
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/restaurant') && response.request().method() !== 'GET',
  )
  await page.getByRole('button', { name: either('Save changes', 'حفظ التغييرات') }).click()
  return saved
}

const POUNDS_AND_DOLLARS = {
  package: 'pro',
  currency: 'LBP',
  second_currency: 'USD',
  exchange_rate: '89000',
} as const

test.describe('restaurant: edge cases', () => {
  test('a rate only turned round saves as it was, not as its rounded inverse', async ({
    page,
    owner,
  }) => {
    await owner(POUNDS_AND_DOLLARS)
    await page.goto('/restaurant')
    const rate = page.getByLabel(/^Exchange rate/)
    await expect(rate).toHaveValue('89000')

    await page.getByRole('tab', { name: '1 LBP' }).click()
    await expect(rate).toHaveValue('0.000011236')
    const body = await (await save(page)).json()
    expect(Number(body.data.exchange_rate)).toBe(89000)

    await page.reload()
    await expect(page.getByRole('tab', { name: '1 USD' })).toHaveAttribute('aria-selected', 'true')
    await expect(rate).toHaveValue('89000')
  })

  test('a rate typed the other way round is saved as main per one second', async ({
    page,
    owner,
  }) => {
    await owner(POUNDS_AND_DOLLARS)
    await page.goto('/restaurant')
    await page.getByRole('tab', { name: '1 LBP' }).click()
    // 1 LBP = 0.00001 USD is 1 USD = 100,000 LBP.
    await page.getByLabel(/^Exchange rate/).fill('0.00001')
    const body = await (await save(page)).json()
    expect(Number(body.data.exchange_rate)).toBeCloseTo(100000, 4)

    await page.reload()
    await expect(page.getByLabel(/^Exchange rate/)).toHaveValue('100000')
  })

  test('a second currency that still prices a dish cannot be taken away until the dish moves', async ({
    page,
    owner,
  }) => {
    await owner({
      ...POUNDS_AND_DOLLARS,
      categories: [
        {
          name: { en: 'Grills' },
          dishes: [{ name: { en: 'Burger' }, price: 5, currency: 'USD' }],
        },
      ],
    })
    await page.goto('/restaurant')
    const second = page.getByRole('combobox', { name: /^Second currency/ })
    await second.click()
    await page.getByRole('option', { name: 'None' }).click()
    await expect(page.getByLabel(/^Exchange rate/)).toHaveCount(0)

    expect((await save(page)).status()).toBe(422)
    await expect(second).toHaveAccessibleDescription(
      /1 dish is priced in USD\. Move it to LBP first\./,
    )

    // The dish moves to pounds; then the dollars can go.
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Burger' }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('tablist', { name: 'Dish currency' })
      .getByRole('tab', { name: 'LBP' })
      .click()
    await dialog.getByLabel(/^Price/).fill('450000')
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()

    await page.goto('/restaurant')
    await second.click()
    await page.getByRole('option', { name: 'None' }).click()
    const body = await (await save(page)).json()
    expect(body.data.second_currency).toBeNull()
    expect(body.data.exchange_rate).toBeNull()

    // Without a second currency the dish form has no currency to pick.
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Burger' }).click()
    await expect(dialog.getByRole('tablist', { name: 'Dish currency' })).toHaveCount(0)
  })

  test('a main currency that is also the second one is caught before saving', async ({
    page,
    owner,
  }) => {
    await owner(POUNDS_AND_DOLLARS)
    await page.goto('/restaurant')
    const main = page.getByRole('combobox', { name: /^Currency/ })
    await main.click()
    await main.fill('USD')
    await page.getByRole('option', { name: /^USD/ }).first().click()

    let sent = false
    page.on('request', (request) => {
      if (request.url().endsWith('/api/restaurant') && request.method() === 'PATCH') sent = true
    })
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('combobox', { name: /^Second currency/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(sent).toBe(false)
  })

  test('a menu link another restaurant has, or the app keeps for itself, is refused', async ({
    page,
    owner,
    scenario,
  }) => {
    const other = await scenario()
    await owner()
    await page.goto('/restaurant')
    const link = page.getByRole('textbox', { name: 'Link' })

    for (const taken of [other.restaurant.slug, 'admin']) {
      await link.fill(taken)
      await page.getByRole('button', { name: 'Change link' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Change link' }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(link).toHaveAccessibleDescription(/That link is already taken/)
    }
  })

  test('a link the server writes back as the one the menu has leaves the box clean', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner()
    await page.goto('/restaurant')
    const link = page.getByRole('textbox', { name: 'Link' })
    const change = page.getByRole('button', { name: 'Change link' })

    // Capitals and spaces for dashes: the same link, as the server writes it.
    await link.fill(restaurant.slug.toUpperCase().replace(/-/g, ' '))
    await change.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Change link' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(link).toHaveValue(restaurant.slug)
    await expect(change).toBeDisabled()
  })
})
