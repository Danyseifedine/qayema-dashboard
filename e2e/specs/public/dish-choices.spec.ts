import type { Locator, Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { DASHBOARD_URL } from '../../support/urls'

const BURGERS: ScenarioInput['categories'] = [
  {
    name: { en: 'Burgers' },
    dishes: [
      {
        name: { en: 'Burger', ar: 'برغر' },
        price: 8,
        ingredients: { en: 'Beef, pickles' },
        variants: [
          {
            name: { en: 'Size', ar: 'الحجم' },
            options: [
              { name: { en: 'Small', ar: 'صغير' }, price: 0 },
              { name: { en: 'Large', ar: 'كبير' }, price: 3 },
            ],
          },
          {
            name: { en: 'Spice level' },
            options: [{ name: { en: 'Mild' } }, { name: { en: 'Hot' } }],
          },
        ],
        addons: [
          { name: { en: 'Extra cheese', ar: 'جبنة إضافية' }, price: 1 },
          { name: { en: 'Bacon' }, price: 2.5 },
        ],
      },
      { name: { en: 'Fries' }, price: 3 },
    ],
  },
]

function dish(page: Page, name: string): Locator {
  return page.locator('article.dish', { hasText: name })
}

/** The cart: its own column on a wide screen, a sheet from the header on a phone. */
async function openCart(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) >= 1024) return page.locator('aside.col-aside')
  await page.getByRole('button', { name: 'Your cart' }).click()
  return page.locator('#cart-sheet')
}

