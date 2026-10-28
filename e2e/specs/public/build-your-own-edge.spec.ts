import type { Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi, pickPart } from '../../support/helpers'

/**
 * "Build your own" on the menu, past the main flow (public/build-your-own.spec.ts;
 * rules in ../qayema docs/architecture/build-your-own.md): the sheet in
 * Arabic, the dishes a category's build leaves out, a build with one choice
 * left, pizzas priced by size where a size lacks one, the same build twice
 * in the cart, a cart line the owner's change no longer allows, and a menu
 * in Lebanese pounds cut in thirds.
 */
const BUILD_YOUR_OWN = {
  package: 'premium',
  order_mode: 'menu',
  order_types: ['pickup'],
  overrides: [{ feature: 'build_your_own', value: 1 }],
} satisfies ScenarioInput

type Dishes = NonNullable<NonNullable<ScenarioInput['categories']>[number]['dishes']>

/** A pizza priced only by its sizes, in English and Arabic. */
function bySize(
  name: { en: string; ar?: string },
  sizes: [{ en: string; ar?: string }, number][],
): Dishes[number] {
  return {
    name,
    price: null,
    variants: [
      {
        name: { en: 'Size', ar: 'الحجم' },
        options: sizes.map(([size, price]) => ({ name: size, price })),
      },
    ],
  }
}

/** The build's dish, from the Pizzas, whole or in the counts given. */
function builder(parts: number[] = [1, 2]): Dishes[number] {
  return {
    name: { en: 'Build your pizza', ar: 'اصنع بيتزاك' },
    price: null,
    builds: [
      {
        name: { en: 'Build your pizza', ar: 'اصنع بيتزاك' },
        shape: 'split',
        parts,
        category: 'Pizzas',
      },
    ],
  }
}

const SMALL = { en: 'Small', ar: 'صغير' }
const LARGE = { en: 'Large', ar: 'كبير' }

async function openCart(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) >= 1024) return page.locator('aside.col-aside')
  await page.getByRole('button', { name: /^(Your cart|سلتك)/ }).click()
  return page.locator('#cart-sheet')
}

function tile(page: Page, name: RegExp | string): Locator {
  return page.locator('.builds article.dish', { hasText: name })
}

/** The names a part's list offers, in order. */
async function offered(sheet: Locator): Promise<string[]> {
  await sheet.locator('.build-pick-button').first().click()
  const names = await sheet
    .getByRole('listbox')
    .getByRole('option')
    .locator('.build-pick-name')
    .allTextContents()
  await sheet.page().keyboard.press('Escape')
  await expect(sheet.getByRole('listbox')).toBeHidden()
  return names
}

