import type { Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'

/** A dish whose sauces come in a group (as a POS makes them): pick 1 to 2. */
const MEZZE: ScenarioInput['categories'] = [
  {
    name: { en: 'Mezze', ar: 'مقبلات' },
    dishes: [
      {
        name: { en: 'Hummus', ar: 'حمص' },
        price: 5,
        addons: [{ name: { en: 'Bread', ar: 'خبز' }, price: 1 }],
        addon_groups: [
          {
            name: { en: 'Sauces', ar: 'صلصات' },
            min: 1,
            max: 2,
            addons: [
              { name: { en: 'Garlic', ar: 'ثوم' }, price: 0.5 },
              { name: { en: 'Chili', ar: 'حار' }, price: 0.5 },
              { name: { en: 'Tahini', ar: 'طحينة' }, price: 1 },
            ],
          },
        ],
      },
    ],
  },
]

/** The menu in the project's language: Arabic for the right to left run. */
function menuUrl(url: string, arabic: boolean): string {
  return arabic ? `${url}?lang=ar` : url
}

async function openHummus(page: Page) {
  await page
    .locator('article.dish', { hasText: /Hummus|حمص/ })
    .getByRole('button', { name: either('See options: Hummus', 'عرض الخيارات: حمص') })
    .click()
  const sheet = page.getByRole('dialog', { name: either('Hummus', 'حمص') })
  await expect(sheet).toBeVisible()
  return sheet
}

test.describe('add-on groups on the menu', () => {
  test('a guest keeps to a group of sauces, and the cart takes what was picked @matrix', async ({
    page,
    scenario,
  }, testInfo) => {
    const arabic = testInfo.project.name === 'arabic-rtl'
    const owner = await scenario({
      package: 'premium',
      second_locale: 'ar',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: MEZZE,
    })
    await page.goto(menuUrl(owner.restaurant.public_url, arabic))

    const sheet = await openHummus(page)
    const sauces = sheet.locator('[data-addon-group]')
    await expect(sauces.locator('.choice-title')).toHaveText(either('Sauces', 'صلصات'))
    await expect(sauces.locator('.choice-tag')).toHaveText(either('Pick 1 to 2', 'اختر من 1 إلى 2'))
    // The dish's own add-ons stay a list of their own.
    await expect(sheet.locator('.choice-group').first()).toContainText(/Bread|خبز/)

    // Nothing picked from the group yet: the dish is not added, and the guest is told why.
    const add = sheet.locator('.dish-sheet-add')
    await add.click()
    await expect(sheet).toBeVisible()
    await expect(sauces.getByRole('alert')).toHaveText(
      either('Pick at least 1 from Sauces.', 'اختر 1 على الأقل من صلصات.'),
    )

    await sauces.getByText(either('Garlic', 'ثوم')).click()
    await expect(sauces.getByRole('alert')).toBeHidden()
    await sauces.getByText(either('Tahini', 'طحينة')).click()
    // Two is its most: the third is off.
    await expect(sauces.getByRole('checkbox', { name: /Chili|حار/ })).toBeDisabled()
    await expect(add).toContainText('$6.50')

    await add.click()
    await expect(sheet).toBeHidden()

    // On a phone the cart is a sheet; wider, its own column.
    const wide = (page.viewportSize()?.width ?? 0) >= 1024
    if (!wide) await page.getByRole('button', { name: either('Your cart', 'سلتك') }).click()
    const cart = page.locator(wide ? 'aside.col-aside' : '#cart-sheet')
    await expect(cart.locator('.cart-line-choices')).toHaveText(
      /^\+ (Garlic|ثوم)، ?\+ (Tahini|طحينة)$|^\+ (Garlic|ثوم), \+ (Tahini|طحينة)$/,
    )
  })

  test('the Ember design draws the group and keeps to its most', async ({ page, scenario }) => {
    const owner = await scenario({ package: 'premium', template: 'ember', categories: MEZZE })
    await page.goto(owner.restaurant.public_url)

    const sheet = await openHummus(page)
    const sauces = sheet.locator('[data-addon-group]')
    await expect(sauces.locator('.choice-tag')).toHaveText('Pick 1 to 2')
    await sauces.getByText('Garlic').click()
    await sauces.getByText('Chili').click()
    await expect(sauces.getByRole('checkbox', { name: /Tahini/ })).toBeDisabled()
    await expect(sauces.locator('.choice-row.is-off')).toHaveCount(1)
  })

  test('a required choice with a single option comes ticked, stays ticked and is priced', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [
        {
          name: { en: 'Mezze' },
          dishes: [
            {
              name: { en: 'Hummus' },
              price: 5,
              addon_groups: [
                {
                  name: { en: 'Size' },
                  min: 1,
                  max: 1,
                  addons: [{ name: { en: 'Large' }, price: 2 }],
                },
              ],
            },
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const sheet = await openHummus(page)
    const size = sheet.locator('[data-addon-group]')
    await expect(size.locator('.choice-tag')).toHaveText('Included')
    const large = size.getByRole('checkbox', { name: /Large/ })
    await expect(large).toBeChecked()
    await expect(large).toBeDisabled()
    await expect(size.locator('.choice-row.is-off')).toHaveCount(0)
    await expect(sheet.locator('.dish-sheet-add')).toContainText('$7')

    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()
  })
})
