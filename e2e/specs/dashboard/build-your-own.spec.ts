import type { Page } from '@playwright/test'
import { either, expect, test, type ScenarioInput } from '../../support/fixtures'
import { openSidebar, pickPart } from '../../support/helpers'

/**
 * The owner's Build your own page (../qayema docs/architecture/build-your-own.md),
 * where a build is its dish, a name and an icon above the menu's search: a
 * pizza half and half from the Pizzas (the Hawaiian left out), with a price
 * of their own for a Margherita half, then built by a guest at that price;
 * and scoops from a list typed in.
 */
const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Pizzas' },
    dishes: [
      { name: { en: 'Margherita' }, price: 12 },
      { name: { en: 'Pepperoni' }, price: 16 },
      { name: { en: 'Hawaiian' }, price: 14 },
    ],
  },
  { name: { en: 'Ice cream' }, dishes: [] },
]

const SCENARIO = {
  package: 'premium',
  order_mode: 'menu',
  order_types: ['pickup'],
  overrides: [{ feature: 'build_your_own', value: 1 }],
  categories: MENU,
} satisfies ScenarioInput

async function openBuildYourOwn(page: Page) {
  await page.goto('/')
  const sections = await openSidebar(page)
  await sections.getByRole('button', { name: either('Build your own', 'اصنعه على ذوقك') }).click()
  await page.getByRole('button', { name: either('New build', 'تركيبة جديدة') }).click()
}

/** A card of the first step, by its name (no regex characters): its radio sits under it. */
async function pickCard(page: Page, english: string, arabic: string) {
  await page.getByText(either(english, arabic)).click()
  await expect(
    page.getByRole('radio', { name: new RegExp(`^(${english}|${arabic})`) }),
  ).toBeChecked()
}

function next(page: Page) {
  return page.getByRole('button', { name: either('Next', 'التالي'), exact: true }).click()
}

test.describe('build your own', () => {
  test('an owner makes a pizza half and half and a guest builds it at that price @matrix', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner(SCENARIO)
    await openBuildYourOwn(page)

    // 1 What guests build.
    await pickCard(page, 'A pizza, half and half', 'بيتزا نصف ونصف')
    await next(page)

    // 2 The pizzas, picked for it, every one ticked; the Hawaiian is left out.
    await expect(page.getByRole('combobox', { name: /^(Category|القسم)/ })).toHaveValue('Pizzas')
    const hawaiian = page.getByRole('checkbox', { name: /Hawaiian/ })
    await expect(hawaiian).toBeChecked()
    await hawaiian.click()
    await expect(hawaiian).not.toBeChecked()
    await next(page)

    // 3 Whole and Half & half are on; a Margherita half at its own price.
    await expect(
      page.getByRole('button', { name: either('Half & half', 'نصف ونصف') }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page
      .getByRole('button', { name: either('Set your own prices', 'حدّد أسعارك الخاصة') })
      .click()
    await page
      .getByLabel(either('Margherita, price for one of 2 parts', 'Margherita، سعر جزء واحد من 2'))
      .fill('7')
    await next(page)

    // 4 Its dish: a name and an icon, nothing else.
    await expect(
      page.getByRole('textbox', { name: /^(Name on the menu|الاسم على القائمة)/ }),
    ).toHaveValue('Build your pizza')
    await expect(page.getByRole('radio', { name: either('Pizza', 'بيتزا') })).toBeChecked()
    await expect(page.getByRole('combobox', { name: /^(Category|القسم)/ })).toHaveCount(0)
    await next(page)

    // 5 Review, then save: the dish is made with its build.
    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/dishes'),
    )
    await page.getByRole('button', { name: either('Add build', 'إضافة التركيبة') }).click()
    expect((await created).ok()).toBe(true)
    await expect(page.getByRole('heading', { name: 'Build your pizza' })).toBeVisible()

    // Above the search with its icon, in no category.
    await page.goto(restaurant.public_url)
    const card = page.locator('.builds article.dish', { hasText: 'Build your pizza' })
    await expect(card.locator('.dish-build-mark svg')).toBeVisible()
    await expect(
      page.locator('.category article.dish', { hasText: 'Build your pizza' }),
    ).toHaveCount(0)
    await card.click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    // The sheet's title is enough: the build has no heading of its own, and
    // the pizza is drawn cut as picked.
    await expect(sheet.getByRole('group', { name: 'Build your pizza' })).toBeVisible()
    await expect(sheet.locator('.build-group legend')).toHaveCount(0)
    await expect(sheet.locator('.build-pie')).toBeVisible()
    await sheet.getByText('Half & half', { exact: true }).click()
    const parts = sheet.locator('.build-pick-button')
    await expect(parts).toHaveCount(2)
    await expect(parts.nth(0)).toHaveText('1Margherita$7')
    await expect(sheet.locator('.build-pick-option', { hasText: 'Hawaiian' })).toHaveCount(0)
    await pickPart(sheet, 1, 'Pepperoni')
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$15')
  })

  test('an owner makes scoops from a list of their own @matrix', async ({ page, owner }) => {
    const { restaurant } = await owner(SCENARIO)
    await openBuildYourOwn(page)

    await pickCard(page, 'Scoops or pieces', 'كرات أو قطع')
    await next(page)

    // Three rows to fill.
    const rows = [
      ['Vanilla', '0'],
      ['Pistachio', '1'],
      ['Mango', '1'],
    ]
    for (const [index, [name, price]] of rows.entries()) {
      const number = index + 1
      await page
        .getByRole('textbox', { name: either(`Choice ${number}`, `الاختيار ${number}`) })
        .fill(name!)
      await page
        .getByRole('spinbutton', {
          name: either(`Choice ${number}, price`, `الاختيار ${number}، السعر`),
        })
        .fill(price!)
    }
    await next(page)

    // Three pieces, as the card set it.
    await expect(page.getByRole('button', { name: either('3 pieces', '3 قطع') })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await next(page)

    // Its dish: named and given an icon by the card.
    await expect(
      page.getByRole('textbox', { name: /^(Name on the menu|الاسم على القائمة)/ }),
    ).toHaveValue('Ice cream')
    await expect(page.getByRole('radio', { name: either('Ice cream', 'بوظة') })).toBeChecked()
    await next(page)

    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/dishes'),
    )
    await page.getByRole('button', { name: either('Add build', 'إضافة التركيبة') }).click()
    expect((await created).ok()).toBe(true)
    await expect(page.getByRole('heading', { name: 'Ice cream' })).toBeVisible()

    await page.goto(restaurant.public_url)
    await page.locator('.builds article.dish', { hasText: 'Ice cream' }).click()
    const sheet = page.getByRole('dialog', { name: 'Ice cream' })
    await expect(sheet.locator('.build-pick-button')).toHaveCount(3)
    await pickPart(sheet, 1, 'Pistachio')
    // Vanilla free and a Pistachio at $1: no cup price any more.
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$1')
  })
})
