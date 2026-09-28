import type { Page } from '@playwright/test'
import { either, expect, test } from '../fixtures/test'

const CLASSIC_ACCENT = '#F8D38D'
const MIDNIGHT_ACCENT = '#1F6FEB'

const MENU = [{ name: { en: 'Mains' }, dishes: [{ name: { en: 'Kafta' } }] }]

/** A CSS variable on the public menu's root. */
async function publicVariable(page: Page, url: string, name: string): Promise<string> {
  await page.goto(url)
  return page.evaluate(
    (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
    name,
  )
}

/** The hex box of one colour setting (the swatch beside it is the "picker"). */
const colour = (page: Page, label: RegExp) => page.getByLabel(label, { exact: true })

const MAIN = either('Main colour', 'اللون الرئيسي')

const saveSettings = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/appearance') &&
      response.request().method() === 'PUT' &&
      response.ok(),
  )

test.describe('appearance', () => {
  test('the free package shows what Appearance gives and who has it', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/appearance')

    await expect(page.getByRole('heading', { name: 'Make the menu look like yours' })).toBeVisible()
    await expect(
      page.getByText('Comes with the Pro package. Everything you made stays as it is.'),
    ).toBeVisible()
    await expect(page.getByText('Your own colours, with a readability check')).toBeVisible()
    await expect(page.getByLabel(MAIN, { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'See packages' }).click()
    await expect(page).toHaveURL(/\/package$/)
  })

  test('a new main colour reaches the public menu @matrix', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'pro', categories: MENU })
    await page.goto('/appearance')

    const main = colour(page, MAIN)
    await expect(main).toHaveValue(CLASSIC_ACCENT)
    await expect(page.getByText(either('All saved', 'كل شيء محفوظ'))).toBeVisible()

    await main.fill('#1a7f5a')
    await expect(page.getByText(either('Unsaved changes', 'تغييرات غير محفوظة'))).toBeVisible()
    const saved = saveSettings(page)
    await page.getByRole('button', { name: either('Save', 'حفظ') }).click()
    await saved
    await expect(page.getByText(either('All saved', 'كل شيء محفوظ'))).toBeVisible()
    await expect(main).toHaveValue('#1A7F5A')

    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#1A7F5A',
    )
  })

  test('reset puts a colour back to the design’s own', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'pro',
      categories: MENU,
      settings: { primary_color: '#123456' },
    })
    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#123456',
    )

    await page.goto('/appearance')
    const main = colour(page, /^Main colour$/)
    await expect(main).toHaveValue('#123456')

    const reset = page.getByRole('button', { name: "Reset Main colour to the design's colour" })
    await reset.click()
    await expect(main).toHaveValue(CLASSIC_ACCENT)
    await expect(reset).toHaveCount(0)

    const saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved
    await expect(page.getByText('All saved')).toBeVisible()

    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      CLASSIC_ACCENT,
    )
  })

  test('a text colour hard to read on the background is flagged', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/appearance')

    const warning = page.getByText('Hard to read on Background. Try a lighter or darker shade.')
    await expect(warning).toHaveCount(0)

    await colour(page, /^Text$/).fill('#EEEEEE')
    await expect(warning).toBeVisible()

    await colour(page, /^Background$/).fill('#1B1B1B')
    await expect(warning).toHaveCount(0)
  })

  test('the name beside the logo can be hidden', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'pro',
      name: { en: 'Nameless Grill' },
      categories: MENU,
    })

    await page.goto(restaurant.public_url)
    const brand = page.locator('.topbar .brand-name')
    await expect(brand).toHaveText('Nameless Grill')

    await page.goto('/appearance')
    const show = page.getByRole('switch', { name: 'Name in the top bar' })
    await expect(show).toBeChecked()
    await show.click()
    await expect(show).not.toBeChecked()
    const saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved

    await page.goto(restaurant.public_url)
    await expect(page.locator('.topbar .brand-name')).toHaveCount(0)
    // Screen readers still hear the name on the brand link.
    await expect(page.getByRole('link', { name: 'Nameless Grill' })).toBeVisible()
  })

  test('a picked font is the menu’s font', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'pro', categories: MENU })
    await page.goto('/appearance')

    // An English-only menu has one picker.
    await expect(page.getByRole('group')).toHaveCount(1)
    const latin = page.getByRole('group', { name: 'English' })
    await expect(latin.getByRole('radio', { name: /Inter/ })).toBeChecked()

    const saved = saveSettings(page)
    await latin.getByText('Poppins', { exact: true }).click()
    await expect(latin.getByRole('radio', { name: /Poppins/ })).toBeChecked()
    await saved

    await page.reload()
    await expect(
      page.getByRole('group', { name: 'English' }).getByRole('radio', { name: /Poppins/ }),
    ).toBeChecked()

    expect(await publicVariable(page, restaurant.public_url, '--font')).toMatch(/^'Poppins'/)
  })

  test('a menu with Arabic gets a second font picker', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'pro',
      second_locale: 'ar',
      categories: [
        {
          name: { en: 'Mains', ar: 'أطباق رئيسية' },
          dishes: [{ name: { en: 'Kafta', ar: 'كفتة' } }],
        },
      ],
    })
    await page.goto('/appearance')

    await expect(page.getByRole('group', { name: 'English' })).toBeVisible()
    const arabic = page.getByRole('group', { name: 'Arabic' })
    await expect(arabic.getByRole('radio', { name: /El Messiri/ })).toBeChecked()

    const saved = saveSettings(page)
    await arabic.getByText('Cairo', { exact: true }).click()
    await saved

    expect(await publicVariable(page, `${restaurant.public_url}?lang=ar`, '--font')).toContain(
      "'Cairo'",
    )
  })

  test('each design remembers its own colours', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'premium', categories: MENU })
    await page.goto('/appearance')

    const main = colour(page, /^Main colour$/)
    await main.fill('#AA3355')
    let saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved
    await expect(page.getByText('All saved')).toBeVisible()

    // Switch to Midnight: its own default, not Classic's choice.
    await page.goto('/design')
    await page
      .getByRole('article')
      .filter({ hasText: 'Midnight' })
      .getByRole('button', { name: 'Use this design' })
      .click()
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: 'Midnight' })
        .getByText('In use', { exact: true }),
    ).toBeVisible()

    await page.goto('/appearance')
    await expect(page.getByRole('heading', { name: 'Midnight' })).toBeVisible()
    await expect(main).toHaveValue(MIDNIGHT_ACCENT)
    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      MIDNIGHT_ACCENT,
    )

    // A change on Midnight stays on Midnight.
    await page.goto('/appearance')
    await main.fill('#0B3D2E')
    saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved

    // Back to Classic: its colour is still there.
    await page.goto('/design')
    await page
      .getByRole('article')
      .filter({ hasText: 'Classic' })
      .getByRole('button', { name: 'Use this design' })
      .click()
    await expect(
      page.getByRole('article').filter({ hasText: 'Classic' }).getByText('In use', { exact: true }),
    ).toBeVisible()

    await page.goto('/appearance')
    await expect(page.getByRole('heading', { name: 'Classic' })).toBeVisible()
    await expect(main).toHaveValue('#AA3355')
    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#AA3355',
    )
  })
})
