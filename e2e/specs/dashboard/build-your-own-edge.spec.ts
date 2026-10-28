import type { Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { pickPart } from '../../support/helpers'

/**
 * The owner's Build your own page past its main flow
 * (dashboard/build-your-own.spec.ts; rules in ../qayema
 * docs/architecture/build-your-own.md): changing a saved build of pizzas
 * priced by size, deleting the only build or one of two, the restaurant's
 * limit, the page without the feature, what each step asks before Next, and
 * a build filled in the owner's order editor (BuildPicker).
 */
type Dishes = NonNullable<NonNullable<ScenarioInput['categories']>[number]['dishes']>

const sized = (name: string, small: number, large: number): Dishes[number] => ({
  name: { en: name },
  price: null,
  variants: [
    {
      name: { en: 'Size' },
      options: [
        { name: { en: 'Small' }, price: small },
        { name: { en: 'Large' }, price: large },
      ],
    },
  ],
})

const BUILDER: Dishes[number] = {
  name: { en: 'Build your pizza' },
  price: null,
  builds: [{ name: { en: 'Build your pizza' }, shape: 'split', parts: [1, 2], category: 'Pizzas' }],
}

/** Pizzas priced by size, one with a price of its own, and the build of them. */
const PIZZAS: ScenarioInput['categories'] = [
  {
    name: { en: 'Pizzas' },
    dishes: [
      sized('Margherita', 8, 12),
      sized('Pepperoni', 10, 16),
      { name: { en: 'Veggie' }, price: 11 },
      BUILDER,
    ],
  },
]

const SCENARIO = {
  package: 'premium',
  order_mode: 'menu',
  order_types: ['pickup'],
  overrides: [{ feature: 'build_your_own', value: 1 }],
  categories: PIZZAS,
} satisfies ScenarioInput

function next(page: Page) {
  return page.getByRole('button', { name: either('Next', 'التالي'), exact: true }).click()
}

function saved(page: Page, method: 'POST' | 'PATCH' | 'DELETE') {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method && /\/api\/dishes(\/\d+)?$/.test(response.url()),
  )
}

