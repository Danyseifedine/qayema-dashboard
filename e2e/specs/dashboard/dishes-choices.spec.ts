import type { Locator, Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * A dish's variants and add-ons in the dish form, against the real backend:
 * the ready-made lists, editing saved rows, copying another dish's lists,
 * a dish priced in the second currency, Lebanese pound prices and the most a
 * dish holds. What a guest picks from them is public/dish-choices.spec.ts.
 */

const BURGER: NonNullable<ScenarioInput['categories']>[number]['dishes'] = [
  {
    name: { en: 'Burger' },
    price: 8,
    variants: [
      {
        name: { en: 'Size' },
        options: [
          { name: { en: 'Small' }, price: 0 },
          { name: { en: 'Large' }, price: 3 },
        ],
      },
    ],
    addons: [{ name: { en: 'Extra cheese' }, price: 1 }],
  },
  { name: { en: 'Wrap' }, price: 6 },
]

function choicesOf(dialog: Locator): Locator {
  return dialog.getByRole('region', { name: either('Variants and add-ons', 'الخيارات والإضافات') })
}

function card(page: Page, name: string): Locator {
  return page.getByRole('article').filter({ hasText: name })
}

/** Opens a dish's sheet on the public menu. */
async function guestSheet(page: Page, url: string, name: string): Promise<Locator> {
  await page.goto(url)
  await page
    .locator('article.dish', { hasText: name })
    .getByRole('button', { name: 'See options' })
    .click()
  return page.getByRole('dialog', { name })
}

test.describe('dish variants and add-ons in the dashboard', () => {
  test('a dish built from the ready-made lists is saved, edited later, and guests see the change @matrix', async ({
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
    const choices = choicesOf(dialog)

    await dialog.getByLabel(/^(Name|الاسم)/).fill('Burger')
    await dialog.getByLabel(/^(Price|السعر)/).fill('8')
    await choices.getByRole('button', { name: either('Size', 'الحجم'), exact: true }).click()
    await choices
      .getByRole('button', { name: either('Spice level', 'مستوى البهارات'), exact: true })
      .click()
    // The ready-made lists come with their options written.
    await expect(choices.getByLabel(/^Size(,|،) (option|الاختيار) 3$/)).toHaveValue('Large')
    await expect(choices.getByLabel(/^Spice level(,|،) (option|الاختيار) 3$/)).toHaveValue('Hot')
    await choices
      .getByLabel(either('Size, option 2, extra price', 'Size، الاختيار 2، السعر الإضافي'))
      .fill('1.5')
    await choices
      .getByLabel(either('Size, option 3, extra price', 'Size، الاختيار 3، السعر الإضافي'))
      .fill('3')
    await choices.getByRole('button', { name: either('Add add-on', 'إضافة جديدة') }).click()
    await choices.getByLabel(either('Add-on 1', 'الإضافة 1'), { exact: true }).fill('Extra cheese')
    await choices.getByLabel(either('Add-on 1, price', 'الإضافة 1، السعر')).fill('1')
    // From the cheapest choices to everything at its dearest.
    await expect(choices).toContainText(/\$8\.00.*\$12\.00/)

    await dialog.getByRole('button', { name: either('Add dish', 'إضافة الطبق') }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Burger')).toContainText(/2 variants · 1 add-on|خياران · إضافة واحدة/)

    // Later: Large becomes Family, and the spice level goes.
    await page.getByRole('button', { name: either('Edit Burger', 'تعديل Burger') }).click()
    await expect(choices.getByLabel(/^Size(,|،) (option|الاختيار) 3$/)).toHaveValue('Large')
    await expect(
      choices.getByLabel(either('Size, option 3, extra price', 'Size، الاختيار 3، السعر الإضافي')),
    ).toHaveValue('3')
    await choices.getByLabel(/^Size(,|،) (option|الاختيار) 3$/).fill('Family')
    await choices
      .getByRole('button', { name: either('Remove Spice level', 'إزالة Spice level') })
      .click()
    await dialog.getByRole('button', { name: either('Save dish', 'حفظ الطبق') }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Burger')).toContainText(/1 variant · 1 add-on|خيار واحد · إضافة واحدة/)

    const sheet = await guestSheet(page, restaurant.public_url, 'Burger')
    await expect(sheet.locator('label', { hasText: 'Family' })).toContainText('+$3')
    await expect(sheet.locator('label', { hasText: 'Medium' })).toContainText('+$1.5')
    await expect(sheet.locator('label', { hasText: 'Extra cheese' })).toContainText('+$1')
    await expect(sheet.locator('label', { hasText: 'Large' })).toHaveCount(0)
    await expect(sheet.getByRole('group', { name: /Spice level/ })).toHaveCount(0)
  })

  test('copied lists are the dish’s own: changing the copy leaves the original alone', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'pro',
      categories: [{ name: { en: 'Burgers' }, dishes: BURGER }],
    })
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Edit Wrap' }).click()
    const dialog = page.getByRole('dialog')
    const choices = choicesOf(dialog)

    await choices.getByRole('combobox', { name: 'Copy from another dish' }).click()
    await page.getByRole('option', { name: 'Burger' }).click()
    await expect(choices.getByLabel('Size, option 2', { exact: true })).toHaveValue('Large')
    await expect(choices.getByLabel('Add-on 1', { exact: true })).toHaveValue('Extra cheese')
    await choices.getByLabel('Size, option 2, extra price').fill('4')
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Wrap')).toContainText('1 variant · 1 add-on')

    await page.getByRole('button', { name: 'Edit Burger' }).click()
    await expect(choices.getByLabel('Size, option 2, extra price')).toHaveValue('3')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await expect(
      (await guestSheet(page, restaurant.public_url, 'Wrap')).locator('label', {
        hasText: 'Large',
      }),
    ).toContainText('+$4')
    await expect(
      (await guestSheet(page, restaurant.public_url, 'Burger')).locator('label', {
        hasText: 'Large',
      }),
    ).toContainText('+$3')
  })

  test('a dish priced in the second currency has its choices in it too, on the card and the menu', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'pro',
      currency: 'LBP',
      second_currency: 'USD',
      exchange_rate: '89000',
      categories: [{ name: { en: 'Grills' } }],
    })
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    const choices = choicesOf(dialog)

    await dialog.getByLabel(/^Name/).fill('Burger')
    await dialog
      .getByRole('tablist', { name: 'Dish currency' })
      .getByRole('tab', { name: 'USD' })
      .click()
    await dialog.getByLabel(/^Price/).fill('5')
    await choices.getByRole('button', { name: 'Add add-on' }).click()
    await choices.getByLabel('Add-on 1', { exact: true }).fill('Cheese')
    await choices.getByLabel('Add-on 1, price').fill('1')
    await expect(choices).toContainText(/\$5\.00.*\$6\.00/)
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Burger')).toContainText('$5.00')

    // Reopened, it is still in dollars.
    await page.getByRole('button', { name: 'Edit Burger' }).click()
    await expect(
      dialog.getByRole('tablist', { name: 'Dish currency' }).getByRole('tab', { name: 'USD' }),
    ).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')

    const sheet = await guestSheet(page, restaurant.public_url, 'Burger')
    await expect(sheet.locator('label', { hasText: 'Cheese' })).toContainText('+$1')
  })

  test('a menu in Lebanese pounds takes prices in the millions, and refuses one past the most', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'pro',
      currency: 'LBP',
      categories: [{ name: { en: 'Grills' } }],
    })
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    const choices = choicesOf(dialog)

    await dialog.getByLabel(/^Name/).fill('Mixed grill')
    await dialog.getByLabel(/^Price/).fill('100000000')
    await choices.getByRole('button', { name: 'Add add-on' }).click()
    await choices.getByLabel('Add-on 1', { exact: true }).fill('Fries')
    await choices.getByLabel('Add-on 1, price').fill('150000')
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog.getByText('That price is too high.')).toBeVisible()

    await dialog.getByLabel(/^Price/).fill('1250000')
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Mixed grill')).toContainText('LBP 1,250,000')

    await page.goto(restaurant.public_url)
    const dish = page.locator('article.dish', { hasText: 'Mixed grill' })
    await expect(dish.locator('.price')).toHaveText('L.L 1,250,000')
    await dish.getByRole('button', { name: 'See options' }).click()
    await expect(
      page.getByRole('dialog', { name: 'Mixed grill' }).locator('label', { hasText: 'Fries' }),
    ).toContainText('+L.L 150,000')
  })

  test('a dish holding the most variants, options and add-ons offers no more, and still saves', async ({
    page,
    owner,
  }) => {
    const option = (n: number) => ({ name: { en: `Choice ${n}` }, price: 0 })
    await owner({
      package: 'pro',
      categories: [
        {
          name: { en: 'Grills' },
          dishes: [
            {
              name: { en: 'Platter' },
              price: 20,
              variants: [
                {
                  name: { en: 'Meat' },
                  options: Array.from({ length: 10 }, (_, i) => option(i + 1)),
                },
                ...['Bread', 'Sauce', 'Side', 'Drink'].map((name) => ({
                  name: { en: name },
                  options: [option(1), option(2)],
                })),
              ],
              addons: Array.from({ length: 20 }, (_, i) => ({
                name: { en: `Extra ${i + 1}` },
                price: 1,
              })),
            },
          ],
        },
      ],
    })
    await page.goto('/dishes')
    await expect(card(page, 'Platter')).toContainText('5 variants · 20 add-ons')
    await page.getByRole('button', { name: 'Edit Platter' }).click()
    const dialog = page.getByRole('dialog')
    const choices = choicesOf(dialog)

    await expect(choices.getByLabel('Variant name')).toHaveCount(5)
    await expect(choices.getByRole('button', { name: 'Add variant' })).toHaveCount(0)
    await expect(choices.getByRole('button', { name: 'Size', exact: true })).toHaveCount(0)
    await expect(choices.getByRole('button', { name: 'Add add-on' })).toHaveCount(0)
    // The full variant offers no more options; the others still do.
    await expect(choices.getByRole('button', { name: 'Add option' })).toHaveCount(4)

    // The server takes exactly what the form allows.
    const saved = page.waitForResponse(
      (response) =>
        /\/api\/dishes\/\d+$/.test(response.url()) && response.request().method() !== 'GET',
    )
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    expect((await saved).ok()).toBeTruthy()
    await expect(dialog).toBeHidden()
  })
})
