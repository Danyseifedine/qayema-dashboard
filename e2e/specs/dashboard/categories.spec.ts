import type { Locator, Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { callApi } from '../../support/helpers'

/** The categories are listed in this order, read from their delete buttons. */
async function expectOrder(page: Page, names: string[]) {
  const deletes = page.getByRole('button', { name: /^Delete / })
  await expect(deletes).toHaveCount(names.length)
  for (const [index, name] of names.entries()) {
    await expect(deletes.nth(index)).toHaveAccessibleName(`Delete ${name}`)
  }
}

/** The card of one category, by its name (its delete button names it in either language). */
const card = (page: Page, name: string) =>
  page
    .locator('div')
    .filter({ has: page.getByRole('button', { name: either(`Delete ${name}`, `حذف ${name}`) }) })
    .last()

const handle = (page: Page, name: string) =>
  card(page, name).getByRole('button', { name: 'Reorder' })

async function dragWithMouse(page: Page, from: Locator, to: Locator) {
  const start = await from.boundingBox()
  const end = await to.boundingBox()
  if (!start || !end) throw new Error('Nothing to drag between')

  const x = start.x + start.width / 2
  const y = start.y + start.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  // Past the sensor's 8px, so it reads as a drag rather than a tap.
  await page.mouse.move(x, y - 12, { steps: 4 })
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2 - 4, { steps: 20 })
  await page.mouse.up()
}

const reordered = (page: Page) =>
  page.waitForResponse(
    (response) => response.url().endsWith('/api/categories/reorder') && response.ok(),
  )

