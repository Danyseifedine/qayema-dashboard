import { devices, type Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { LOGIN_URL } from '../../support/urls'

/** Every sidebar section: its nav key (the path) and its label in each language. */
const SECTIONS: [key: string, english: string, arabic: string][] = [
  ['overview', 'Overview', 'نظرة عامة'],
  ['analytics', 'Analytics', 'الإحصاءات'],
  ['categories', 'Categories', 'الأقسام'],
  ['dishes', 'Dishes', 'الأطباق'],
  ['design', 'Design', 'التصميم'],
  ['appearance', 'Appearance', 'المظهر'],
  ['orders', 'Orders', 'الطلبات'],
  ['qr', 'QR code', 'رمز QR'],
  ['social-links', 'Social links', 'روابط التواصل'],
  ['restaurant', 'Restaurant', 'المطعم'],
  ['features', 'Features', 'الميزات'],
  ['package', 'Package', 'الباقة'],
]

const nav = (page: Page) =>
  page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })

/** Below `lg` the sidebar is a drawer, closed until the menu button opens it. */
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024

async function openNav(page: Page) {
  if (isPhone(page)) {
    await page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') }).click()
  }
  await expect(nav(page)).toBeVisible()
}

async function openSection(page: Page, label: RegExp) {
  await openNav(page)
  await nav(page).getByRole('button', { name: label }).click()
}

/** The page heading in the top bar names the open section. */
const title = (page: Page) => page.getByRole('heading', { level: 1 })

async function openUserMenu(page: Page) {
  await page.getByRole('button', { name: either('Account menu', 'قائمة الحساب') }).click()
  return page.getByRole('menu')
}