test.describe('dish variants and add-ons on the menu', () => {
  test('a guest picks a size, a spice level and add-ons, and the order carries them @matrix', async ({
    page,
    owner,
  }) => {
    // Ordered in the menu, so the order lands on the owner's Orders page.
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: BURGERS,
    })
    await page.goto(restaurant.restaurant.public_url)

    const burger = dish(page, 'Burger')
    await expect(burger.locator('.price')).toHaveText('$8.00')

    await burger.getByRole('button', { name: 'See options: Burger' }).click()
    const sheet = page.getByRole('dialog', { name: 'Burger' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('Beef, pickles')
    // The first option of each variant is picked to start.
    await expect(sheet.getByRole('radio', { name: /Small/ })).toBeChecked()
    await expect(sheet.getByRole('radio', { name: /Mild/ })).toBeChecked()
    // A choice with no price says it is free.
    await expect(sheet.locator('label', { hasText: 'Mild' })).toContainText('Free')

    await sheet.getByText('Large').click()
    await sheet.getByText('Hot').click()
    await sheet.getByText('Extra cheese').click()
    await expect(sheet.getByRole('checkbox', { name: /Extra cheese/ })).toBeChecked()
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('Add$24.00')
    await add.click()
    await expect(sheet).toBeHidden()
    await expect(burger.locator('.add-count')).toHaveText('2')

    // The same burger again, as it comes: a line of its own.
    await burger.getByRole('button', { name: 'See options: Burger' }).click()
    await expect(add).toHaveText('Add$8.00')
    await add.click()
    // The page behind takes no typing until the sheet has slid away.
    await expect(sheet).toBeHidden()
    await expect(burger.locator('.add-count')).toHaveText('3')

    const cart = await openCart(page)
    const lines = cart.locator('.cart-line')
    await expect(lines).toHaveCount(2)
    await expect(lines.nth(0)).toContainText('Large, Hot, + Extra cheese')
    await expect(lines.nth(0)).toContainText('$12.00 each')
    await expect(lines.nth(1)).toContainText('Small, Mild')
    await expect(cart.locator('.cart-total')).toHaveText('Total$32.00')

    await cart.getByLabel('Your name').fill('Rami')

    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = (await (await placed).json()) as { data: { reference: string; total: string } }
    expect(answer.data.total).toBe('32.00')
    await expect(page.getByRole('status').filter({ hasText: answer.data.reference })).toBeVisible()

    // The owner reads the same choices on the order. (The WhatsApp message
    // lists them too: tests/Feature/Orders/OrderChoicesTest in ../qayema.)
    await page.goto(`${DASHBOARD_URL}/orders`)
    const card = page.getByRole('article').filter({ hasText: answer.data.reference })
    await expect(card).toContainText('Size: Large · Spice level: Hot · + Extra cheese')
    await expect(card).toContainText('Size: Small · Spice level: Mild')
    await expect(card).toContainText('$32.00')
  })

  test('a sandwich priced by its size shows the sizes as prices, not extras', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [
        {
          name: { en: 'Sandwiches' },
          dishes: [
            {
              name: { en: 'Taouk' },
              price: null,
              variants: [
                {
                  name: { en: 'Size' },
                  options: [
                    { name: { en: 'Small' }, price: 7 },
                    { name: { en: 'Large' }, price: 12 },
                  ],
                },
              ],
              addons: [{ name: { en: 'Fries inside' }, price: 1 }],
            },
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const taouk = dish(page, 'Taouk')
    await expect(taouk.locator('.price')).toHaveText('$7.00')
    await taouk.getByRole('button', { name: 'See options: Taouk' }).click()
    const sheet = page.getByRole('dialog', { name: 'Taouk' })
    await expect(sheet.locator('label', { hasText: 'Small' })).toContainText('$7.00')
    await expect(sheet.locator('label', { hasText: 'Small' })).not.toContainText('+')
    await expect(sheet.locator('label', { hasText: 'Fries inside' })).toContainText('+$1.00')

    await sheet.getByText('Large').click()
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$12.00')
    await sheet.locator('.dish-sheet-add').click()
    const cart = await openCart(page)
    await expect(cart.locator('.cart-total')).toHaveText('Total$12.00')
  })

  test('without ordering, a guest still sees the choices and their prices', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', categories: BURGERS })
    await page.goto(owner.restaurant.public_url)

    const burger = dish(page, 'Burger')
    await expect(burger.getByRole('button', { name: /^Add/ })).toHaveCount(0)
    await burger.getByRole('button', { name: 'See options' }).click()

    const sheet = page.getByRole('dialog', { name: 'Burger' })
    await expect(sheet.locator('label', { hasText: 'Large' })).toContainText('+$3.00')
    await expect(sheet.getByRole('checkbox', { name: /Bacon/ })).toBeAttached()
    await sheet.getByText('Large').click()
    await expect(sheet.locator('[data-dish-price]')).toHaveText('$11.00')
    await expect(sheet.locator('.dish-sheet-add')).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    // A tap anywhere on the card opens it too, and the cross closes it.
    await burger.locator('.dish-name').click()
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
  })

  test('an Arabic menu names the choices in Arabic, and English where none was written', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'premium', second_locale: 'ar', categories: BURGERS })
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await dish(page, 'برغر').getByRole('button', { name: 'عرض الخيارات: برغر' }).click()
    const sheet = page.getByRole('dialog', { name: 'برغر' })
    await expect(sheet.getByRole('group', { name: /الحجم/ })).toContainText('اختر واحدًا')
    await expect(sheet.getByRole('radio', { name: 'كبير' })).toBeAttached()
    await expect(sheet.getByRole('group', { name: /Spice level/ })).toBeVisible()
    await expect(sheet.getByRole('group', { name: /الإضافات/ })).toContainText('اختياري')
  })

  test('an owner adds a dish with a size and an add-on, and guests can pick them @matrix', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'pro',
      categories: [{ name: { en: 'Burgers' } }],
    })
    await page.goto('/dishes')
    await page
      .getByRole('button', { name: either('Add dish', 'إضافة طبق') })
      .first()
      .click()

    const dialog = page.getByRole('dialog')
    const choices = dialog.getByRole('region', {
      name: either('Variants and add-ons', 'الخيارات والإضافات'),
    })
    await dialog.getByLabel(/^(Name|الاسم)/).fill('Burger')
    await dialog.getByLabel(/^(Price|السعر)/).fill('8')
    await choices.getByRole('button', { name: either('Size', 'الحجم'), exact: true }).click()
    await choices
      .getByLabel(either('Size, option 3, extra price', 'Size، الاختيار 3، السعر الإضافي'))
      .fill('3')
    await choices.getByRole('button', { name: either('Add add-on', 'إضافة جديدة') }).click()
    await choices.getByLabel(either('Add-on 1', 'الإضافة 1'), { exact: true }).fill('Extra cheese')
    await choices.getByLabel(either('Add-on 1, price', 'الإضافة 1، السعر')).fill('1')
    await expect(choices).toContainText(/\$8\.00.*\$12\.00/)

    await dialog.getByRole('button', { name: either('Add dish', 'إضافة الطبق') }).click()
    await expect(dialog).toBeHidden()

    const card = page.getByRole('article').filter({ hasText: 'Burger' })
    await expect(card).toContainText(/1 variant · 1 add-on|خيار واحد · إضافة واحدة/)

    // Guests see the choice, with what it costs.
    await page.goto(restaurant.public_url)
    await page
      .locator('article.dish', { hasText: 'Burger' })
      .getByRole('button', { name: 'See options' })
      .click()
    const sheet = page.getByRole('dialog', { name: 'Burger' })
    await expect(sheet.locator('label', { hasText: 'Large' })).toContainText('+$3.00')
    await expect(sheet.locator('label', { hasText: 'Extra cheese' })).toContainText('+$1.00')
  })

  test('switching variants off takes them off the menu and out of the form, and keeps them', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', categories: BURGERS })
    await page.goto('/features')
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features') && response.request().method() === 'PUT',
    )
    await page.getByRole('switch', { name: 'Variants on' }).click()
    expect((await saved).ok()).toBeTruthy()

    await page.goto(restaurant.public_url)
    const burger = dish(page, 'Burger')
    await expect(burger.locator('.price')).toHaveText('$8.00')
    await burger.getByRole('button', { name: 'See options: Burger' }).click()
    const sheet = page.getByRole('dialog', { name: 'Burger' })
    await expect(sheet.getByRole('group', { name: /Add-ons/ })).toBeVisible()
    await expect(sheet.getByRole('group', { name: /Size/ })).toHaveCount(0)

    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Burger' }).click()
    const choices = page.getByRole('dialog').getByRole('region', { name: 'Variants and add-ons' })
    await expect(choices.getByLabel('Add-on 1', { exact: true })).toHaveValue('Extra cheese')
    await expect(choices.getByRole('button', { name: 'Add variant' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Save dish' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // Back on, the sizes come back as they were.
    await page.goto('/features')
    const back = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features') && response.request().method() === 'PUT',
    )
    await page.getByRole('switch', { name: 'Variants on' }).click()
    expect((await back).ok()).toBeTruthy()
    await page.goto(restaurant.public_url)
    await dish(page, 'Burger').getByRole('button', { name: 'See options: Burger' }).click()
    await expect(sheet.getByRole('group', { name: /Size/ })).toBeVisible()
  })
})
