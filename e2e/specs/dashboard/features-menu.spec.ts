import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * What each switch on the Features page does to the guest's menu, at once
 * (the menu's cache follows the switch) and undone when it is back on.
 * Variants are public/dish-choices.spec.ts; the dashboard side of every
 * switch is features.spec.ts.
 */

const BURGERS: ScenarioInput['categories'] = [
  {
    name: { en: 'Burgers', ar: 'برغر' },
    dishes: [
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
        addons: [{ name: { en: 'Extra cheese', ar: 'جبنة' }, price: 1 }],
      },
      { name: { en: 'Fries', ar: 'بطاطا' }, price: 3 },
    ],
  },
]

/** Flips a feature switch on the Features page and waits for the server to have it. */
async function flip(page: Page, name: RegExp) {
  await page.goto('/features')
  const toggle = page.getByRole('switch', { name })
  const was = await toggle.getAttribute('aria-checked')
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/api/features') && response.request().method() === 'PUT',
  )
  await toggle.click()
  expect((await saved).ok()).toBeTruthy()
  await expect(toggle).toHaveAttribute('aria-checked', was === 'true' ? 'false' : 'true')
}

/** The menu in a signed-out browser of its own. */
async function guest(browser: Browser, url: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const menu = await context.newPage()
  await menu.goto(url)
  return { menu, close: () => context.close() }
}

test.describe('features: what guests see', () => {
  test('Add-ons off takes the extras off the menu and keeps the sizes @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', categories: BURGERS })
    const sheetOf = async () => {
      const { menu, close } = await guest(browser, restaurant.public_url)
      await menu
        .locator('article.dish', { hasText: 'Burger' })
        .getByRole('button', { name: 'See options' })
        .click()
      return { sheet: menu.getByRole('dialog', { name: 'Burger' }), close }
    }

    await flip(page, either('Add-ons on', 'تشغيل الإضافات'))
    let { sheet, close } = await sheetOf()
    await expect(sheet.getByRole('group', { name: /Size/ })).toBeVisible()
    await expect(sheet.locator('label', { hasText: 'Extra cheese' })).toHaveCount(0)
    await close()

    await flip(page, either('Add-ons on', 'تشغيل الإضافات'))
    ;({ sheet, close } = await sheetOf())
    await expect(sheet.locator('label', { hasText: 'Extra cheese' })).toContainText('+$1')
    await close()
  })

  test('the second language off takes the language button off the menu, and back on returns it', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'premium',
      second_locale: 'ar',
      categories: BURGERS,
    })
    let { menu, close } = await guest(browser, restaurant.public_url)
    await expect(menu.getByRole('button', { name: 'Language' }).first()).toBeVisible()
    await close()

    await flip(page, /^Second language on$/)
    ;({ menu, close } = await guest(browser, restaurant.public_url))
    await expect(menu.getByRole('button', { name: 'Language' })).toHaveCount(0)
    await expect(menu.locator('article.dish', { hasText: 'Burger' })).toBeVisible()
    await close()

    await flip(page, /^Second language on$/)
    ;({ menu, close } = await guest(browser, restaurant.public_url))
    await expect(menu.getByRole('button', { name: 'Language' }).first()).toBeVisible()
    await close()
  })

  test('Delivery and pickup off leaves a menu to read, with nothing to order', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'premium',
      order_mode: 'menu',
      categories: BURGERS,
    })
    // Tables are a switch of their own; off too, nothing at all is ordered.
    await flip(page, /^Ordering at the table on$/)
    await flip(page, /^Delivery and pickup on$/)
    let { menu, close } = await guest(browser, restaurant.public_url)
    const fries = menu.locator('article.dish', { hasText: 'Fries' })
    await expect(fries.locator('.price')).toHaveText('$3')
    await expect(fries.getByRole('button', { name: 'Add Fries' })).toHaveCount(0)
    await expect(menu.locator('aside.col-aside')).toHaveCount(0)
    await close()

    await flip(page, /^Delivery and pickup on$/)
    ;({ menu, close } = await guest(browser, restaurant.public_url))
    await menu
      .locator('article.dish', { hasText: 'Fries' })
      .getByRole('button', { name: 'Add Fries' })
      .click()
    await expect(menu.locator('aside.col-aside .cart-line', { hasText: 'Fries' })).toBeVisible()
    await close()
  })

  test('ordering at the table off: a table’s code opens the menu with no order to the table', async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: BURGERS })
    await page.goto('/tables')
    await page.getByRole('button', { name: 'Add your tables' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('One by name').click()
    await dialog.getByLabel(/Table name/).fill('Terrace')
    await dialog.getByRole('button', { name: 'Add table' }).click()
    await expect(dialog).toBeHidden()
    const popup = page.waitForEvent('popup')
    await page
      .locator('article')
      .filter({ hasText: 'Terrace' })
      .getByRole('button', { name: 'Open the menu at this table' })
      .click()
    const atTable = (await popup).url()

    const order = async () => {
      const { menu, close } = await guest(browser, atTable)
      await menu
        .locator('article.dish', { hasText: 'Fries' })
        .getByRole('button', { name: 'Add Fries' })
        .click()
      return { cart: menu.locator('aside.col-aside'), close }
    }

    let { cart, close } = await order()
    await expect(cart).toContainText('Terrace')
    await close()

    await flip(page, /^Ordering at the table on$/)
    ;({ cart, close } = await order())
    await expect(cart.locator('.cart-line', { hasText: 'Fries' })).toBeVisible()
    await expect(cart).not.toContainText('Terrace')
    await close()
  })
})