test.describe('build your own, the owner past the main flow', () => {
  test('a saved build of pizzas priced by size gets thirds and a price of its own, and the menu follows', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner(SCENARIO)
    await page.goto('/build-your-own')

    // A whole small Margherita is the least it costs.
    const card = page.getByRole('article').filter({ hasText: 'Build your pizza' })
    await expect(card).toContainText('From $8.00')
    await card.getByRole('button', { name: 'Edit Build your pizza on Build your pizza' }).click()
    await expect(page.getByRole('heading', { name: 'Edit build' })).toBeVisible()

    // Each pizza priced by size with its sizes, the Veggie at its own price.
    await next(page)
    await expect(page.getByRole('checkbox', { name: /Margherita/ })).toContainText(
      'Small $8.00 · Large $12.00',
    )
    await expect(page.getByRole('checkbox', { name: /Veggie/ })).toContainText('$11.00')
    await next(page)

    const thirds = page.getByRole('button', { name: 'Thirds', exact: true })
    await expect(thirds).toHaveAttribute('aria-pressed', 'false')
    await thirds.click()
    await expect(thirds).toHaveAttribute('aria-pressed', 'true')
    // Only the Veggie takes part prices: a pizza priced by size pays its share.
    await page.getByRole('button', { name: 'Set your own prices' }).click()
    await expect(page.getByLabel('Margherita, price for one of 2 parts')).toHaveCount(0)
    await page.getByLabel('Veggie, price for one of 2 parts').fill('5')

    const patched = saved(page, 'PATCH')
    await page.getByRole('button', { name: 'Save build' }).click()
    expect((await patched).ok()).toBe(true)
    await expect(card).toContainText('Whole, halves, and thirds, from Pizzas')

    await page.goto(restaurant.public_url)
    await page.locator('.builds article.dish', { hasText: 'Build your pizza' }).click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    await sheet.getByRole('radiogroup', { name: 'Size' }).getByText('Large').click()
    const counts = sheet.getByRole('radiogroup', { name: 'Parts' })
    await expect(counts.getByRole('radio')).toHaveCount(3)
    await counts.getByText('Half & half').click()
    await pickPart(sheet, 0, 'Veggie')
    await expect(sheet.locator('.build-pick-button').nth(0)).toHaveText('1Veggie$5')
    // $5 for the Veggie half, half of a large Margherita $6.
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$11')
  })

  test('deleting the only build deletes its dish, which leaves the menu', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner(SCENARIO)
    await page.goto('/build-your-own')

    await page.getByRole('button', { name: 'Delete Build your pizza on Build your pizza' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Delete Build your pizza?' })
    await expect(dialog).toContainText('It leaves your menu.')
    const deleted = saved(page, 'DELETE')
    await dialog.getByRole('button', { name: 'Delete dish' }).click()
    expect((await deleted).ok()).toBe(true)
    await expect(page.getByText('Let guests build a dish')).toBeVisible()
    await expect(page.getByText('0 / 3')).toBeVisible()

    await page.goto(restaurant.public_url)
    await expect(page.locator('.category article.dish', { hasText: 'Veggie' })).toBeVisible()
    await expect(page.locator('.builds')).toHaveCount(0)
  })

  test('deleting one of two builds keeps the dish and its other build', async ({ page, owner }) => {
    const { restaurant } = await owner({
      ...SCENARIO,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            {
              name: { en: 'Pizza and drink' },
              price: 2,
              builds: [
                { name: { en: 'Your pizza' }, parts: [2], category: 'Pizzas' },
                {
                  name: { en: 'Your drink' },
                  shape: 'pieces',
                  parts: [1],
                  choices: [
                    { name: { en: 'Cola' }, price: 0 },
                    { name: { en: 'Juice' }, price: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    await page.goto('/build-your-own')

    await page.getByRole('button', { name: 'Delete Your drink on Pizza and drink' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Delete this build?' })
    await expect(dialog).toContainText('The dish stays on your menu.')
    const patched = saved(page, 'PATCH')
    await dialog.getByRole('button', { name: 'Delete build' }).click()
    expect((await patched).ok()).toBe(true)
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('article')).toContainText('Your pizza')

    await page.goto(restaurant.public_url)
    await page.locator('.builds article.dish', { hasText: 'Pizza and drink' }).click()
    const sheet = page.getByRole('dialog', { name: 'Pizza and drink' })
    await expect(sheet.locator('.build-group')).toHaveCount(1)
    await pickPart(sheet, 1, 'Pepperoni')
    // $2 for the dish, half of $12 and half of $16.
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$16')
  })

  test('an offer’s deal dish is never a choice, in the editor or the order editor', async ({
    page,
    owner,
  }) => {
    await owner({
      ...SCENARIO,
      orders: 1,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            BUILDER,
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Family night' },
          placements: ['banner'],
          deal: { name: { en: 'Family meal' }, price: 25, category: 'Pizzas' },
        },
      ],
    })
    await page.goto('/build-your-own')

    await page.getByRole('button', { name: 'Edit Build your pizza on Build your pizza' }).click()
    await next(page)
    await expect(page.getByRole('checkbox')).toHaveCount(2)
    await expect(page.getByRole('checkbox', { name: /Family meal/ })).toHaveCount(0)
    await expect(page.getByText('2 of 2')).toBeVisible()

    await page.goto('/orders')
    const card = page.getByRole('article')
    await card.getByRole('button', { name: /^More for order/ }).click()
    await page.getByRole('menuitem', { name: /^Edit order/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'Dish' }).click()
    await page.getByRole('option', { name: /^Build your pizza/ }).click()
    await dialog.getByRole('combobox', { name: 'Build your pizza: how many' }).click()
    await page.getByRole('option', { name: 'Whole' }).click()
    await dialog.getByRole('combobox', { name: 'Build your pizza', exact: true }).click()
    await expect(page.getByRole('option')).toHaveCount(2)
    await expect(page.getByRole('option', { name: /Family meal/ })).toHaveCount(0)
  })

  test('at the restaurant’s limit of builds, New build waits', async ({ page, owner }) => {
    await owner({
      ...SCENARIO,
      overrides: [...SCENARIO.overrides, { feature: 'build_limit', value: 1 }],
    })
    await page.goto('/build-your-own')

    await expect(page.getByText('1 / 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New build' })).toBeDisabled()
    await expect(
      page.getByText(
        'You have 1 build, as many as your restaurant may have. Delete it to make another.',
      ),
    ).toBeVisible()
  })

  test('without the feature the page says no package has it and how to ask', async ({
    page,
    owner,
  }) => {
    await owner({ ...SCENARIO, overrides: [] })
    await page.goto('/build-your-own')

    await expect(page.getByText('Ask us to turn it on', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask us', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New build' })).toHaveCount(0)
    const sections = page.getByRole('navigation', { name: 'Dashboard' })
    await expect(sections.getByRole('button', { name: 'Offers' })).toBeVisible()
    await expect(sections.getByRole('button', { name: 'Build your own' })).toHaveCount(0)
  })

  test('each step says what is missing before Next, and leaving asks first', async ({
    page,
    owner,
  }) => {
    await owner(SCENARIO)
    await page.goto('/build-your-own')
    await page.getByRole('button', { name: 'New build' }).click()

    await next(page)
    await expect(page.getByText('Pick what guests build.')).toBeVisible()
    await page.getByText('Something else').click()

    // Leaving a started build asks first; staying keeps it.
    await page.getByRole('button', { name: 'Back to your builds' }).click()
    const leave = page.getByRole('dialog').filter({ hasText: 'Leave without saving?' })
    await leave.getByRole('button', { name: 'Cancel' }).click()
    await expect(leave).toBeHidden()
    await next(page)

    // Its own list, two empty rows to fill.
    await next(page)
    await expect(page.getByText('Give every choice a name in English.').first()).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: 'Choice 2, price' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await page.getByRole('button', { name: 'Remove choice 2' }).click()
    await page.getByRole('textbox', { name: 'Choice 1' }).fill('Kafta')
    await page.getByRole('spinbutton', { name: 'Choice 1, price' }).fill('4')
    await next(page)
    await expect(page.getByText('A list needs 2 to 30 choices.')).toBeVisible()
    await page.getByRole('button', { name: 'Add a choice' }).click()
    await page.getByRole('textbox', { name: 'Choice 2' }).fill('Taouk')
    await page.getByRole('spinbutton', { name: 'Choice 2, price' }).fill('3.5')
    await next(page)

    // How it is made is asked for something else; no count yet.
    await expect(page.getByText('How it is made').first()).toBeVisible()
    await next(page)
    await expect(page.getByText('Pick at least one.')).toBeVisible()
    await page.getByRole('button', { name: 'Half & half', exact: true }).click()
    await next(page)

    await next(page)
    await expect(page.getByText('Give the dish a name in English.')).toBeVisible()
    await page.getByRole('textbox', { name: /^Name on the menu/ }).fill('Mixed grill')
    await next(page)

    const created = saved(page, 'POST')
    await page.getByRole('button', { name: 'Add build' }).click()
    expect((await created).ok()).toBe(true)
    const card = page.getByRole('article').filter({ hasText: 'Mixed grill' })
    // Half of $4 and half of $3.50 is the least: two Taouk halves.
    await expect(card).toContainText('Halves, from 2 choices')
    await expect(card).toContainText('From $3.50')
  })

  test('the owner adds a pizza built at a size to an order, priced by the server @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ ...SCENARIO, orders: 1 })
    await page.goto('/orders')
    const card = page.getByRole('article')
    await expect(card).toContainText('$12.50', { timeout: 20_000 })
    await card.getByRole('button', { name: /^(More for order|المزيد للطلب)/ }).click()
    await page.getByRole('menuitem', { name: /^(Edit order|تعديل الطلب)/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: either('Dish', 'الطبق') }).click()
    await page.getByRole('option', { name: /^Build your pizza/ }).click()
    const add = dialog.getByRole('button', { name: either('Add', 'إضافة'), exact: true })
    await expect(add).toBeDisabled()

    // The first size with two pizzas is picked; the owner takes Large.
    const size = dialog.getByRole('combobox', {
      name: either('Build your pizza: size', 'Build your pizza: الحجم'),
    })
    await expect(size).toHaveValue('Small')
    await size.click()
    await page.getByRole('option', { name: /^Large/ }).click()
    await dialog
      .getByRole('combobox', { name: either('Build your pizza: how many', 'Build your pizza: كم') })
      .click()
    await page.getByRole('option', { name: either('Half & half', 'نصف ونصف') }).click()
    for (const [number, pizza, adds] of [
      [1, 'Margherita', '+$6.00'],
      [2, 'Pepperoni', '+$8.00'],
    ] as const) {
      await dialog
        .getByRole('combobox', {
          name: either(`Build your pizza, part ${number}`, `Build your pizza، الجزء ${number}`),
        })
        .click()
      const option = page.getByRole('option', { name: new RegExp(`^${pizza}`) })
      await expect(option).toContainText(adds)
      await option.click()
    }
    await expect(add).toBeEnabled()
    await expect(dialog).toContainText('$14.00')
    await add.click()
    await expect(dialog).toContainText('$26.50')
    await dialog.getByRole('button', { name: either('Save changes', 'حفظ التعديلات') }).click()
    await expect(dialog).toBeHidden()

    const pizza = card.getByRole('listitem').filter({ hasText: 'Build your pizza' })
    await expect(pizza).toContainText('Build your pizza: ½ Margherita + ½ Pepperoni (Large)')
    await expect(pizza).toContainText('$14.00')
    await expect(card).toContainText('$26.50')
  })
})
