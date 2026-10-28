import type { Browser, Page } from '@playwright/test'
import { expect, test, type Owner, type ScenarioInput } from '../../support/fixtures'
import { openMenuCart } from '../../support/helpers'

/**
 * The classic dish card fits whatever an offer adds to it, on the narrowest
 * phones (360 and 390 px), in English and Arabic, in Lebanese pounds: a
 * long name, "L.L 10,000,000" with "L.L 12,500,000" struck out, a badge,
 * the add button or stepper and the arrow; and the dish sheet and the cart
 * lines with the same amounts. Nothing runs out of its card, overlaps,
 * or splits an amount from its sign.
 */

/** What is wrong with the cards, the sheet or the cart on screen, as readable lines. */
async function problems(page: Page, scope: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const found: string[] = []
    const name = (element: Element) =>
      `${(element.closest('[data-name]') as HTMLElement | null)?.dataset.name ?? element.closest('.cart-line')?.querySelector('.cart-line-name')?.textContent ?? ''} ${element.className}`
    const overlap = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5
    /** How many lines an element's own text takes. */
    const lines = (element: Node) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top))).size
    }

    document.querySelectorAll(selector).forEach((box) => {
      const outer = box.getBoundingClientRect()
      box.querySelectorAll('*').forEach((child) => {
        const inner = child.getBoundingClientRect()
        if (inner.width && (inner.right > outer.right + 0.5 || inner.left < outer.left - 0.5)) {
          found.push(`runs out: ${name(child)}`)
        }
      })
      box
        .querySelectorAll('.price, .price-was, .cart-line-was, [data-dish-price]')
        .forEach((amount) => {
          if (lines(amount) > 1) found.push(`split amount: ${name(amount)} "${amount.textContent}"`)
        })
      // A cart line's price now is its total's last words, after the price before.
      box.querySelectorAll('.cart-line-total').forEach((total) => {
        if (total.lastChild && lines(total.lastChild) > 1)
          found.push(`split amount: ${name(total)} "${total.lastChild.textContent}"`)
      })
      const pieces = Array.from(
        box.querySelectorAll('.price, .price-was, .dish-badge, .add, .qty, .dish-more'),
      )
      pieces.forEach((a, index) =>
        pieces.slice(index + 1).forEach((b) => {
          if (
            !a.contains(b) &&
            !b.contains(a) &&
            overlap(a.getBoundingClientRect(), b.getBoundingClientRect())
          ) {
            found.push(`overlap: ${name(a)} / ${b.className}`)
          }
        }),
      )
    })
    if (document.documentElement.scrollWidth > window.innerWidth)
      found.push('the page scrolls sideways')
    return found
  }, scope)
}

