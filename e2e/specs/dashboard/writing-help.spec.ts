import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { API_URL } from '../../support/urls'

/**
 * The AI writing help, on the real backend with a pretend Gemini
 * (tests/E2e/E2eServiceProvider in ../qayema): switched on only for the
 * requests of a test that sends its header, so every other spec sees it off.
 */
const CATEGORY_LINE = 'Warm plates to share with friends at the start of every long meal.'
const RESTAURANT_LINE =
  'Good food and good company come together here, for slow lunches and easy dinners with the people you love.'
const SPENT = either(
  'Come back tomorrow for more AI help.',
  'عُد غدًا لمزيد من المساعدة بالذكاء الاصطناعي.',
)

const WRITE = either('Write with AI', 'اكتب بالذكاء الاصطناعي')
const IMPROVE = either('Improve with AI', 'حسّن بالذكاء الاصطناعي')
const TO_ARABIC = either('Translate to Arabic', 'ترجم إلى العربية')

/** Only the API's requests carry the switch; a font host would refuse the header. */
async function withWritingHelp(page: Page) {
  await page.route(`${API_URL}/api/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-e2e-writing-help': '1' } }),
  )
}

async function openNewCategory(page: Page) {
  await page.goto('/categories')
  await page
    .getByRole('button', { name: either('Add your first category', 'أضف قسمك الأول') })
    .click()
  return page.getByRole('dialog')
}

test.describe('writing help', () => {
  test('an owner translates a name and writes a description with AI @matrix', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    const dialog = await openNewCategory(page)

    // Each button carries the day's uses: none spent of Pro's 100.
    await expect(dialog.getByText('0/100').first()).toBeVisible()
    await expect(dialog.getByRole('button', { name: WRITE })).toBeDisabled()

    await dialog.getByLabel(/^(Name|الاسم)/).fill('Soups')
    await dialog.getByRole('button', { name: TO_ARABIC }).first().click()
    // The Arabic tab opens with the translation in it.
    await expect(dialog.getByLabel(/^(Name|الاسم)/)).toHaveValue('Translated: Soups')
    await expect(dialog.getByText('1/100').first()).toBeVisible()

    await dialog.getByRole('button', { name: WRITE }).click()
    await expect(dialog.getByLabel(/^(Description|الوصف)/)).toHaveValue(CATEGORY_LINE)
    // The server counts each one: two spent now.
    await expect(dialog.getByText('2/100').first()).toBeVisible()
    await expect(dialog.getByRole('button', { name: IMPROVE })).toBeVisible()

    await dialog.getByRole('button', { name: either('Add category', 'إضافة القسم') }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(CATEGORY_LINE).first()).toBeVisible()
  })

  test('the restaurant description is written from the menu and saved with the page', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    await page.goto('/restaurant')

    const description = page.getByLabel(/^Description/)
    await expect(description).toHaveValue('Grills and mezze, made to share.')
    await page.getByRole('button', { name: 'Improve with AI' }).click()
    await expect(description).toHaveValue(RESTAURANT_LINE)

    await page.getByRole('button', { name: 'Translate to Arabic' }).first().click()
    await expect(page.getByLabel(/^Restaurant name/)).toHaveValue('Translated: E2E Kitchen')

    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('You have unsaved changes.')).toBeHidden()
    await page.reload()
    await expect(page.getByLabel(/^Description/)).toHaveValue(RESTAURANT_LINE)
  })

  test('with the writing help off there is no AI button anywhere', async ({ page, owner }) => {
    await owner({ package: 'pro', second_locale: 'ar' })
    const dialog = await openNewCategory(page)

    await expect(dialog.getByLabel(/^Name/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: /with AI|Translate/ })).toHaveCount(0)

    await page.goto('/restaurant')
    await expect(page.getByLabel(/^Description/)).toBeVisible()
    await expect(page.getByRole('button', { name: /with AI|Translate/ })).toHaveCount(0)
  })

  test('a day already spent opens with the buttons red and locked, said once', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar', writing_help_used: 100 })
    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')

    for (const button of await dialog.getByRole('button', { name: /with AI|Translate/ }).all()) {
      await expect(button).toBeDisabled()
      await expect(button).toContainText('100/100')
    }
    await expect(dialog.getByText(SPENT)).toHaveCount(1)
  })

  test('the last use locks the buttons, and another tab finds them spent', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar', writing_help_used: 99 })
    // A second tab, opened while one use was still left.
    const other = await page.context().newPage()
    await withWritingHelp(other)
    const otherDialog = await openNewCategory(other)
    await otherDialog.getByLabel(/^Name/).fill('Grills')
    await expect(otherDialog.getByText('99/100').first()).toBeVisible()

    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')
    await dialog.getByRole('button', { name: 'Write with AI' }).click()
    await expect(dialog.getByLabel(/^Description/)).toHaveValue(CATEGORY_LINE)
    // That was the last one: every button here locks.
    await expect(dialog.getByRole('button', { name: 'Improve with AI' })).toBeDisabled()
    await expect(dialog.getByText(SPENT)).toHaveCount(1)

    // The other tab still shows one left; the server says otherwise.
    await otherDialog.getByRole('button', { name: 'Write with AI' }).click()
    await expect(
      other.getByText("You have used today's writing help. It comes back tomorrow."),
    ).toBeVisible()
    await expect(otherDialog.getByRole('button', { name: 'Write with AI' })).toBeDisabled()
    await expect(otherDialog.getByLabel(/^Description/)).toHaveValue('')
    await other.close()
  })

  test('a busy writing help says to try again and changes nothing', async ({ page, owner }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    await page.route('**/api/writing/translate', (route) =>
      route.fulfill({
        status: 503,
        json: {
          message: 'Writing help is busy right now. Try again in a moment.',
          code: 'writing_help_busy',
        },
      }),
    )
    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')

    await dialog.getByRole('button', { name: 'Translate to Arabic' }).first().click()

    await expect(page.getByText('Could not translate')).toBeVisible()
    await expect(
      page.getByText('Writing help is busy right now. Try again in a moment.'),
    ).toBeVisible()
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('Soups')
    await expect(dialog.getByRole('button', { name: 'Translate to Arabic' }).first()).toBeEnabled()
  })

  test('the AI buttons pass the accessibility check', async ({ page, owner, expectAccessible }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')
    await expect(dialog.getByRole('button', { name: 'Write with AI' })).toBeEnabled()

    await expectAccessible(page, { include: 'dialog' })
  })

  test('the Package page says how much AI help each package gives', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/package')

    await expect(page.getByText('100 AI writing uses a day').first()).toBeVisible()
    const row = page.getByRole('rowheader', { name: 'AI writing help a day' }).locator('xpath=..')
    await expect(row.getByRole('cell').first()).toHaveText('10')
  })
})
