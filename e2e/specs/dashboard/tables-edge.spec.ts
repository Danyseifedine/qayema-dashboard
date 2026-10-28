import type { Browser, Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'

/**
 * Tables beyond the everyday (tables.spec.ts): the cards on paper, and a
 * new code taking ordering away from the old printed one.
 */

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [{ name: { en: 'Kafta' }, price: 12.5 }],
}

/** Adds a numbered run of tables from the empty page. */
async function addNumbered(page: Page, to: number) {
  await page.getByRole('button', { name: either('Add your tables', 'أضف طاولاتك') }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(either('To', 'إلى')).fill(String(to))
  await dialog.getByRole('button', { name: /^(Add( \d+)? tables?|إضافة)/ }).click()
  await expect(dialog).toBeHidden()
}

/** The menu at a table's link, in a signed-out browser. */
async function atTable(browser: Browser, url: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(url)
  await guest
    .locator('article.dish', { hasText: 'Kafta' })
    .getByRole('button', { name: 'Add Kafta' })
    .click()
  return { cart: guest.locator('aside.col-aside'), close: () => context.close() }
}

test.describe('tables: edge cases', () => {
  test('printing puts one card per table on paper and nothing else, then lets go of it @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu' })
    // The browser's print window cannot be driven: count the calls instead.
    await page.addInitScript(() => {
      ;(window as unknown as { printed: number }).printed = 0
      window.print = () => {
        ;(window as unknown as { printed: number }).printed += 1
      }
    })
    await page.goto('/tables')
    await addNumbered(page, 3)

    await page.getByRole('button', { name: either('Print all cards', 'طباعة كل البطاقات') }).click()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed))
      .toBe(1)

    const sheet = page.locator('.qy-print-sheet')
    // Never on screen; on paper, the cards alone.
    await expect(sheet).toBeHidden()
    await page.emulateMedia({ media: 'print' })
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('section')).toHaveCount(3)
    for (const n of [1, 2, 3]) {
      await expect(sheet.locator('section').nth(n - 1)).toContainText(
        new RegExp(`(Table|طاولة) ${n}`),
      )
    }
    await expect(sheet.locator('canvas, svg').first()).toBeVisible()
    await expect(page.locator('#root')).toBeHidden()

    // Done with the print window, the sheet goes.
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
    await expect(sheet).toHaveCount(0)
    await page.emulateMedia({ media: 'screen' })
    await expect(page.locator('#root')).toBeVisible()
  })

  test('a new code: the old printed card opens the menu but no longer orders to the table', async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: [GRILLS] })
    await page.goto('/tables')
    await addNumbered(page, 1)
    const card = page.locator('article').filter({ hasText: 'Table 1' })
    const open = card.getByRole('button', { name: 'Open the menu at this table' })

    let popup = page.waitForEvent('popup')
    await open.click()
    const old = await popup
    const oldUrl = old.url()
    await old.close()

    await card.getByRole('button', { name: 'New code' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /new code/i })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden()

    popup = page.waitForEvent('popup')
    await open.click()
    const fresh = await popup
    const freshUrl = fresh.url()
    await fresh.close()
    expect(freshUrl).not.toBe(oldUrl)

    let guest = await atTable(browser, freshUrl)
    await expect(guest.cart).toContainText('Table 1')
    await guest.close()

    guest = await atTable(browser, oldUrl)
    await expect(guest.cart.locator('.cart-line', { hasText: 'Kafta' })).toBeVisible()
    await expect(guest.cart).not.toContainText('Table 1')
    await guest.close()
  })
})
