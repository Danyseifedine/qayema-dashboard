import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { openSidebar } from '../../support/helpers'

/**
 * Closes the phone drawer with its X. The backdrop shares the name but its
 * centre is under the open drawer, so clicking it only works mid-slide.
 */
async function closeSidebar(page: Page) {
  if (test.info().project.name === 'phone') {
    await page
      .getByRole('button', { name: either('Close navigation', 'إغلاق القائمة') })
      .last()
      .click()
  }
}

/** Flips a feature switch and waits for the server to have it. */
async function flip(page: Page, name: RegExp | string) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/api/features') && response.request().method() === 'PUT',
  )
  await page.getByRole('switch', { name }).click()
  expect((await saved).ok()).toBeTruthy()
}

test.describe('features', () => {
  test('Multiple languages off takes the second language out of the category and dish forms', async ({
    page,
    owner,
  }) => {
    // Only the switch changed in the session before, so the forms kept an
    // Arabic field until the page reloaded.
    await owner({
      package: 'premium',
      second_locale: 'ar',
      categories: [{ name: { en: 'Grills' } }],
    })
    await page.goto('/categories')

    const open = async (name: string) => {
      const nav = await openSidebar(page)
      await nav.getByRole('button', { name, exact: true }).click()
    }
    const arabicIn = async (page_: 'Categories' | 'Dishes') => {
      await open(page_)
      const add = page_ === 'Categories' ? 'Add category' : 'Add dish'
      await page.getByRole('button', { name: add }).first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('textbox').first()).toBeVisible()
      const arabic = dialog.getByRole('tab', { name: 'AR' })
      const count = await arabic.count()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      return count
    }

    expect(await arabicIn('Categories')).toBeGreaterThan(0)
    expect(await arabicIn('Dishes')).toBeGreaterThan(0)

    await open('Features')
    await flip(page, 'Multiple languages on')
    expect(await arabicIn('Categories')).toBe(0)
    expect(await arabicIn('Dishes')).toBe(0)

    await open('Features')
    await flip(page, 'Multiple languages on')
    expect(await arabicIn('Categories')).toBeGreaterThan(0)
    expect(await arabicIn('Dishes')).toBeGreaterThan(0)
  })

  test('switching Analytics off takes it out of the sidebar, and back on returns it @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium' })
    await page.goto('/features')

    const analyticsSwitch = page.getByRole('switch', {
      name: either('Analytics on', 'تشغيل الإحصاءات'),
    })
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true')

    let nav = await openSidebar(page)
    const analyticsRow = nav.getByRole('button', { name: either('Analytics', 'الإحصاءات') })
    await expect(analyticsRow).toBeVisible()
    await closeSidebar(page)

    await flip(page, either('Analytics on', 'تشغيل الإحصاءات'))
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false')
    nav = await openSidebar(page)
    await expect(analyticsRow).toHaveCount(0)
    await closeSidebar(page)

    // It stays off after a reload.
    await page.reload()
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false')
    nav = await openSidebar(page)
    await expect(analyticsRow).toHaveCount(0)
    await closeSidebar(page)

    await flip(page, either('Analytics on', 'تشغيل الإحصاءات'))
    await expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true')
    nav = await openSidebar(page)
    await expect(analyticsRow).toBeVisible()
  })

  test('each of the four switches goes off and on, and survives a reload', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({ package: 'premium', second_locale: 'ar' })
    await page.goto('/features')
    const nav = page.getByRole('navigation', { name: 'Dashboard' })

    for (const name of ['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on']) {
      await flip(page, name)
      await expect(page.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false')
    }

    // What each one leaves behind.
    await expect(nav.getByRole('button', { name: /^Orders/ })).toHaveCount(0)
    await expect(nav.getByRole('button', { name: /^Analytics/ })).toHaveCount(0)
    // The plain QR code keeps its page.
    await expect(nav.getByRole('button', { name: /^QR code/ })).toBeVisible()
    await expect(
      page.getByText("Guests can't order from your menu while this is off.", { exact: false }),
    ).toBeVisible()
    await expect(
      page.getByText('Your plain black QR code stays on the QR code page', { exact: false }),
    ).toBeVisible()
    await expect(page.getByText('Your menu shows English only.', { exact: false })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Second language' })).toHaveCount(0)
    await expectAccessible()

    await page.reload()
    for (const name of ['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on']) {
      await expect(page.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false')
    }

    for (const name of ['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on']) {
      await flip(page, name)
    }
    await page.reload()
    for (const name of ['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on']) {
      await expect(page.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'true')
    }
    await expect(nav.getByRole('button', { name: /^Orders/ })).toBeVisible()
    await expect(nav.getByRole('button', { name: /^Analytics/ })).toBeVisible()
    // The second language was kept while languages were off.
    await expect(page.getByRole('combobox', { name: 'Second language' })).toHaveValue(
      'Arabic · العربية',
    )
  })

  test('a pro owner picks the second language and the one the menu opens in', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'pro', second_locale: 'ar' })
    await page.goto('/features')

    const second = page.getByRole('combobox', { name: 'Second language' })
    await expect(second).toHaveValue('Arabic · العربية')
    const opening = page.getByRole('tablist', { name: 'The menu opens in' })
    await expect(opening.getByRole('tab', { name: 'English' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // Type to find it.
    await second.click()
    await second.fill('fren')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.getByRole('option', { name: 'French · Français' }).click()
    await expect(page.getByText('Menu languages saved')).toBeVisible()
    await expect(second).toHaveValue('French · Français')
    await expect(opening.getByRole('tab', { name: 'French' })).toBeVisible()
    await expect(opening.getByRole('tab', { name: 'English' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await opening.getByRole('tab', { name: 'French' }).click()
    await expect(opening.getByRole('tab', { name: 'French' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByText('Menu languages saved').first()).toBeVisible()

    await page.reload()
    await expect(second).toHaveValue('French · Français')
    await expect(opening.getByRole('tab', { name: 'French' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // The public menu now opens in French.
    const context = await browser.newContext()
    const guest = await context.newPage()
    await guest.goto(restaurant.restaurant.public_url)
    await expect(guest.locator('html')).toHaveAttribute('lang', 'fr')
    await context.close()
  })

  test('a pro owner without a second language sees the picker but no opening choice', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'pro' })
    await page.goto('/features')

    await expect(page.getByRole('combobox', { name: 'Second language' })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Second language' })).toHaveAttribute(
      'placeholder',
      'Choose a language',
    )
    await expect(page.getByRole('tablist', { name: 'The menu opens in' })).toHaveCount(0)
    // Pro has everything on this page except Orders and QR Studio, which come
    // with Premium.
    await expect(
      page.getByRole('button', { name: 'Available on Premium. See packages' }),
    ).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Available on Pro. See packages' })).toHaveCount(
      0,
    )
  })

  test('a free owner is told what is not on the package and gets no language pickers', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({ package: 'free' })
    await page.goto('/features')

    await expect(page.getByRole('switch')).toHaveCount(4)
    // Each names the first package that has it.
    await expect(
      page.getByRole('button', { name: 'Available on Premium. See packages' }),
    ).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Available on Pro. See packages' })).toHaveCount(
      2,
    )
    // Nothing on this page is in Free: every switch is off and locked, and
    // each one offers the packages that have it.
    for (const name of ['Orders on', 'QR Studio on', 'Analytics on', 'Multiple languages on']) {
      await expect(page.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false')
      await expect(page.getByRole('switch', { name })).toBeDisabled()
    }
    await expect(page.getByRole('combobox', { name: 'Second language' })).toHaveCount(0)
    await expect(page.getByRole('tablist', { name: 'The menu opens in' })).toHaveCount(0)
    await expectAccessible()

    await page
      .getByRole('button', { name: /See packages$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/package$/)
  })
})
