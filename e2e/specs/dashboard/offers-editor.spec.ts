import type { Locator, Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { fixtureFile, guestMenu, openSidebar } from '../../support/helpers'

/**
 * The offer editor beyond the first offer (offers.spec.ts): an amount off
 * in a menu priced in Lebanese pounds with a dish in dollars, every dish's
 * name kept readable beside its long prices on a phone; the dish picker's
 * groups and search; a picture alone with a link; 2nd item; changing a
 * saved offer's schedule from its own step; leaving with changes; deleting
 * (a deal dish goes with its offer); dragging into a new order; the
 * package's places all in use; and the 30 offers a menu holds.
 */

const next = (page: Page) =>
  page.getByRole('button', { name: either('Next', 'التالي'), exact: true }).click()

async function newOffer(page: Page, title: string) {
  await page
    .getByRole('button', { name: either('Create your first offer', 'أنشئ أول عرض') })
    .click()
  await page
    .getByRole('textbox', { name: /^(Title|العنوان)/ })
    .first()
    .fill(title)
  await next(page)
}

/** The tick row of a dish in the picker. */
const dishRow = (page: Page, name: string | RegExp) => page.getByRole('checkbox', { name })

/** A dish's name is all there in its row: not cut short by the prices beside it. */
async function expectWholeName(row: Locator) {
  const name = row.locator('span[dir="auto"]').first()
  await expect(name).toBeVisible()
  expect(
    await name.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    `${await name.textContent()} is cut short`,
  ).toBe(true)
}

/** Pounds, with a dish in dollars at 89,000 pounds each. */
const POUNDS = {
  package: 'premium',
  currency: 'LBP',
  second_currency: 'USD',
  exchange_rate: '89000',
  categories: [
    {
      name: { en: 'Pizzas' },
      dishes: [
        { name: { en: 'Margherita' }, price: 1_250_000 },
        {
          name: { en: 'Pepperoni' },
          price: null,
          variants: [
            {
              name: { en: 'Size' },
              options: [
                { name: { en: 'Small' }, price: 900_000 },
                { name: { en: 'Large' }, price: 1_400_000 },
              ],
            },
          ],
        },
        { name: { en: 'Burger' }, price: 5, currency: 'USD' },
      ],
    },
  ],
} satisfies ScenarioInput

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}

