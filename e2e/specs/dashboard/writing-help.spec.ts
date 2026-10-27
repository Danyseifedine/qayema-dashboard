import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { API_URL, DASHBOARD_URL } from '../../support/urls'

/**
 * The AI writing help, on the real backend with a pretend Gemini
 * (tests/E2e/E2eServiceProvider in ../qayema): switched on only for the
 * requests of a test that sends its header, so every other spec sees it off.
 */
const CATEGORY_LINE = 'Warm plates to share with friends at the start of every long meal.'
const RESTAURANT_LINE =
  'Good food and good company come together here, for slow lunches and easy dinners with the people you love.'
/** Said once on a screen when the month's credits are spent. */
const SPENT = /used this month's AI credits\. They come back on/

const WRITE = either('Write with AI', 'اكتب بالذكاء الاصطناعي')
const IMPROVE = either('Improve with AI', 'حسّن بالذكاء الاصطناعي')
const TO_ARABIC = either('Translate to Arabic', 'ترجم إلى العربية')
/** A button's tooltip: the credits left of Pro's 7,500 this month (Western digits in Arabic too). */
const LEFT = (left: number) =>
  new RegExp(
    `${Math.floor(left / 1000)}[,٬]?${String(left % 1000).padStart(3, '0')} (of|من) 7[,٬]?500`,
  )