test.describe('navigation', () => {
  test('every section has its own address and a refresh stays on it @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium' })

    await page.goto('/')
    await expect(page).toHaveURL(/\/overview$/)

    for (const [key, english, arabic] of SECTIONS) {
      await openSection(page, either(english, arabic))
      await expect(page).toHaveURL(new RegExp(`/${key}$`))
      await expect(title(page)).toHaveText(either(english, arabic))
    }

    await openSection(page, either('Dishes', 'الأطباق'))
    await expect(page).toHaveURL(/\/dishes$/)

    await page.reload()
    await expect(page).toHaveURL(/\/dishes$/)
    await expect(title(page)).toHaveText(either('Dishes', 'الأطباق'))
    await openNav(page)
    await expect(
      nav(page).getByRole('button', { name: either('Dishes', 'الأطباق') }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('opening a section by its address shows it', async ({ page, owner }) => {
    await owner({ package: 'premium' })

    for (const [key, english] of SECTIONS) {
      await page.goto(`/${key}`)
      await expect(title(page)).toHaveText(english)
      await expect(nav(page).getByRole('button', { name: english, exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
    }

    // The account page is reached from the avatar menu, and has its own address too.
    await page.goto('/account')
    await expect(title(page)).toHaveText('Account')
  })

  test('the browser back and forward buttons move between sections', async ({ page, owner }) => {
    await owner({ package: 'premium' })
    await page.goto('/overview')
    await expect(title(page)).toHaveText('Overview')

    await openSection(page, /^Dishes$/)
    await expect(title(page)).toHaveText('Dishes')
    await openSection(page, /^Categories$/)
    await expect(title(page)).toHaveText('Categories')

    await page.goBack()
    await expect(page).toHaveURL(/\/dishes$/)
    await expect(title(page)).toHaveText('Dishes')

    await page.goBack()
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')

    await page.goForward()
    await expect(page).toHaveURL(/\/dishes$/)
    await expect(title(page)).toHaveText('Dishes')
    await expect(nav(page).getByRole('button', { name: 'Dishes', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('an unknown address opens the overview and the address says so', async ({ page, owner }) => {
    await owner({ package: 'free' })

    await page.goto('/no-such-page')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')

    await page.goto('/dishes/extra/segments')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')
  })

  test('the root opens the overview once a design is chosen', async ({ page, owner }) => {
    await owner({ package: 'free', template: 'classic' })

    await page.goto('/')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')
  })

  test('without a design the root and unknown addresses open the design page', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'free', template: null })

    await page.goto('/')
    await expect(page).toHaveURL(/\/design$/)
    await expect(title(page)).toHaveText('Design')

    await page.goto('/somewhere-else')
    await expect(page).toHaveURL(/\/design$/)
  })

  test('sections that need a design are disabled until one is chosen', async ({ page, owner }) => {
    await owner({ package: 'premium', template: null })
    await page.goto('/design')
    await expect(title(page)).toHaveText('Design')

    for (const name of ['Categories', 'Dishes', 'Appearance', 'Orders', 'QR code', 'Restaurant']) {
      await expect(nav(page).getByRole('button', { name, exact: true })).toBeDisabled()
    }
    for (const name of ['Overview', 'Analytics', 'Design', 'Social links', 'Features', 'Package']) {
      await expect(nav(page).getByRole('button', { name, exact: true })).toBeEnabled()
    }

    // Reached by its address, a locked section explains itself and points to the designs.
    await page.goto('/dishes')
    await expect(page.getByText('Choose a menu design first')).toBeVisible()
    await page.getByRole('button', { name: 'Browse designs' }).click()
    await expect(page).toHaveURL(/\/design$/)

    // Picking a design opens them up.
    await page
      .getByRole('article')
      .filter({ hasText: 'Classic' })
      .getByRole('button', { name: 'Use this design' })
      .click()
    await expect(nav(page).getByRole('button', { name: 'Dishes', exact: true })).toBeEnabled()
    await nav(page).getByRole('button', { name: 'Dishes', exact: true }).click()
    await expect(page).toHaveURL(/\/dishes$/)
    await expect(page.getByRole('heading', { name: 'Dishes', level: 2 })).toBeVisible()
  })

  test('a section switched off hands over to the overview', async ({ page, owner }) => {
    await owner({ package: 'premium' })

    await page.goto('/analytics')
    await expect(title(page)).toHaveText('Analytics')

    await openSection(page, /^Features$/)
    const saved = page.waitForResponse(
      (response) => response.url().endsWith('/api/features') && response.ok(),
    )
    await page.getByRole('switch', { name: 'Analytics on' }).click()
    await saved
    await expect(page.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()
    await expect(nav(page).getByRole('button', { name: 'Analytics', exact: true })).toHaveCount(0)

    // Back to the page that was open: it is gone, so the overview takes its place.
    await page.goBack()
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')

    // The same from its address, after a reload.
    await page.goto('/analytics')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(title(page)).toHaveText('Overview')
  })

  test('a section switched off before the visit is not in the sidebar', async ({ page, owner }) => {
    await owner({ package: 'premium', switched_off: ['analytics', 'orders'] })

    await page.goto('/orders')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(nav(page).getByRole('button', { name: 'Orders', exact: true })).toHaveCount(0)
    await expect(nav(page).getByRole('button', { name: 'Analytics', exact: true })).toHaveCount(0)
    await expect(nav(page).getByRole('button', { name: 'QR code', exact: true })).toBeVisible()
  })

  test('a collapsed sidebar stays collapsed after a reload', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/overview')

    const sidebar = nav(page)
    await sidebar.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect(sidebar.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
    // The rail shows icons only; each keeps its name for assistive technology.
    await expect(sidebar.getByRole('button', { name: 'Dishes', exact: true })).toHaveAttribute(
      'title',
      'Dishes',
    )
    await expect(sidebar.getByText('Dishes', { exact: true })).toHaveCount(0)

    await page.reload()
    await expect(sidebar.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
    await sidebar.getByRole('button', { name: 'Dishes', exact: true }).click()
    await expect(page).toHaveURL(/\/dishes$/)

    await sidebar.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect(sidebar.getByText('Dishes', { exact: true })).toBeVisible()
    await page.reload()
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()
  })

  test('the language switches between English and Arabic and is remembered', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'pro' })
    await page.goto('/overview')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    let menu = await openUserMenu(page)
    await menu.getByRole('tab', { name: 'ع' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(title(page)).toHaveText('نظرة عامة')
    expect(await page.evaluate(() => localStorage.getItem('qayema.dashboard.locale.v1'))).toBe('ar')

    // A new tab (without this test's language preset) opens in Arabic.
    const again = await page.context().newPage()
    await again.goto('/overview')
    await expect(again.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(again.getByRole('heading', { level: 1 })).toHaveText('نظرة عامة')
    await again.close()

    // The menu stayed open through the switch; Escape closes it.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
    menu = await openUserMenu(page)
    await menu.getByRole('tab', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(title(page)).toHaveText('Overview')
    expect(await page.evaluate(() => localStorage.getItem('qayema.dashboard.locale.v1'))).toBe('en')
  })

  test('dark mode switches on and off and is remembered', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/overview')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    let menu = await openUserMenu(page)
    const dark = menu.getByRole('switch', { name: 'Dark mode' })
    await expect(dark).not.toBeChecked()
    await dark.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(dark).toBeChecked()

    const again = await page.context().newPage()
    await again.goto('/overview')
    await expect(again.locator('html')).toHaveAttribute('data-theme', 'dark')
    await again.close()

    await page.keyboard.press('Escape')
    menu = await openUserMenu(page)
    await menu.getByRole('switch', { name: 'Dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await page.evaluate(() => localStorage.getItem('qayema.dashboard.theme.v1'))).toBe(
      'light',
    )
  })

  test('"View public menu" opens the restaurant’s menu', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'free', name: { en: 'Public Link Diner' } })
    await page.goto('/overview')

    // The top bar names the menu's address too.
    await expect(
      page.getByRole('link', { name: restaurant.public_url.replace(/^https?:\/\//, '') }),
    ).toHaveAttribute('href', restaurant.public_url)

    const menu = await openUserMenu(page)
    const link = menu.getByRole('menuitem', { name: 'View public menu' })
    await expect(link).toHaveAttribute('href', restaurant.public_url)
    await expect(link).toHaveAttribute('target', '_blank')

    const [guest] = await Promise.all([page.waitForEvent('popup'), link.click()])
    await expect(guest).toHaveURL(restaurant.public_url)
    await expect(guest).toHaveTitle('Public Link Diner')
    await guest.close()
    await expect(page.getByRole('menu')).toHaveCount(0)
  })

  test('the account page opens from the avatar menu', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/overview')

    const menu = await openUserMenu(page)
    await menu.getByRole('menuitem', { name: 'Account' }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(title(page)).toHaveText('Account')
  })

  test('logging out ends the session and leaves for the sign-in page', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/overview')
    await expect(title(page)).toHaveText('Overview')

    const menu = await openUserMenu(page)
    await menu.getByRole('menuitem', { name: 'Log out' }).click()
    await expect(page).toHaveURL(LOGIN_URL)

    // The dashboard no longer lets this browser in.
    await page.goto('/overview')
    await expect(page).toHaveURL(LOGIN_URL)
  })
})

test.describe('navigation on a phone', () => {
  const { defaultBrowserType: _browser, ...phone } = devices['Pixel 7']
  test.use(phone)

  test('the drawer opens and closes', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/overview')
    await expect(title(page)).toHaveText(either('Overview', 'نظرة عامة'))

    const open = page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') })
    const close = page.getByRole('button', { name: either('Close navigation', 'إغلاق القائمة') })

    // Closed: nothing of the sidebar is exposed.
    await expect(nav(page)).toHaveCount(0)

    // The close button beside the drawer closes it.
    await open.click()
    await expect(nav(page)).toBeVisible()
    await close.last().click()
    await expect(nav(page)).toHaveCount(0)

    // Escape closes it.
    await open.click()
    await expect(nav(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(nav(page)).toHaveCount(0)

    // A tap on the backdrop closes it.
    await open.click()
    await expect(nav(page)).toBeVisible()
    await page.mouse.click((page.viewportSize()?.width ?? 400) - 10, 400)
    await expect(nav(page)).toHaveCount(0)

    // Choosing a section closes it and opens the section.
    await open.click()
    await nav(page)
      .getByRole('button', { name: either('Categories', 'الأقسام') })
      .click()
    await expect(page).toHaveURL(/\/categories$/)
    await expect(nav(page)).toHaveCount(0)
  })
})