test.describe('offer editor', () => {
  test('an amount off in pounds shows each dish before and after, a dollar dish at the rate @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner(POUNDS)
    await page.goto('/')
    const sections = await openSidebar(page)
    await sections.getByRole('button', { name: either('Offers', 'العروض') }).click()
    await newOffer(page, 'Pizza week')
    await next(page)

    await page
      .getByRole('tab', { name: either('A discount on your dishes', 'خصم على أطباقك') })
      .click()
    await page.getByRole('tab', { name: either('Amount off', 'مبلغ ثابت') }).click()
    const amount = page.getByRole('textbox', { name: either('Amount off', 'مبلغ الخصم') })
    await amount.fill('100000')
    for (const name of ['Margherita', 'Pepperoni', 'Burger']) await dishRow(page, name).click()

    // LBP 100,000 off each; the burger's $5.00 loses $1.12 (100,000 / 89,000).
    await expect(dishRow(page, 'Margherita')).toContainText(
      /LBP\s1,250,000 (becomes|يصبح) LBP\s1,150,000/,
    )
    await expect(dishRow(page, 'Pepperoni')).toContainText(
      /Small LBP\s900,000 (becomes|يصبح) LBP\s800,000/,
    )
    await expect(dishRow(page, 'Burger')).toContainText(/\$5\.00 (becomes|يصبح) \$3\.88/)
    // On a phone the prices go under the name rather than cutting it off.
    for (const name of ['Margherita', 'Pepperoni', 'Burger']) {
      await expectWholeName(dishRow(page, name))
    }

    // LBP 1,000,000 takes all of the burger ($5.00 is LBP 445,000): refused, in both currencies.
    await amount.fill('1000000')
    await next(page)
    await expect(page.getByText(/Burger.*\$5\.00 \(LBP\s445,000\)/)).toBeVisible()
    await expectWholeName(dishRow(page, 'Burger'))

    await amount.fill('100000')
    await next(page)
    await next(page)
    const line = /^(LBP\s100,000 off on 3 dishes|خصم LBP\s100,000 على 3 أطباق)$/
    await expect(page.getByText(line)).toBeVisible()
    await page.getByRole('button', { name: either('Add offer', 'إضافة العرض') }).click()
    await expect(page.getByRole('heading', { name: either('Review', 'مراجعة') })).toBeHidden()
    await expect(page.getByText(line)).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('article.dish', { hasText: 'Margherita' })).toContainText(
      '1,150,000',
    )
    await guest.context().close()
  })

  test('the dish picker groups the dishes guests build first, finds by name and selects a group', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      overrides: [{ feature: 'build_your_own', value: 1 }],
      categories: [
        GRILLS,
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            {
              name: { en: 'Build your pizza' },
              price: null,
              builds: [{ name: { en: 'Your pizza' }, category: 'Pizzas', parts: [1, 2] }],
            },
          ],
        },
      ],
    })
    await page.goto('/offers')
    await newOffer(page, 'Pizza night')
    await next(page)
    await page.getByRole('tab', { name: 'A discount on your dishes' }).click()

    const built = page.getByRole('group', { name: 'Dishes guests build' })
    await expect(built).toContainText('Priced by what each guest picks')
    await expect(built.getByRole('checkbox')).toHaveText('Build your pizza')
    const groups = page.getByRole('group', { name: 'Dishes' }).getByRole('group')
    await expect(groups).toHaveCount(3)
    await expect(groups.first()).toHaveAccessibleName('Dishes guests build')

    await page.getByRole('button', { name: 'Select all in Grills' }).click()
    await expect(dishRow(page, /Kafta/)).toHaveAttribute('aria-checked', 'true')
    await expect(dishRow(page, /Shish Taouk/)).toHaveAttribute('aria-checked', 'true')
    await expect(dishRow(page, /Margherita/)).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByText('2 chosen')).toBeVisible()
    await page.getByRole('button', { name: 'Clear Grills' }).click()
    await expect(page.getByText('0 chosen')).toBeVisible()

    const search = page.getByRole('searchbox', { name: 'Search your dishes' })
    await search.fill('marg')
    await expect(page.getByRole('group', { name: 'Dishes' }).getByRole('checkbox')).toHaveText([
      /Margherita/,
    ])
    await search.fill('sushi')
    await expect(page.getByText('No dish matches that.')).toBeVisible()
  })

  test('a picture alone needs its picture, and a link must start with https', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', categories: [GRILLS] })
    await page.goto('/offers')
    await page.getByRole('button', { name: 'Create your first offer' }).click()

    await page.getByRole('switch', { name: 'Write a title and text on it' }).click()
    await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveCount(0)
    await next(page)
    await expect(page.getByText('Add a picture, or switch on the title and text.')).toBeVisible()
    await page.locator('input[type="file"]').first().setInputFiles(fixtureFile('dish.jpg'))
    // Uploaded: the message goes at once.
    await expect(page.getByText('dish.jpg')).toBeVisible()
    await expect(page.getByText('Add a picture, or switch on the title and text.')).toBeHidden()
    await next(page)
    await expect(page.getByRole('heading', { name: 'Where and shape', level: 3 })).toBeVisible()
    await next(page)

    // Nothing to order: a tap opens a link.
    await page.getByRole('tab', { name: 'Open a link' }).click()
    const link = page.getByRole('textbox', { name: /^Link/ })
    await link.fill('example.com/menu')
    await next(page)
    await expect(page.getByText('Add a link that starts with https://.')).toBeVisible()
    await link.fill('https://example.com/menu')
    await next(page)
    await next(page)

    await expect(page.getByText('The picture alone')).toBeVisible()
    await expect(page.getByText('Opens https://example.com/menu')).toBeVisible()
    await expect(page.getByText('Nothing to order')).toBeVisible()
    await page.getByRole('button', { name: 'Add offer' }).click()
    await expect(page.getByRole('button', { name: 'Edit Picture only' })).toBeVisible()
  })

  test('a 2nd item offer is free first, then a percent off the second one', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', categories: [GRILLS] })
    await page.goto('/offers')
    await newOffer(page, 'Two for one')
    await next(page)
    await page.getByRole('tab', { name: 'A discount on your dishes' }).click()
    await page.getByRole('tab', { name: '2nd one off' }).click()
    await expect(page.getByRole('tab', { name: 'Free' })).toHaveAttribute('aria-selected', 'true')
    await dishRow(page, /Kafta/).click()
    await dishRow(page, /Shish Taouk/).click()
    await expect(dishRow(page, /Kafta/)).toContainText('$12.50, 2nd free')
    await next(page)
    await next(page)
    await page.getByRole('button', { name: 'Add offer' }).click()
    await expect(page.getByText('2nd one free on 2 dishes')).toBeVisible()

    // Changed to half off the second one, saved from the step itself.
    await page.getByRole('button', { name: 'Edit Two for one' }).first().click()
    await page.getByRole('button', { name: /^Step 3: What guests get/ }).click()
    await page
      .getByRole('tablist', { name: 'The second one' })
      .getByRole('tab', { name: 'Percent off' })
      .click()
    await expect(page.getByRole('textbox', { name: 'Percent off the second one' })).toHaveValue(
      '50',
    )
    await expect(dishRow(page, /Kafta/)).toContainText('$12.50, 2nd $6.25')
    await page.getByRole('textbox', { name: 'Percent off the second one' }).fill('101')
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(
      page.getByText('The second one can be at most 100% off, which makes it free.'),
    ).toBeVisible()
    await page.getByRole('textbox', { name: 'Percent off the second one' }).fill('50')
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(page.getByText('2nd one 50% off on 2 dishes')).toBeVisible()
  })

  test('a saved offer gets a schedule from its own step: some weekdays, a time, an end date, shown all the time', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      categories: [GRILLS],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
        },
      ],
    })
    // Tomorrow in the restaurant's time zone, so the deal is never live while this runs.
    const tomorrow = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Beirut',
    }).format(Date.now() + 86_400_000)
    await page.goto('/offers')
    await page.getByRole('button', { name: 'Edit Grill week' }).first().click()
    await page.getByRole('button', { name: /^Step 4: When/ }).click()

    await page.getByRole('tab', { name: 'On a schedule' }).click()
    await page.getByRole('tab', { name: 'Some weekdays' }).click()
    await expect(page.getByText(/^Runs: on the weekdays you pick, all day/)).toBeVisible()
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(page.getByText('Pick at least one day of the week.')).toBeVisible()
    await page
      .getByRole('group', { name: 'Days of the week' })
      .getByTitle(tomorrow, { exact: true })
      .click()

    await page.getByRole('switch', { name: 'All day' }).click()
    await expect(page.getByRole('combobox', { name: 'Time 1 starts: hour' })).toHaveValue('5')

    // The end: the 15th of next month, on the calendar.
    await page.getByRole('combobox', { name: /^Until(?!:)/ }).click()
    const calendar = page.getByRole('dialog', { name: 'Choose a day' })
    await calendar.getByRole('button', { name: 'Next month' }).click()
    await calendar.getByRole('button', { name: /\b15, 20\d\d$/ }).click()
    await expect(calendar).toBeHidden()

    await page.getByRole('switch', { name: 'Show it all the time' }).click()
    const sentence = new RegExp(
      `^Runs: every ${tomorrow}, 5:00\\sPM to 7:00\\sPM, until \\w{3} 15, shown all the time`,
    )
    // The sentence, then the time zone on a line of its own.
    await expect(page.getByText(sentence)).toBeVisible()
    await page.getByRole('button', { name: 'Save offer' }).click()

    await expect(page.getByRole('heading', { name: 'Edit offer' })).toBeHidden()
    // The card capitalises the sentence's first letter in CSS only.
    await expect(
      page.getByText(
        new RegExp(
          `^every ${tomorrow}, 5:00\\sPM to 7:00\\sPM, until \\w{3} 15, shown all the time$`,
        ),
      ),
    ).toBeVisible()
    await expect(page.getByText(/^Shown, deal from /)).toBeVisible()
  })

  test('the end date cannot be a day already gone', async ({ page, owner }) => {
    await owner({ package: 'premium', categories: [GRILLS] })
    await page.goto('/offers')
    await newOffer(page, 'Lunch')
    await next(page)
    await next(page)
    await page.getByRole('tab', { name: 'On a schedule' }).click()
    await page.getByRole('combobox', { name: /^Until(?!:)/ }).click()
    const calendar = page.getByRole('dialog', { name: 'Choose a day' })
    const today = calendar.locator('[aria-current="date"]')
    await expect(today).toBeEnabled()
    await expect(calendar.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  })

  test('leaving with changes asks first, and Leave drops them', async ({ page, owner }) => {
    await owner({
      package: 'premium',
      offers: [{ title: { en: 'Happy hour' }, placements: ['banner'] }],
    })
    await page.goto('/offers')
    await page.getByRole('button', { name: 'Edit Happy hour' }).first().click()
    await page.getByRole('textbox', { name: /^Title/ }).fill('Sad hour')

    await page.getByRole('button', { name: 'Back to your offers' }).click()
    const dialog = page.getByRole('dialog', { name: 'Leave without saving?' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveValue('Sad hour')

    await page.getByRole('button', { name: 'Back to your offers' }).click()
    await dialog.getByRole('button', { name: 'Leave' }).click()
    await expect(page.getByRole('button', { name: 'Edit Happy hour' }).first()).toBeVisible()
    await expect(page.getByText('Sad hour')).toHaveCount(0)
  })

  test('deleting an offer takes it off the menu, its deal dish with it', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      categories: [GRILLS, { name: { en: 'Deals' }, dishes: [] }],
      offers: [
        { title: { en: 'Happy hour' }, placements: ['banner'] },
        {
          title: { en: 'Family night' },
          placements: ['banner'],
          deal: { name: { en: 'Family meal' }, price: 25, category: 'Deals' },
        },
      ],
    })
    await page.goto('/offers')

    await page.getByRole('button', { name: 'Delete Family night' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this offer?' })
    await dialog.getByRole('button', { name: 'Delete offer' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Offer deleted')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit Family night' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit Happy hour' }).first()).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('.offers-banner .offer', { hasText: 'Happy hour' })).toBeVisible()
    await expect(guest.getByText('Family night')).toHaveCount(0)
    await expect(guest.getByText('Family meal')).toHaveCount(0)
    await guest.context().close()

    await page.goto('/dishes')
    await expect(page.locator('article', { hasText: 'Kafta' })).toBeVisible()
    await expect(page.locator('article', { hasText: 'Family meal' })).toHaveCount(0)
  })

  test('dragging an offer changes the order for good', async ({ page, owner }) => {
    await owner({
      package: 'premium',
      offers: [
        { title: { en: 'First' }, placements: ['banner'] },
        { title: { en: 'Second' }, placements: ['banner'] },
      ],
    })
    await page.goto('/offers')
    const order = page.getByRole('button', { name: /^Delete / })
    await expect(order).toHaveCount(2)
    await expect(order.first()).toHaveAccessibleName('Delete First')

    // The grips in the cards' order: the second card's onto the first's.
    const grips = page.getByRole('button', { name: 'Reorder' })
    const from = await grips.nth(1).boundingBox()
    const to = await grips.nth(0).boundingBox()
    if (!from || !to) throw new Error('Nothing to drag between')
    const saved = page.waitForResponse(
      (response) => response.url().endsWith('/api/offers/reorder') && response.ok(),
    )
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    // Past the sensor's 8px, so it reads as a drag rather than a tap.
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 12, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2 - 4, to.y + to.height / 2, { steps: 20 })
    await page.mouse.up()
    await saved
    await expect(order.first()).toHaveAccessibleName('Delete Second')

    await page.reload()
    await expect(order.first()).toHaveAccessibleName('Delete Second')
  })

  test('a place with all its slots in use is closed to another offer until one is paused', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      offers: [
        { title: { en: 'Lunch pop-up' }, placements: ['popup'] },
        { title: { en: 'Dinner pop-up' }, placements: ['popup'], is_active: false },
      ],
    })
    await page.goto('/offers')
    await expect(page.getByText('Pop-ups 1 of 1')).toBeVisible()

    // Switching the paused one on is turned down at once.
    const dinner = page.getByRole('switch', { name: 'Show Dinner pop-up on the menu' })
    await dinner.click()
    await expect(
      page.getByText('No free pop-up: pause or end the other pop-up first.'),
    ).toBeVisible()
    await expect(dinner).not.toBeChecked()

    // A new offer cannot take the pop-up either.
    await page.getByRole('button', { name: 'New offer' }).click()
    await page.getByRole('textbox', { name: /^Title/ }).fill('Brunch')
    await next(page)
    const popup = page.getByRole('button', { name: /^Pop-up/ })
    await expect(popup).toBeDisabled()
    await expect(popup).toContainText('All in use: pause or end one first')
    await page.getByRole('button', { name: 'Back to your offers' }).click()
    await page
      .getByRole('dialog', { name: 'Leave without saving?' })
      .getByRole('button', { name: 'Leave' })
      .click()

    // Paused, the lunch one frees it.
    await page.getByRole('switch', { name: 'Show Lunch pop-up on the menu' }).click()
    await dinner.click()
    await expect(dinner).toBeChecked()
    await expect(page.getByText('Pop-ups 1 of 1')).toBeVisible()
  })

  test('a menu holds 30 offers: New offer waits for one to be deleted', async ({ page, owner }) => {
    await owner({
      package: 'premium',
      offers: Array.from({ length: 30 }, (_, index) => ({
        title: { en: `Offer ${index + 1}` },
        placements: ['banner' as const],
        is_active: false,
      })),
    })
    await page.goto('/offers')
    await expect(page.getByRole('button', { name: 'New offer' })).toBeDisabled()
    await expect(page.getByText(/A menu holds up to 30 offers/)).toBeVisible()

    await page.getByRole('button', { name: 'Delete Offer 30' }).click()
    await page
      .getByRole('dialog', { name: 'Delete this offer?' })
      .getByRole('button', { name: 'Delete offer' })
      .click()
    await expect(page.getByRole('button', { name: 'New offer' })).toBeEnabled()
    await expect(page.getByText(/A menu holds up to 30 offers/)).toHaveCount(0)
  })
})