async function phone(browser: Browser, owner: Owner, width: number, lang: 'en' | 'ar') {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${owner.restaurant.public_url}?lang=${lang}`)
  return {
    page,
    close: async () => {
      expect(errors, 'uncaught errors on the menu').toEqual([])
      await context.close()
    },
  }
}

const POUND_MENU: ScenarioInput = {
  package: 'premium',
  order_mode: 'menu',
  order_types: ['pickup'],
  second_locale: 'ar',
  currency: 'LBP',
  second_currency: 'USD',
  exchange_rate: '89000',
}

test.describe('the dish card with offer prices', () => {
  test('beside the cart on a 1024px screen, pound cards stay clear of it, one a row when two do not fit', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      ...POUND_MENU,
      categories: [
        {
          name: { en: 'Grills' },
          dishes: [
            { name: { en: 'Mixed grill platter' }, price: 12500000, image: true },
            { name: { en: 'Kafta' }, price: 1250000, image: true },
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 15,
          dishes: ['Mixed grill platter', 'Kafta'],
        },
      ],
    })
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 } })
    const page = await context.newPage()
    await page.goto(owner.restaurant.public_url)
    await page.locator('article.dish .add').first().click()
    await page.locator('article.dish .add').first().click()
    await expect(page.locator('article.dish .qty')).toHaveCount(2)

    const aside = (await page.locator('aside.col-aside').boundingBox())!
    for (const card of await page.locator('article.dish').all()) {
      expect((await card.boundingBox())!.x + (await card.boundingBox())!.width).toBeLessThanOrEqual(
        aside.x,
      )
      // The stepper takes taps, never the cart over it.
      await expect(card.locator('.qty .plus')).toBeVisible()
    }
    await page.locator('article.dish').nth(1).locator('.qty .plus').click()
    await expect(page.locator('article.dish').nth(1).locator('.qty output')).toHaveText('2')
    expect(await problems(page, 'article.dish')).toEqual([])
    await context.close()
  })

  test('a pound menu fits every card, the sheet and the cart at 360 and 390 px, in English and Arabic', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      ...POUND_MENU,
      categories: [
        {
          name: { en: 'Pizzas', ar: 'بيتزا' },
          dishes: [
            {
              name: { en: 'Margherita', ar: 'مارغريتا' },
              ingredients: { en: 'Tomato, mozzarella, basil', ar: 'طماطم، موزاريلا، حبق' },
              price: 1250000,
              image: true,
            },
            {
              name: {
                en: 'Mixed grill platter with garlic sauce and fries',
                ar: 'صحن مشاوي مشكل مع صلصة الثوم والبطاطا المقلية',
              },
              price: 12500000,
              image: true,
            },
            { name: { en: 'Kafta', ar: 'كفتة' }, price: 12.5, currency: 'USD', image: true },
            {
              name: { en: 'Sized pizza', ar: 'بيتزا بالحجم' },
              price: null,
              image: true,
              variants: [
                {
                  name: { en: 'Size', ar: 'الحجم' },
                  options: [
                    { name: { en: 'Small', ar: 'صغير' }, price: 950000 },
                    { name: { en: 'Large', ar: 'كبير' }, price: 1450000 },
                  ],
                },
              ],
              addons: [{ name: { en: 'Extra cheese', ar: 'جبنة إضافية' }, price: 90000 }],
            },
            { name: { en: 'Pepperoni', ar: 'بيبروني' }, price: 1450000 },
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Pair night' },
          placements: ['banner'],
          discount_type: 'second',
          discount_value: 50,
          dishes: ['Margherita', 'Pepperoni'],
        },
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Mixed grill platter with garlic sauce and fries'],
        },
        {
          title: { en: 'Pound off' },
          placements: ['banner'],
          discount_type: 'amount',
          discount_value: 150000,
          dishes: ['Kafta', 'Sized pizza'],
        },
      ],
    })

    for (const width of [360, 390]) {
      for (const lang of ['en', 'ar'] as const) {
        const { page, close } = await phone(browser, owner, width, lang)
        const where = `${width}px ${lang}`
        await expect(page.locator('article.dish .dish-badge')).toHaveCount(5)

        // With the add buttons, then with every stepper out (wider).
        expect(await problems(page, 'article.dish'), `cards, ${where}`).toEqual([])
        // Each tap turns a + into a stepper, so the next + is always the first.
        for (let added = 1; added <= 4; added++) {
          await page.locator('article.dish .add').first().click()
          await expect(page.locator('article.dish .qty')).toHaveCount(added)
        }
        expect(await problems(page, 'article.dish'), `cards with steppers, ${where}`).toEqual([])

        // The sheet: price, the price before it, the badge and the add button.
        await page.locator('article.dish').nth(3).click()
        const sheet = page.locator('#dish-sheet')
        await sheet.locator('label.choice-pill').nth(1).click()
        await sheet.locator('.choice-row').first().click()
        await expect(sheet.locator('[data-dish-price]')).toHaveText('L.L 1,390,000')
        await expect(sheet.locator('[data-dish-was]')).toHaveText('L.L 1,540,000')
        expect(
          await problems(page, '#dish-sheet .dish-sheet-head, #dish-sheet .dish-sheet-foot'),
          `sheet, ${where}`,
        ).toEqual([])
        await sheet.locator('.dish-sheet-add').click()
        await expect(sheet).toBeHidden()

        const cart = await openMenuCart(page)
        await expect(cart.locator('.cart-line')).toHaveCount(5)
        await expect(cart.locator('.cart-line-was')).toHaveCount(4)
        expect(await problems(page, '#cart-sheet .cart-line'), `cart, ${where}`).toEqual([])
        await close()
      }
    }
  })
})