/** Only the API's requests carry the switch; a font host would refuse the header. */
async function withWritingHelp(page: Page) {
  await page.route(`${API_URL}/api/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-e2e-writing-help': '1' } }),
  )
}

/** A new dish's dialog, on a menu with one category. */
async function openNewDish(page: Page) {
  await page.goto('/dishes')
  await page
    .getByRole('button', { name: either('Add dish', 'إضافة طبق') })
    .first()
    .click()
  return page.getByRole('dialog')
}

/** The saved dishes or categories, as the API has them. */
async function saved(page: Page, what: 'dishes' | 'categories') {
  const response = await page.context().request.get(`${API_URL}/api/${what}`, {
    headers: { Accept: 'application/json', Origin: DASHBOARD_URL, Referer: `${DASHBOARD_URL}/` },
  })
  return ((await response.json()) as { data: Record<string, unknown>[] }).data
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

    await expect(dialog.getByRole('button', { name: WRITE })).toBeDisabled()

    await dialog.getByLabel(/^(Name|الاسم)/).fill('Soups')
    // Each button's tooltip carries the month's credits: all of Pro's 7,500 left.
    await expect(dialog.getByRole('button', { name: TO_ARABIC }).first()).toHaveAttribute(
      'title',
      LEFT(7500),
    )
    await dialog.getByRole('button', { name: TO_ARABIC }).first().click()
    // The Arabic tab opens with the translation in it.
    await expect(dialog.getByLabel(/^(Name|الاسم)/)).toHaveValue('Translated: Soups')
    // A translation took one credit.
    await expect(dialog.getByRole('button', { name: WRITE })).toHaveAttribute('title', LEFT(7499))

    await dialog.getByRole('button', { name: WRITE }).click()
    await expect(dialog.getByLabel(/^(Description|الوصف)/)).toHaveValue(CATEGORY_LINE)
    // The server counts each one: a description took three more.
    await expect(dialog.getByRole('button', { name: IMPROVE })).toHaveAttribute('title', LEFT(7496))
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

  test('each use takes the month’s credits, and the buttons say how many are left', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')
    const translate = dialog.getByRole('button', { name: TO_ARABIC }).first()

    await expect(translate).toHaveAttribute('title', /7,500 of 7,500 AI credits left this month/)
    await translate.click()

    // The Arabic tab opens, its button now the other way round.
    const back = dialog.getByRole('button', { name: /^Translate/ }).first()
    await expect(back).toHaveAttribute('title', /7,499 of 7,500 AI credits left this month/)
  })

  test('a month’s credits used up lock the buttons and say when they come back', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({
      package: 'pro',
      second_locale: 'ar',
      writing_help_days: [{ uses: 9, input_tokens: 0, output_tokens: 0, cost: '0', credits: 7500 }],
    })
    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')

    for (const button of await dialog.getByRole('button', { name: /with AI|Translate/ }).all()) {
      await expect(button).toBeDisabled()
      await expect(button).toHaveAttribute(
        'title',
        /used this month's AI credits\. They come back on/,
      )
    }
    await expect(dialog.getByText(/used this month's AI credits/)).toHaveCount(1)
  })

  test('the last credits lock the buttons, and another tab finds them spent', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    // Three left: one description's worth.
    await owner({
      package: 'pro',
      second_locale: 'ar',
      writing_help_days: [{ uses: 9, input_tokens: 0, output_tokens: 0, cost: '0', credits: 7497 }],
    })
    // A second tab, opened while one use was still left.
    const other = await page.context().newPage()
    await withWritingHelp(other)
    const otherDialog = await openNewCategory(other)
    await otherDialog.getByLabel(/^Name/).fill('Grills')
    await expect(otherDialog.getByRole('button', { name: 'Write with AI' })).toHaveAttribute(
      'title',
      /3 of 7,500 AI credits left this month/,
    )

    const dialog = await openNewCategory(page)
    await dialog.getByLabel(/^Name/).fill('Soups')
    await dialog.getByRole('button', { name: 'Write with AI' }).click()
    await expect(dialog.getByLabel(/^Description/)).toHaveValue(CATEGORY_LINE)
    // That was the last one: every button here locks.
    await expect(dialog.getByRole('button', { name: 'Improve with AI' })).toBeDisabled()
    await expect(dialog.getByText(SPENT)).toHaveCount(1)

    // The other tab still shows three left; the server says otherwise.
    await otherDialog.getByRole('button', { name: 'Write with AI' }).click()
    await expect(other.getByText(/You have used this month's AI credits/)).toBeVisible()
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

  test('saving a dish fills in its other language with AI, choices and all @matrix', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({
      package: 'premium',
      second_locale: 'ar',
      categories: [{ name: { en: 'Grills' } }],
    })
    const dialog = await openNewDish(page)

    await dialog.getByLabel(/^(Name|الاسم)/).fill('Kebab')
    await dialog.getByLabel(/^(Ingredients|المكوّنات)/).fill('Lamb, onion')
    await dialog.getByLabel(/^(Price|السعر)/).fill('9')
    await dialog.getByRole('button', { name: either('Add add-on', 'إضافة جديدة') }).click()
    await dialog.getByLabel(either('Add-on 1', 'الإضافة 1'), { exact: true }).fill('Extra bread')
    await dialog.getByRole('button', { name: either('Add dish', 'إضافة الطبق') }).click()
    await expect(dialog).toBeHidden()

    const [dish] = await saved(page, 'dishes')
    expect(dish).toMatchObject({
      name: { en: 'Kebab', ar: 'Translated: Kebab' },
      addons: [{ name: { en: 'Extra bread', ar: 'Translated: Extra bread' } }],
    })
    expect((dish!.ingredients as Record<string, string>).ar).toMatch(/^Translated: Lamb/)
  })

  test('saving a category fills in its other language with AI @matrix', async ({ page, owner }) => {
    await withWritingHelp(page)
    await owner({ package: 'pro', second_locale: 'ar' })
    const dialog = await openNewCategory(page)

    await expect(
      dialog.getByText(
        either(
          'Write in English or Arabic, one is enough. When you save, AI fills in the other.',
          'اكتب باللغة الإنجليزية أو العربية، فلغة واحدة تكفي. عند الحفظ يكمل الذكاء الاصطناعي اللغة الأخرى.',
        ),
      ),
    ).toBeVisible()
    await dialog.getByLabel(/^(Name|الاسم)/).fill('Soups')
    await dialog.getByRole('button', { name: either('Add category', 'إضافة القسم') }).click()
    await expect(dialog).toBeHidden()

    const [category] = await saved(page, 'categories')
    expect(category!.name).toEqual({ en: 'Soups', ar: 'Translated: Soups' })
  })

  test('one button translates every variant and add-on name left in one language', async ({
    page,
    owner,
  }) => {
    await withWritingHelp(page)
    await owner({
      package: 'premium',
      second_locale: 'ar',
      categories: [{ name: { en: 'Grills' } }],
    })
    const dialog = await openNewDish(page)
    const translateAll = dialog.getByRole('button', { name: 'Translate all names' })

    await expect(translateAll).toBeDisabled()
    await dialog.getByRole('button', { name: 'Add add-on' }).click()
    await dialog.getByLabel('Add-on 1', { exact: true }).fill('Extra bread')
    await dialog.getByLabel(/^Price/).fill('9')
    await translateAll.click()

    // The Arabic names open to show it; the dish's own name is left for the save.
    await expect(dialog.getByLabel('Add-on 1', { exact: true })).toHaveValue(
      'Translated: Extra bread',
    )
    await expect(translateAll).toBeDisabled()
  })

  test('a dish still saves as written when the AI cannot translate it', async ({ page, owner }) => {
    await withWritingHelp(page)
    await owner({
      package: 'premium',
      second_locale: 'ar',
      categories: [{ name: { en: 'Grills' } }],
    })
    await page.route(`${API_URL}/api/writing/translate-many`, (route) =>
      route.fulfill({
        status: 503,
        json: {
          message: 'Writing help is busy right now. Try again in a moment.',
          code: 'writing_help_busy',
        },
      }),
    )
    const dialog = await openNewDish(page)

    await dialog.getByLabel(/^Name/).fill('Kebab')
    await dialog.getByRole('button', { name: 'Add dish' }).click()

    await expect(page.getByText('Could not translate')).toBeVisible()
    await expect(dialog).toBeHidden()
    const [dish] = await saved(page, 'dishes')
    expect(dish!.name).toEqual({ en: 'Kebab', ar: null })
  })

  test('the Package page says how much AI help each package gives', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/package')

    // The month's credits are the only AI limit, never what they cost.
    await expect(page.getByText(/AI writing/)).toHaveCount(0)
    await expect(page.getByText('7,500 AI credits a month').first()).toBeVisible()
    const credits = page.getByRole('rowheader', { name: 'AI credits a month' }).locator('xpath=..')
    await expect(credits.getByRole('cell').first()).toHaveText('500')
    await expect(page.getByText(/\$0\.75/)).toHaveCount(0)
  })
})
