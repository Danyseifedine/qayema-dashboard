import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'

const CLASSIC_ACCENT = '#F8D38D'

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

  test('switching designs keeps the look', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'premium', categories: MENU })
    await page.goto('/appearance')

    const main = colour(page, /^Main colour$/)
    await main.fill('#AA3355')
    let saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved
    await expect(page.getByText('All saved')).toBeVisible()

    // Switch to Midnight: it opens with the colour the menu had.
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
    await expect(page.getByText('Choose the colours for your Midnight design.')).toBeVisible()
    await expect(main).toHaveValue('#AA3355')
    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#AA3355',
    )

    // A change on Midnight goes along when switching back.
    await page.goto('/appearance')
    await main.fill('#0B3D2E')
    saved = saveSettings(page)
    await page.getByRole('button', { name: 'Save' }).click()
    await saved

    // Back to Classic: the latest look comes too.
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
    await expect(page.getByText('Choose the colours for your Classic design.')).toBeVisible()
    await expect(main).toHaveValue('#0B3D2E')
    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#0B3D2E',
    )
  })

  test('a colour picked by dragging and with the arrow keys reaches the menu @matrix', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'pro', categories: MENU })
    await page.goto('/appearance')
    const main = colour(page, MAIN)
    await expect(main).toHaveValue(CLASSIC_ACCENT)

    const swatch = page.getByRole('button', {
      name: either('Main colour, picker', 'اللون الرئيسي، اختيار اللون'),
    })
    await swatch.click()
    const picker = page.getByRole('dialog', {
      name: either('Main colour, picker', 'اللون الرئيسي، اختيار اللون'),
    })
    const shade = picker.getByRole('slider', { name: either('Shade', 'الدرجة') })
    const hue = picker.getByRole('slider', { name: either('Hue', 'اللون') })

    // Dragged past the shade box's top left corner it is white: the drag
    // follows the pointer off the box. In Arabic too, the box reads left to right.
    const box = (await shade.boundingBox())!
    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x - 30, box.y - 30)
    await page.mouse.up()
    await expect(main).toHaveValue('#FFFFFF')

    // Dragged to past the top right: the full colour of the hue.
    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y - 10)
    await page.mouse.move(box.x + box.width + 30, box.y - 10)
    await page.mouse.up()
    await expect(shade).toHaveAttribute('aria-valuenow', '100')
    await expect(shade).toHaveAttribute('aria-valuetext', /100%.*100%/)

    // Home on the hue strip is red; Shift and Down five times halves the brightness.
    await hue.focus()
    await page.keyboard.press('Home')
    await expect(main).toHaveValue('#FF0000')
    await shade.focus()
    for (let step = 0; step < 5; step += 1) await page.keyboard.press('Shift+ArrowDown')
    await expect(main).toHaveValue('#800000')

    // Escape closes the picker and keeps the colour.
    await page.keyboard.press('Escape')
    await expect(picker).toBeHidden()
    await expect(swatch).toBeFocused()
    const saved = saveSettings(page)
    await page.getByRole('button', { name: either('Save', 'حفظ') }).click()
    await saved

    expect((await publicVariable(page, restaurant.public_url, '--accent')).toUpperCase()).toBe(
      '#800000',
    )
  })
})
