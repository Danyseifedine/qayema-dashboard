import { devices, type Browser, type Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { closeSidebar, openSidebar } from '../../support/helpers'

/**
 * The owner's edge cases the main specs leave out: what the dish form does
 * with messy text, dishes with no price or very long names, the order guests
 * read after a reorder, and a feature switch that takes two pages with it.
 * Opening hours are in edge-hours.spec.ts, orders in edge-orders.spec.ts.
 */

/** A phone, minus the browser choice a describe group may not change. */
const PHONE = (({ defaultBrowserType: _browser, ...rest }) => rest)(devices['Pixel 7'])

test.describe('dishes: edge cases', () => {
  test('the ingredients box tidies messy text as the owner leaves it, and guests read the tidy list', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'pro',
      second_locale: 'ar',
      categories: [{ name: { en: 'Salads', ar: 'سلطات' } }],
    })
    await page.goto('/dishes')
    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('#name-en').fill('Village salad')

    // Dots, a doubled comma and "ect" become a clean list as the box is left.
    const english = dialog.locator('#ingredients-en')
    await english.fill('onion,..tomato...ect')
    await english.press('Tab')
    await expect(english).toHaveValue('onion, tomato')

    // Arabic is listed with the Arabic comma, and "إلخ" is no ingredient.
    // The name's tabs come first, the ingredients' second.
    const tabs = dialog.getByRole('tablist', { name: 'Content language' })
    await tabs.first().getByRole('tab', { name: 'AR' }).click()
    await dialog.locator('#name-ar').fill('سلطة القرية')
    await tabs.nth(1).getByRole('tab', { name: 'AR' }).click()
    const arabic = dialog.locator('#ingredients-ar')
    await arabic.fill('بصل،طماطم... إلخ')
    await arabic.press('Tab')
    await expect(arabic).toHaveValue('بصل، طماطم')

    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('article').filter({ hasText: 'Village salad' })).toContainText(
      'onion, tomato',
    )

    const guest = await browser.newPage()
    await guest.goto(restaurant.restaurant.public_url)
    await expect(guest.locator('article.dish', { hasText: 'Village salad' })).toContainText(
      'onion, tomato',
    )
    await expect(guest.getByText('ect', { exact: false })).toHaveCount(0)
    await guest.goto(`${restaurant.restaurant.public_url}?lang=ar`)
    await expect(guest.locator('article.dish', { hasText: 'سلطة القرية' })).toContainText(
      'بصل، طماطم',
    )
    await expect(guest.getByText('إلخ')).toHaveCount(0)
    await guest.close()
  })

  test('a dish without a price shows none, on its card or the menu, and cannot go in the cart', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      categories: [
        {
          name: { en: 'Mezze' },
          dishes: [
            { name: { en: 'Hummus' }, price: 6 },
            { name: { en: 'Tasting board' }, price: null },
          ],
        },
      ],
    })
    await page.goto('/dishes')
    const priced = page.getByRole('article').filter({ hasText: 'Hummus' })
    const unpriced = page.getByRole('article').filter({ hasText: 'Tasting board' })
    await expect(priced).toContainText('$6.00')
    await expect(unpriced).toBeVisible()
    // No "$0.00" standing in for a price the owner never gave.
    await expect(unpriced).not.toContainText('$')

    // A guest of their own, signed out.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const guest = await context.newPage()
    await guest.goto(restaurant.restaurant.public_url)
    const cart = guest.locator('aside.col-aside')
    const board = guest.locator('article.dish', { hasText: 'Tasting board' })
    await expect(board).toBeVisible()
    await expect(board.locator('.price')).toHaveCount(0)
    await expect(board.getByRole('button', { name: /^Add/ })).toHaveCount(0)

    // The priced one still orders as usual beside it.
    await guest.getByRole('button', { name: 'Add Hummus' }).click()
    await expect(cart.locator('.cart-line')).toHaveCount(1)
    await expect(cart.locator('.cart-total')).toHaveText('Total$6')
    await context.close()
  })

  test('reordering dishes and categories by keyboard changes the order guests read', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Starters' },
          dishes: [
            { name: { en: 'Hummus' } },
            { name: { en: 'Fattoush' } },
            { name: { en: 'Moutabal' } },
          ],
        },
        { name: { en: 'Mains' }, dishes: [{ name: { en: 'Kafta' } }] },
      ],
    })
    const [starters, mains] = restaurant.categories
    const names = page.getByRole('article').getByRole('heading', { level: 3 })

    // Within its category: the chip shows Starters alone.
    await page.goto('/dishes')
    await page
      .getByRole('tablist', { name: 'Filter dishes by category' })
      .getByRole('tab', { name: /^Starters/ })
      .click()
    await expect(names).toHaveText(['Hummus', 'Fattoush', 'Moutabal'])
    const dishGrip = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Hummus', exact: true }) })
      .getByRole('button', { name: 'Reorder' })
    await dishGrip.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByText(`was moved over droppable area ${starters!.dishes[1]!.id}.`),
    ).toBeAttached()
    const dishesSaved = page.waitForResponse(
      (response) => response.url().endsWith('/api/dishes/reorder') && response.ok(),
    )
    await page.keyboard.press('Space')
    await dishesSaved
    await expect(names).toHaveText(['Fattoush', 'Hummus', 'Moutabal'])

    await page.goto('/categories')
    const categoryGrip = page
      .locator('div')
      .filter({ has: page.getByRole('button', { name: 'Delete Starters', exact: true }) })
      .last()
      .getByRole('button', { name: 'Reorder' })
    await categoryGrip.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByText(`was moved over droppable area ${mains!.id}.`)).toBeAttached()
    const categoriesSaved = page.waitForResponse(
      (response) => response.url().endsWith('/api/categories/reorder') && response.ok(),
    )
    await page.keyboard.press('Space')
    await categoriesSaved

    // Guests read the new order at once: Mains first, Fattoush before Hummus.
    const guest = await browser.newPage()
    await guest.goto(restaurant.restaurant.public_url)
    await expect(
      guest.getByRole('navigation', { name: 'Categories' }).getByRole('button'),
    ).toHaveText(['All', 'Mains', 'Starters'])
    await expect(guest.locator('article.dish .dish-name')).toHaveText([
      'Kafta',
      'Fattoush',
      'Hummus',
      'Moutabal',
    ])
    await guest.close()
  })
})