test.describe('build your own on the menu, edge cases', () => {
  test('an Arabic guest picks the size and the halves, and the cart and order say them in Arabic @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      second_locale: 'ar',
      categories: [
        {
          name: { en: 'Pizzas', ar: 'بيتزا' },
          dishes: [
            bySize({ en: 'Margherita', ar: 'مارغريتا' }, [
              [SMALL, 8],
              [LARGE, 12],
            ]),
            bySize({ en: 'Pepperoni', ar: 'بيبروني' }, [
              [SMALL, 10],
              [LARGE, 16],
            ]),
            builder(),
          ],
        },
      ],
    })
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await expect(page.getByRole('region', { name: 'اصنعه على ذوقك' })).toBeVisible()
    await tile(page, 'اصنع بيتزاك').getByRole('button', { name: 'اصنعها بنفسك' }).click()
    const sheet = page.getByRole('dialog', { name: 'اصنع بيتزاك' })
    const sizes = sheet.getByRole('radiogroup', { name: 'الحجم' })
    await expect(sizes.getByRole('radio', { name: 'صغير' })).toBeChecked()
    await sizes.getByText('كبير').click()
    await sheet.getByRole('radiogroup', { name: 'الأجزاء' }).getByText('نصف ونصف').click()

    const parts = sheet.locator('.build-pick-button')
    await expect(parts).toHaveCount(2)
    await expect(parts.nth(0)).toHaveAttribute('aria-label', /^الجزء 1\S* اصنع بيتزاك: مارغريتا/)
    await pickPart(sheet, 1, 'بيبروني')
    await expect(parts.nth(1)).toContainText('$8')
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    const cart = await openCart(page)
    await expect(cart.locator('.cart-line')).toContainText('½ مارغريتا + ½ بيبروني (كبير)')
    await cart.getByLabel('اسمك').fill('Rami')
    await cart.getByLabel('رقم الهاتف').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /إرسال الطلب/ }).click()
    const answer = (await (await placed).json()) as { data: { total: string } }
    expect(answer.data.total).toBe('14.00')
  })

  test("a category's build offers its dishes guests can buy: never sold out, in the other currency, or an offer's deal", async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      second_currency: 'LBP',
      exchange_rate: '0.0000112360',
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            { name: { en: 'Sold out' }, price: 9, is_available: false },
            { name: { en: 'Manoushe' }, price: 450000, currency: 'LBP' },
            { name: { en: 'Hawaiian' }, price: 14 },
            builder(),
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
    await page.goto(owner.restaurant.public_url)

    // The deal and the pounds dish are on the menu, only not to build with.
    await expect(page.locator('.category article.dish', { hasText: 'Family meal' })).toBeVisible()
    await expect(page.locator('.category article.dish', { hasText: 'Manoushe' })).toBeVisible()
    await tile(page, 'Build your pizza').click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    expect(await offered(sheet)).toEqual(['Margherita', 'Pepperoni', 'Hawaiian'])
  })

  test('a build left with one dish to choose is not drawn above the search', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16, is_available: false },
            builder(),
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('.category article.dish', { hasText: 'Margherita' })).toBeVisible()
    await expect(page.locator('.builds')).toHaveCount(0)
    await expect(page.locator('article.dish', { hasText: 'Build your pizza' })).toHaveCount(0)
  })

  test('a size one pizza lacks offers the others; changing size keeps the halves made in it', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            bySize({ en: 'Margherita' }, [
              [SMALL, 8],
              [LARGE, 12],
            ]),
            bySize({ en: 'Pepperoni' }, [[LARGE, 16]]),
            // A price of its own: the same at every size.
            { name: { en: 'Garlic bread' }, price: 5 },
            builder([2]),
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)
    await tile(page, 'Build your pizza').click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    const sizes = sheet.getByRole('radiogroup', { name: 'Size' })
    const parts = sheet.locator('.build-pick-button')

    // Small: no Pepperoni, the Garlic bread at its own price.
    await expect(sizes.getByRole('radio', { name: 'Small' })).toBeChecked()
    expect(await offered(sheet)).toEqual(['Margherita', 'Garlic bread'])
    await expect(parts.nth(0)).toHaveText('1Margherita$4')

    await sizes.getByText('Large').click()
    expect(await offered(sheet)).toEqual(['Margherita', 'Pepperoni', 'Garlic bread'])
    await pickPart(sheet, 1, 'Pepperoni')
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$14')

    // Back to Small: the Margherita half stays, the Pepperoni one starts over.
    await sizes.getByText('Small').click()
    await expect(parts.nth(0)).toHaveText('1Margherita$4')
    await expect(parts.nth(1)).toHaveText('2Margherita$4')
    await pickPart(sheet, 1, 'Garlic bread')
    await expect(parts.nth(1)).toHaveText('2Garlic bread$2.50')
    // Half of $8 and half of $5, rounded once.
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$6.50')
  })

  test('the same build twice is one line of two, another build a line of its own', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            builder(),
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    const halfAndHalf = async () => {
      await tile(page, 'Build your pizza').click()
      await sheet.getByText('Half & half', { exact: true }).click()
      await pickPart(sheet, 1, 'Pepperoni')
      await sheet.locator('.dish-sheet-add').click()
      await expect(sheet).toBeHidden()
    }
    await halfAndHalf()
    await halfAndHalf()
    // A whole Margherita, as the sheet opens.
    await tile(page, 'Build your pizza').click()
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    const cart = await openCart(page)
    const lines = cart.locator('.cart-line')
    await expect(lines).toHaveCount(2)
    const halves = lines.filter({ hasText: '½ Margherita + ½ Pepperoni' })
    await expect(halves).toContainText('$14 each')
    await expect(halves.locator('.qty output')).toHaveText('2')
    await expect(cart.locator('.cart-total')).toHaveText('Total$40')

    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = (await (await placed).json()) as { data: { total: string } }
    expect(answer.data.total).toBe('40.00')
  })

  test('a built line the owner no longer offers leaves the cart', async ({ page, owner }) => {
    const made = await owner({
      ...BUILD_YOUR_OWN,
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 12 },
            { name: { en: 'Pepperoni' }, price: 16 },
            { name: { en: 'Veggie' }, price: 11 },
            builder(),
          ],
        },
      ],
    })
    await page.goto(made.restaurant.public_url)
    await tile(page, 'Build your pizza').click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    await sheet.getByText('Half & half', { exact: true }).click()
    await pickPart(sheet, 1, 'Pepperoni')
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()

    // The kitchen runs out of Pepperoni.
    const pepperoni = made.categories[0]!.dishes[1]!.id
    const sold = await callApi(page, 'PATCH', `/api/dishes/${pepperoni}/availability`, {
      is_available: false,
    })
    expect(sold.ok()).toBe(true)

    await page.reload()
    await expect(tile(page, 'Build your pizza')).toBeVisible()
    await expect(page.locator('.cart-line')).toHaveCount(0)
  })

  test('a menu in Lebanese pounds cut in thirds adds up as the server does', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...BUILD_YOUR_OWN,
      currency: 'LBP',
      categories: [
        {
          name: { en: 'Pizzas' },
          dishes: [
            { name: { en: 'Margherita' }, price: 1_200_000 },
            { name: { en: 'Pepperoni' }, price: 1_500_000 },
            { name: { en: 'Veggie' }, price: 1_100_000 },
            builder([3]),
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)
    await tile(page, 'Build your pizza').click()
    const sheet = page.getByRole('dialog', { name: 'Build your pizza' })
    await pickPart(sheet, 1, 'Pepperoni')
    await pickPart(sheet, 2, 'Veggie')
    // A third of 3,800,000 each, rounded once to the piastre, as the server does.
    const add = sheet.locator('.dish-sheet-add')
    await expect(add).toHaveText('AddL.L 1,266,666.67')
    await add.click()
    await expect(sheet).toBeHidden()

    const cart = await openCart(page)
    await expect(cart.locator('.cart-line')).toContainText('⅓ Margherita + ⅓ Pepperoni + ⅓ Veggie')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    const placed = page.waitForResponse((response) => response.url().endsWith('/order'))
    await cart.getByRole('button', { name: /Place order/ }).click()
    const answer = (await (await placed).json()) as { data: { total: string } }
    expect(answer.data.total).toBe('1266666.67')
  })
})
