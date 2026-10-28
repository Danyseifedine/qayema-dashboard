import { devices, type Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'

/**
 * The dashboard as a phone app (below lg): what the third tab is for each
 * restaurant, the orders waiting on it, and a Save bar sitting on the tabs.
 * The tour of the four tabs and More is navigation.spec.ts.
 */

const { defaultBrowserType: _browser, ...PHONE } = devices['Pixel 7']

const tabs = (page: Page) =>
  page.getByRole('navigation', { name: either('Sections', 'أقسام اللوحة') })

test.describe('the phone layout', () => {
  test.use(PHONE)

  test('without orders the third tab is Analytics, and with neither the QR code', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', switched_off: ['orders', 'dine_in'] })
    await page.goto('/overview')
    await expect(tabs(page).getByRole('button')).toHaveText(['Home', 'Menu', 'Analytics', 'More'])
    await tabs(page).getByRole('button', { name: 'Analytics' }).click()
    await expect(page).toHaveURL(/\/analytics$/)
    await expect(tabs(page).getByRole('button', { name: 'Analytics' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Analytics switched off too: the QR code, which every restaurant has.
    await page.goto('/features')
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features') && response.request().method() === 'PUT',
    )
    await page.getByRole('switch', { name: 'Analytics on' }).click()
    expect((await saved).ok()).toBeTruthy()
    await expect(tabs(page).getByRole('button')).toHaveText(['Home', 'Menu', 'QR code', 'More'])
  })

  test('the Orders tab wears the orders waiting, and Categories keeps the Menu tab lit', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 2 })
    await page.goto('/overview')
    const orders = tabs(page).getByRole('button', { name: /^Orders/ })
    await expect(orders).toHaveAccessibleName(/2 orders waiting/)

    await page.goto('/categories')
    await expect(tabs(page).getByRole('button', { name: 'Menu' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await page.goto('/table-orders')
    await expect(orders).toHaveAttribute('aria-current', 'page')
  })

  test('a Save bar sits on the tabs, never under them', async ({ page, owner }) => {
    await owner({ package: 'premium' })
    await page.goto('/restaurant')
    await page.getByRole('textbox', { name: /^Restaurant name/ }).fill('Cedar & Salt')
    const save = page.getByRole('button', { name: 'Save changes' })
    await expect(save).toBeEnabled()

    const bar = (await tabs(page).boundingBox())!
    const button = (await save.boundingBox())!
    expect(button.y + button.height).toBeLessThanOrEqual(bar.y + 1)
    await expect(save).toBeInViewport()
  })
})