test.describe('categories', () => {
  test('an owner adds a category @matrix', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/categories')

    await expect(page.getByText(either('No categories yet', 'لا توجد أقسام بعد'))).toBeVisible()
    await page
      .getByRole('button', { name: either('Add your first category', 'أضف قسمك الأول') })
      .click()

    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: either('New category', 'قسم جديد') }),
    ).toBeVisible()
    // An English-only menu has no language tabs.
    await expect(dialog.getByRole('tablist')).toHaveCount(0)

    await dialog.getByLabel(/^(Name|الاسم)/).fill('Cold mezze')
    await dialog.getByLabel(/^(Description|الوصف)/).fill('Served from noon')
    await dialog.getByRole('button', { name: either('Add category', 'إضافة القسم') }).click()
    await expect(dialog).toBeHidden()

    const row = card(page, 'Cold mezze')
    await expect(row).toContainText('Served from noon')
    await expect(page.getByText('1 / 8')).toBeVisible()

    await page.reload()
    await expect(card(page, 'Cold mezze')).toContainText('Served from noon')
  })

  test('a category needs an English name', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/categories')

    await page.getByRole('button', { name: 'Add category' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add category' }).click()
    await expect(dialog.getByText('A category name is required in English.')).toBeVisible()
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('No categories yet')).toBeVisible()
  })

  test('a menu with a second language names a category in both', async ({ page, owner }) => {
    await owner({ package: 'pro', second_locale: 'ar' })
    await page.goto('/categories')

    await page.getByRole('button', { name: 'Add category' }).first().click()
    const dialog = page.getByRole('dialog')
    const tabs = dialog.getByRole('tablist', { name: 'Content language' }).first()
    await expect(tabs.getByRole('tab')).toHaveText(['EN•', 'AR'])

    await dialog.getByLabel(/^Name/).fill('Desserts')
    await tabs.getByRole('tab', { name: /^AR/ }).click()
    await expect(dialog.getByLabel(/^Name/)).toHaveAttribute('dir', 'rtl')
    await dialog.getByLabel(/^Name/).fill('حلويات')
    await dialog.getByRole('button', { name: 'Add category' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    await page.getByRole('button', { name: 'Edit Desserts', exact: true }).click()
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('Desserts')
    await dialog.getByRole('tablist').first().getByRole('tab', { name: /^AR/ }).click()
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('حلويات')
  })

  test('a package without languages shows no second language, even when one is set', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'free', second_locale: 'ar' })
    await page.goto('/categories')

    await page.getByRole('button', { name: 'Add category' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel(/^Name/)).toBeVisible()
    await expect(dialog.getByRole('tablist')).toHaveCount(0)
  })

  test('an owner renames a category and changes its description', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [{ name: { en: 'Soups' }, description: { en: 'Hot every day' } }],
    })
    await page.goto('/categories')

    await page.getByRole('button', { name: 'Edit Soups', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Edit category' })).toBeVisible()
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('Soups')
    await dialog.getByLabel(/^Name/).fill('Soups & stews')
    await dialog.getByLabel(/^Description/).fill('Slow-cooked since morning')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Category renamed')).toBeVisible()

    await page.reload()
    await expect(card(page, 'Soups & stews')).toContainText('Slow-cooked since morning')
    await expect(page.getByRole('button', { name: 'Edit Soups', exact: true })).toHaveCount(0)

    // Clearing the description removes it.
    await page.getByRole('button', { name: 'Edit Soups & stews', exact: true }).click()
    await dialog.getByLabel(/^Description/).fill('')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Soups & stews')).not.toContainText('Slow-cooked')
  })

  test('deleting a category asks first and keeps its dishes', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Sandwiches' },
          dishes: [{ name: { en: 'Falafel wrap' } }, { name: { en: 'Kafta wrap' } }],
        },
        { name: { en: 'Drinks' }, dishes: [{ name: { en: 'Jallab' } }] },
      ],
    })
    await page.goto('/categories')
    await expect(card(page, 'Sandwiches')).toContainText('2 dishes')

    // Cancel keeps it.
    await page.getByRole('button', { name: 'Delete Sandwiches', exact: true }).click()
    const confirm = page.getByRole('dialog').filter({ hasText: 'Delete this category?' })
    await expect(confirm).toContainText('Its dishes are kept')
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toBeHidden()
    await expect(card(page, 'Sandwiches')).toBeVisible()

    await page.getByRole('button', { name: 'Delete Sandwiches', exact: true }).click()
    await confirm.getByRole('button', { name: 'Delete' }).click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('Category deleted')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Sandwiches', exact: true })).toHaveCount(
      0,
    )
    await expectOrder(page, ['Drinks'])

    // The dishes are still on the Dishes page, without a category.
    await page.getByRole('button', { name: 'Go to dishes' }).click()
    await expect(page).toHaveURL(/\/dishes$/)
    await expect(page.getByRole('heading', { name: 'Falafel wrap' })).toBeVisible()
    const orphans = page.getByRole('tab', { name: /^No category/ })
    await expect(orphans).toHaveText('No category2')
    await orphans.click()
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Falafel wrap', 'Kafta wrap'])
  })

  test('deleting the last category leaves its dishes waiting for a new one', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'free',
      categories: [{ name: { en: 'Only one' }, dishes: [{ name: { en: 'Lonely dish' } }] }],
    })
    await page.goto('/categories')

    await page.getByRole('button', { name: 'Delete Only one', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('No categories yet')).toBeVisible()

    await page.goto('/dishes')
    await expect(page.getByText('These dishes have no category')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lonely dish' })).toBeVisible()
  })

  test('dragging a category with the mouse changes the order for good', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        { name: { en: 'Alpha' } },
        { name: { en: 'Bravo' } },
        { name: { en: 'Charlie' } },
      ],
    })
    await page.goto('/categories')
    await expectOrder(page, ['Alpha', 'Bravo', 'Charlie'])

    const saved = reordered(page)
    await dragWithMouse(page, handle(page, 'Charlie'), handle(page, 'Alpha'))
    await saved
    await expectOrder(page, ['Charlie', 'Alpha', 'Bravo'])

    await page.reload()
    await expectOrder(page, ['Charlie', 'Alpha', 'Bravo'])
  })

  test('the keyboard reorders categories too', async ({ page, owner }) => {
    const { categories } = await owner({
      package: 'free',
      categories: [
        { name: { en: 'Alpha' } },
        { name: { en: 'Bravo' } },
        { name: { en: 'Charlie' } },
      ],
    })
    await page.goto('/categories')
    await expectOrder(page, ['Alpha', 'Bravo', 'Charlie'])

    const grip = handle(page, 'Alpha')
    await grip.focus()
    await page.keyboard.press('Space')
    await expect(grip).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByText(`was moved over droppable area ${categories[1]!.id}.`),
    ).toBeAttached()
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByText(`was moved over droppable area ${categories[2]!.id}.`),
    ).toBeAttached()

    const saved = reordered(page)
    await page.keyboard.press('Space')
    await saved
    await expectOrder(page, ['Bravo', 'Charlie', 'Alpha'])

    await page.reload()
    await expectOrder(page, ['Bravo', 'Charlie', 'Alpha'])
  })

  test('the free package stops at eight categories', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: Array.from({ length: 8 }, (_, index) => ({
        name: { en: `Section ${index + 1}` },
      })),
    })
    await page.goto('/categories')

    await expect(page.getByText('8 / 8')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add category' })).toBeDisabled()
    await expect(
      page.getByText('You have used every category your plan allows. Delete one to add another.'),
    ).toBeVisible()

    // The server refuses a ninth whatever the page shows.
    const response = await callApi(page, 'POST', '/api/categories', { name: { en: 'Ninth' } })
    expect(response.status()).toBe(422)
    const body = (await response.json()) as { errors: Record<string, string[]> }
    expect(body.errors.name?.[0]).toBe('You have reached your plan limit of 8 categories.')

    // Deleting one frees a slot.
    await page.getByRole('button', { name: 'Delete Section 8', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('7 / 8')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add category' })).toBeEnabled()
  })
})
