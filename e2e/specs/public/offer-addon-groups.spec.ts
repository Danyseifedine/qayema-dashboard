import { expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * Offers on dishes with add-on groups (../qayema docs/architecture/offers.md
 * and pos-connection-plan.md section 6), ordering in the menu: a percent, an
 * amount and a pair deal take their discount off the dish's own price and
 * its size only, while every add-on, grouped or not, keeps its price. The
 * sheet, the cart, the order the server keeps, the guest's tracking and the
 * owner's card must all say the same amounts, worked out by hand here.
 */

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Kitchen' },
    dishes: [
      {
        name: { en: 'Pizza' },
        price: 10,
        variants: [
          {
            name: { en: 'Size' },
            options: [
              { name: { en: 'Small' }, price: 0 },
              { name: { en: 'Large' }, price: 4 },
            ],
          },
        ],
        addons: [{ name: { en: 'Olives' }, price: 1 }],
        addon_groups: [
          {
            name: { en: 'Sauces' },
            min: 1,
            max: 2,
            addons: [
              { name: { en: 'Garlic' }, price: 0.5 },
              { name: { en: 'Chili' }, price: 0.75 },
            ],
          },
        ],
      },
      {
        name: { en: 'Burger' },
        price: 9,
        addon_groups: [
          {
            name: { en: 'Side' },
            min: 0,
            max: 1,
            addons: [
              { name: { en: 'Fries' }, price: 2.5 },
              { name: { en: 'Salad' }, price: 2 },
            ],
          },
        ],
      },
      {
        name: { en: 'Wrap' },
        price: 8,
        addon_groups: [
          {
            name: { en: 'Extras' },
            min: 0,
            max: null,
            addons: [{ name: { en: 'Cheese' }, price: 1 }],
          },
        ],
      },
    ],
  },
]

const OFFERS: NonNullable<ScenarioInput['offers']> = [
  {
    title: { en: 'Pizza week' },
    placements: ['banner'],
    discount_type: 'percent',
    discount_value: 20,
    dishes: ['Pizza'],
  },
  {
    title: { en: 'Burger deal' },
    placements: ['banner'],
    discount_type: 'amount',
    discount_value: 3,
    dishes: ['Burger'],
  },
  {
    title: { en: 'Wrap pair' },
    placements: ['banner'],
    discount_type: 'second',
    discount_value: 50,
    dishes: ['Wrap'],
  },
]

test.describe('offers on dishes with add-on groups', () => {
  test('the discount comes off the dish and its size, every add-on keeps its price, and every screen agrees', async ({
    browser,
    page,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MENU,
      offers: OFFERS,
    })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    })
    const guest = await context.newPage()
    const errors: string[] = []
    guest.on('pageerror', (error) => errors.push(error.message))
    await guest.goto(restaurant.restaurant.public_url)
    const card = (name: string) => guest.locator('article.dish', { hasText: name })

    // Cards: the cheapest choices with the discount ($10 less 20%, $9 less $3).
    await expect(card('Pizza').locator('.price')).toHaveText('$8')
    await expect(card('Pizza').locator('.price-was')).toHaveText('$10')
    await expect(card('Burger').locator('.price')).toHaveText('$6')
    await expect(card('Wrap').locator('.dish-badge')).toHaveText('Buy 2, 2nd 50% off')

    // Pizza, Large with olives and two sauces: ($14 less 20%) + $2.25 = $13.45, twice.
    for (let time = 0; time < 2; time++) {
      await card('Pizza').click()
      const sheet = guest.getByRole('dialog', { name: 'Pizza' })
      await sheet.getByText('Large', { exact: true }).click()
      await sheet.getByText('Olives', { exact: true }).click()
      await sheet.getByText('Garlic', { exact: true }).click()
      await sheet.getByText('Chili', { exact: true }).click()
      await expect(sheet.locator('[data-dish-price]')).toHaveText('$13.45')
      await expect(sheet.locator('[data-dish-was]')).toHaveText('$16.25')
      await sheet.locator('.dish-sheet-add').click()
      await expect(sheet).toBeHidden()
    }

    // Burger with fries: ($9 less $3) + $2.50 = $8.50.
    await card('Burger').click()
    const burger = guest.getByRole('dialog', { name: 'Burger' })
    await burger.getByText('Fries', { exact: true }).click()
    await expect(burger.getByRole('checkbox', { name: /Salad/ })).toBeDisabled()
    await expect(burger.locator('[data-dish-price]')).toHaveText('$8.50')
    await burger.locator('.dish-sheet-add').click()
    await expect(burger).toBeHidden()

    // Two wraps with cheese: $9, then the second at half its own price plus the cheese, $5.
    for (let time = 0; time < 2; time++) {
      await card('Wrap').click()
      const wrap = guest.getByRole('dialog', { name: 'Wrap' })
      await wrap.getByText('Cheese', { exact: true }).click()
      await expect(wrap.locator('[data-dish-price]')).toHaveText('$9')
      await wrap.locator('.dish-sheet-add').click()
      await expect(wrap).toBeHidden()
    }

    const cart = guest.locator('.col-aside')
    const line = (name: string) => cart.locator('.cart-line', { hasText: name })
    await expect(line('Pizza').locator('.cart-line-total')).toHaveText('$32.50$26.90')
    await expect(line('Burger').locator('.cart-line-total')).toHaveText('$11.50$8.50')
    await expect(line('Wrap')).toContainText('1 at 50% off')
    await expect(line('Wrap').locator('.cart-line-total')).toHaveText('$18$14')
    await expect(cart.locator('.cart-total')).toHaveText('Total$49.40')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = guest.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    const response = await placed
    expect(response.status()).toBe(201)
    const { data } = (await response.json()) as { data: { total: string; tracking_url: string } }
    expect(data.total).toBe('49.40')

    // The guest's tracking keeps each line, its offer and the line's price before (two pizzas, $32.50).
    await guest.goto(data.tracking_url)
    const tracking = guest.getByRole('dialog', { name: 'Order tracking' })
    await expect(
      tracking.locator('.track-lines li', { hasText: 'Pizza' }).locator('.track-line-offer'),
    ).toHaveText('Pizza week$32.50')
    await expect(
      tracking.locator('.track-lines li', { hasText: 'Burger' }).locator('.track-line-offer'),
    ).toHaveText('Burger deal$11.50')
    await expect(tracking).toContainText('$49.40')
    expect(errors, 'uncaught errors on the menu').toEqual([])
    await context.close()

    // The owner's card says the same total and choices.
    await page.goto('/orders')
    const order = page.getByRole('article').first()
    await expect(order).toContainText('$49.40')
    await expect(order).toContainText('Garlic')
    await expect(order).toContainText('Fries')
  })
})
