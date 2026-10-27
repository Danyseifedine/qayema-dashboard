import type { Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { pickPart } from '../../support/helpers'
import { DASHBOARD_URL } from '../../support/urls'

/**
 * "Build your own" on the menu (../qayema docs/architecture/build-your-own.md):
 * a pizza half and half from the Pizzas category, scoops from a list of
 * their own, priced on the page as the server prices the order.
 */
const PIZZERIA: ScenarioInput['categories'] = [
  {
    name: { en: 'Pizzas' },
    dishes: [
      { name: { en: 'Margherita' }, price: 12 },
      { name: { en: 'Pepperoni' }, price: 16 },
      {
        name: { en: 'Build your pizza' },
        price: null,
        builds: [
          {
            name: { en: 'Your pizza' },
            shape: 'split',
            parts: [1, 2],
            category: 'Pizzas',
            // The owner's own price for a Margherita half.
            part_prices: { Margherita: { '2': '7' } },
          },
        ],
      },
    ],
  },
  {
    name: { en: 'Ice cream' },
    dishes: [
      {
        name: { en: 'Three scoops' },
        price: 4,
        builds: [
          {
            name: { en: 'Your scoops' },
            shape: 'pieces',
            parts: [3],
            choices: [
              { name: { en: 'Vanilla' }, price: 0 },
              { name: { en: 'Pistachio' }, price: 1 },
            ],
          },
        ],
      },
    ],
  },
]

/** Pizzas priced only by size: the guest picks the size, then each half. */
const BY_SIZE: ScenarioInput['categories'] = [
  {
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
      {
        name: { en: 'Pepperoni' },
        price: null,
        variants: [
          {
            name: { en: 'Size' },
            options: [
              { name: { en: 'Small' }, price: 10 },
              { name: { en: 'Large' }, price: 16 },
            ],
          },
        ],
      },
      {
        name: { en: 'Build your pizza' },
        price: null,
        builds: [{ name: { en: 'Your pizza' }, shape: 'split', parts: [2], category: 'Pizzas' }],
      },
    ],
  },
]

function dish(page: Page, name: string): Locator {
  return page.locator('article.dish', { hasText: name })
}

async function openCart(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) >= 1024) return page.locator('aside.col-aside')
  await page.getByRole('button', { name: 'Your cart' }).click()
  return page.locator('#cart-sheet')
}

test.describe('build your own on the menu', () => {
  test('a guest builds a pizza half and half and three scoops, and the order carries them @matrix', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      overrides: [{ feature: 'build_your_own', value: 1 }],
      categories: PIZZERIA,
    })
    await page.goto(restaurant.restaurant.public_url)

    // Above the search, with no price until it is built.
    const tile = page.locator('.builds article.dish', { hasText: 'Build your pizza' })
    await expect(page.getByRole('region', { name: 'Make it your way' })).toContainText(
      'Build your pizza',
    )
    await expect(tile.getByRole('button', { name: 'Build yours' })).toBeVisible()
    await expect(tile.locator('.price')).toHaveCount(0)
    await dish(page, 'Build your pizza').click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    await expect(sheet).toBeVisible()

    await sheet.getByText('Half & half').click()
    const parts = sheet.locator('.build-pick-button')
    await expect(parts).toHaveCount(2)
    await expect(parts.nth(0)).toHaveText('1Margherita$7')
    // Its own list, not the browser's: Escape closes it and leaves the sheet open.
    await parts.nth(1).click()
    // The new half starts on the first choice, which the list opens on.
    await expect(sheet.getByRole('option', { name: /^Margherita/ })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sheet.getByRole('listbox')).toBeHidden()
    await expect(sheet).toBeVisible()
    await expect(parts.nth(1)).toBeFocused()
    await pickPart(sheet, 1, 'Pepperoni')
    await expect(parts.nth(1)).toHaveText('2Pepperoni$8')
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('Add$15')
    await add.click()
    await expect(sheet).toBeHidden()

    await dish(page, 'Three scoops').click()
    const scoops = page.getByRole('dialog', { name: 'Three scoops' })
    await expect(scoops.locator('.build-pick-button')).toHaveCount(3)
    await expect(scoops.locator('.build-pick-button').first()).toHaveText('1VanillaFree')
    await pickPart(scoops, 1, 'Pistachio')
    await expect(scoops.locator('.dish-sheet-add')).toHaveText('Add$5')
    await scoops.locator('.dish-sheet-add').click()
    await expect(scoops).toBeHidden()

    const cart = await openCart(page)
    const lines = cart.locator('.cart-line')
    await expect(lines.filter({ hasText: 'Build your pizza' })).toContainText(
      '½ Margherita + ½ Pepperoni',
    )
    await expect(lines.filter({ hasText: 'Three scoops' })).toContainText('2 × Vanilla, Pistachio')
    await expect(cart.locator('.cart-total')).toHaveText('Total$20')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = (await (await placed).json()) as { data: { reference: string; total: string } }
    expect(answer.data.total).toBe('20.00')

    // The owner reads what was built on the order.
    await page.goto(`${DASHBOARD_URL}/orders`)
    const card = page.getByRole('article').filter({ hasText: answer.data.reference })
    await expect(card).toContainText('Your pizza: ½ Margherita + ½ Pepperoni')
    await expect(card).toContainText('Your scoops: 2 × Vanilla, Pistachio')
  })

  test('a guest picks the size of pizzas priced by size, then each half at that size', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      overrides: [{ feature: 'build_your_own', value: 1 }],
      categories: BY_SIZE,
    })
    await page.goto(restaurant.restaurant.public_url)

    await page.locator('.builds article.dish', { hasText: 'Build your pizza' }).click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    const sizes = sheet.getByRole('radiogroup', { name: 'Size' })
    await expect(sizes.getByRole('radio', { name: 'Small' })).toBeChecked()
    const parts = sheet.locator('.build-pick-button')
    await expect(parts.nth(0)).toHaveText('1Margherita$4')

    await sizes.getByText('Large').click()
    await expect(parts.nth(0)).toHaveText('1Margherita$6')
    await pickPart(sheet, 1, 'Pepperoni')
    await expect(parts.nth(1)).toHaveText('2Pepperoni$8')
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('Add$14')
    await add.click()
    await expect(sheet).toBeHidden()

    const cart = await openCart(page)
    await expect(cart.locator('.cart-line')).toContainText('½ Margherita + ½ Pepperoni (Large)')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = (await (await placed).json()) as { data: { reference: string; total: string } }
    expect(answer.data.total).toBe('14.00')

    await page.goto(`${DASHBOARD_URL}/orders`)
    await expect(
      page.getByRole('article').filter({ hasText: answer.data.reference }),
    ).toContainText('Your pizza: ½ Margherita + ½ Pepperoni (Large)')
  })

  test('without the feature the dish priced by its build is not on offer to build', async ({
    page,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', order_mode: 'menu', categories: PIZZERIA })
    await page.goto(restaurant.restaurant.public_url)

    await expect(dish(page, 'Margherita')).toBeVisible()
    await expect(page.locator('.build-pick-button')).toHaveCount(0)
    await expect(dish(page, 'Three scoops')).not.toHaveClass(/has-choices/)
  })
})