test.describe('dishes on a phone', () => {
  test.use(PHONE)

  /**
   * Whether a page stays a phone's width. A too-wide element makes the
   * mobile browser widen the whole layout, so the page scrolls sideways.
   */
  async function expectFits(target: Page) {
    const width = target.viewportSize()!.width
    await target.waitForLoadState('networkidle')
    await expect
      .poll(() =>
        target.evaluate(() => Math.max(window.innerWidth, document.documentElement.scrollWidth)),
      )
      .toBe(width)
  }

  /** The owner's Dishes page and the guest's menu, both on a phone. */
  async function checkBoth(page: Page, browser: Browser, url: string, name: string) {
    await page.goto('/dishes')
    const card = page.getByRole('article').filter({ hasText: name })
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expectFits(page)
    const box = (await card.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)

    const context = await browser.newContext(PHONE)
    const guest = await context.newPage()
    await guest.goto(url)
    await expect(guest.locator('article.dish', { hasText: name })).toBeVisible()
    await expectFits(guest)
    await context.close()
    return card
  }

  test('very long names and ingredients wrap inside the card, the grid and the menu', async ({
    page,
    browser,
    owner,
  }) => {
    // Every text as long as the server takes (MenuTextLimits in ../qayema).
    const name = "Grandmother's slow cooked lamb with freekeh and roasted veg"
    const ingredients = Array.from({ length: 30 }, (_, index) => `ingredient number ${index + 1}`)
      .join(', ')
      .slice(0, 300)
    const restaurant = await owner({
      package: 'free',
      name: { en: 'The Neighbourhood Charcoal Grill and Mezze House of Beirut' },
      categories: [
        {
          name: { en: 'Specialities of the house, slow cooked' },
          description: { en: 'Everything here takes a while. '.repeat(3).trim() },
          dishes: [
            { name: { en: name }, ingredients: { en: ingredients }, price: 1234.5 },
            { name: { en: 'Kafta' }, price: 12 },
          ],
        },
      ],
    })

    const card = await checkBoth(page, browser, restaurant.restaurant.public_url, name)
    // The price stays beside the name, never pushed off the card.
    await expect(card).toContainText('$1,234.50')
  })

  test('a name with no space to break at still wraps on a phone', async ({
    page,
    browser,
    owner,
  }) => {
    // Owners join choices with slashes; a line cannot break inside that.
    const pastas = 'Spaghetti/Linguine/Fettuccine/Penne/Rigatoni/Tagliatelle'
    const restaurant = await owner({
      package: 'free',
      categories: [
        {
          name: { en: `Pasta/Risotto/Gnocchi/Lasagne/Ravioli/Tortellini` },
          dishes: [{ name: { en: pastas }, price: 9 }],
        },
      ],
    })

    await checkBoth(page, browser, restaurant.restaurant.public_url, pastas)
  })
})

test.describe('features: edge cases', () => {
  test('switching ordering at the table off takes Tables and Table orders away, and back on returns them @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu' })
    await page.goto('/features')
    const toggle = page.getByRole('switch', {
      name: either('Ordering at the table on', 'تشغيل الطلب من الطاولة'),
    })
    await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 20_000 })
    const flip = async () => {
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/features') && response.request().method() === 'PUT',
      )
      await toggle.click()
      expect((await saved).ok()).toBeTruthy()
    }
    const rows = async () => {
      const nav = await openSidebar(page)
      return {
        tables: nav.getByRole('button', { name: /^(Tables|الطاولات)/ }),
        tableOrders: nav.getByRole('button', { name: /^(Table orders|طلبات الطاولات)/ }),
        delivery: nav.getByRole('button', { name: /^(Delivery and pickup|التوصيل والاستلام)/ }),
      }
    }

    let found = await rows()
    await expect(found.tables.first()).toBeVisible()
    await expect(found.tableOrders.first()).toBeVisible()
    await closeSidebar(page)

    await flip()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    found = await rows()
    await expect(found.tables).toHaveCount(0)
    await expect(found.tableOrders).toHaveCount(0)
    // Delivery and pickup is a switch of its own, and stays.
    await expect(found.delivery.first()).toBeVisible()
    await closeSidebar(page)

    // Opened by its address, a page switched off hands over to Overview.
    await page.goto('/table-orders')
    await expect(page).toHaveURL(/\/overview$/)
    await page.goto('/tables')
    await expect(page).toHaveURL(/\/overview$/)

    await page.goto('/features')
    await flip()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    found = await rows()
    await expect(found.tables.first()).toBeVisible()
    await expect(found.tableOrders.first()).toBeVisible()
  })
})
