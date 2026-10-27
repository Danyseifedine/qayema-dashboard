import type { Browser, Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [{ name: { en: 'Kafta' }, price: 12.5 }],
}

/** A table's card, found by the name on it. */
const card = (page: Page, name: string) => page.locator('article').filter({ hasText: name })

/** The menu as a guest who scanned a table's code: a browser of their own. */
async function scanTable(browser: Browser, url: string) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(url)
  return { guest, close: () => context.close() }
}

test.describe('tables', () => {
  test('tables are added by number and by name, renamed, given a new code and removed', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu' })
    await page.goto('/tables')
    await expect(page.getByText('No tables yet')).toBeVisible()

    // Numbered: the dialog says what it will add before it does.
    await page.getByRole('button', { name: 'Add your tables' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^To/).fill('3')
    await expect(dialog.getByText('Adds 3 tables, Table 1 to Table 3.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Add 3 tables' }).click()
    await expect(page.getByText('3 tables', { exact: true })).toBeVisible()

    // One by name, in Arabic too.
    await page.getByRole('button', { name: 'Add tables' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByText('One by name').click()
    await dialog.getByRole('button', { name: 'Add table' }).click()
    await expect(dialog.getByText('Give the table a name.')).toBeVisible()
    await dialog.getByLabel(/Table name/).fill('طاولة الشرفة')
    await dialog.getByRole('button', { name: 'Add table' }).click()
    await expect(page.getByText('4 tables', { exact: true })).toBeVisible()
    await expect(card(page, 'طاولة الشرفة')).toBeVisible()

    // Renamed in place: still four tables.
    await card(page, 'Table 2').getByRole('button', { name: 'Rename' }).click()
    dialog = page.getByRole('dialog', { name: 'Rename table' })
    await dialog.getByLabel(/Table name/).fill('Window')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(card(page, 'Window')).toBeVisible()
    await expect(page.getByText('4 tables', { exact: true })).toBeVisible()

    // A new code asks first, since the printed card stops working.
    await card(page, 'Window').getByRole('button', { name: 'New code' }).click()
    await expect(page.getByRole('dialog', { name: 'New code for Window?' })).toContainText(
      'The card on this table stops working straight away.',
    )
    await page.getByRole('button', { name: 'Make a new code' }).click()
    await expect(page.getByRole('button', { name: 'Make a new code' })).toHaveCount(0)

    // Removing asks too.
    await card(page, 'Table 3').getByRole('button', { name: 'Remove' }).click()
    await page.getByRole('button', { name: 'Remove table' }).click()
    await expect(page.getByText('3 tables', { exact: true })).toBeVisible()
    await expect(card(page, 'Table 3')).toHaveCount(0)
  })

  test("a guest orders from a table's code and the order arrives on Table orders, by table", async ({
    page,
    browser,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', categories: [GRILLS] })
    await page.goto('/tables')
    await page.getByRole('button', { name: 'Add your tables' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('One by name').click()
    await dialog.getByLabel(/Table name/).fill('Terrace')
    await dialog.getByRole('button', { name: 'Add table' }).click()

    // The owner's own look at the table's menu opens it without the scan mark.
    const popup = page.waitForEvent('popup')
    await card(page, 'Terrace').getByRole('button', { name: 'Open the menu at this table' }).click()
    const ownerView = await popup
    const url = new URL(ownerView.url())
    expect(url.searchParams.get('qr')).toBeNull()
    expect(url.searchParams.get('table')).toBeTruthy()
    await ownerView.close()

    const { guest, close } = await scanTable(browser, url.toString())
    const kafta = guest.locator('article.dish', { hasText: 'Kafta' })
    await kafta.getByRole('button', { name: 'Add Kafta' }).click()
    const cart = guest.locator('.col-aside')
    await expect(cart).toContainText('Terrace')
    const placed = guest.waitForResponse(
      (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
    )
    await cart.getByRole('button', { name: /Place order/ }).click()
    expect((await placed).status()).toBe(201)
    await close()

    await page.goto('/table-orders')
    const order = page.locator('article').filter({ hasText: 'Kafta' })
    await expect(order).toContainText('Terrace')
    await expect(order).toContainText('$12.50')
  })
})
