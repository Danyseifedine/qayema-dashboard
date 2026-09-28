import type { Page } from '@playwright/test'
import { either, expect, test } from '../fixtures/test'

/** A summary tile: its label and the number under it. */
function tile(page: Page, label: RegExp | string) {
  return page.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) })
}

/** Waits for the summary of one range to come back. */
function summaryFor(page: Page, range: string) {
  return page.waitForResponse(
    (response) =>
      /\/api\/analytics(\?|$)/.test(response.url()) &&
      new URL(response.url()).searchParams.get('range') === range,
  )
}

test.describe('analytics', () => {
  test('a pro owner reads views, visitors and QR scans, over 7 or 30 days @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'pro', visits: 6, qr_scans: 4 })
    const first = summaryFor(page, '30d')
    await page.goto('/analytics')
    expect((await first).ok()).toBeTruthy()

    await expect(tile(page, either('Menu views', 'مشاهدات القائمة'))).toContainText('6')
    await expect(tile(page, either('Visitors', 'الزوار'))).toContainText('6')
    await expect(tile(page, either('QR scans', 'مسح رمز QR'))).toContainText('4')
    // Pro takes no orders, so there is no orders tile.
    await expect(page.locator('dl > div')).toHaveCount(3)

    const range = page.getByRole('tablist', { name: either('Range', 'الفترة') })
    await expect(range.getByRole('tab', { name: either('30 days', '30 يومًا') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const week = summaryFor(page, '7d')
    await range.getByRole('tab', { name: either('7 days', '7 أيام') }).click()
    expect((await week).ok()).toBeTruthy()
    await expect(range.getByRole('tab', { name: either('7 days', '7 أيام') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(tile(page, either('Menu views', 'مشاهدات القائمة'))).toContainText('6')

    // The longer ranges come with advanced analytics.
    for (const name of [either('90 days', '90 يومًا'), either('All time', 'كل الفترات')]) {
      const tab = range.getByRole('tab', { name })
      await expect(tab).toBeDisabled()
      await expect(tab).toHaveAttribute(
        'title',
        either('Comes with advanced analytics', 'متاحة مع الإحصاءات المتقدّمة'),
      )
    }

    const locked = page.getByRole('heading', { name: /Advanced analytics|الإحصاءات المتقدّمة/ })
    await expect(locked).toBeVisible()
    await expect(locked).toContainText(/Premium|مميّز/)
  })

  test('how guests arrive splits QR scans from links', async ({ page, owner }) => {
    await owner({ package: 'pro', visits: 4, qr_scans: 1 })
    await page.goto('/analytics')

    const arrive = page.getByRole('list', { name: 'How guests arrive' })
    await expect(
      arrive.getByRole('listitem').filter({ hasText: 'Scanned the QR code' }),
    ).toContainText('25%')
    await expect(arrive.getByRole('listitem').filter({ hasText: 'Opened a link' })).toContainText(
      '75%',
    )
  })

  test('the advanced section is locked on pro, naming Premium, and leads to packages', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({ package: 'pro', visits: 2 })
    const advanced: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/analytics/advanced')) advanced.push(request.url())
    })
    await page.goto('/analytics')

    await expect(page.getByRole('heading', { name: /Advanced analytics/ })).toContainText('Premium')
    await expect(page.getByText('Your busiest hours and days')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Busiest times' })).toHaveCount(0)
    await expectAccessible()
    // Never asked for, rather than asked for and refused.
    expect(advanced).toEqual([])

    await page.getByRole('button', { name: 'See packages' }).click()
    await expect(page).toHaveURL(/\/package$/)
  })

  test('a premium owner gets the advanced sections and every range', async ({ page, owner }) => {
    await owner({ package: 'premium', visits: 5, qr_scans: 2, orders: 1 })
    await page.goto('/analytics')

    await expect(tile(page, 'Menu views')).toContainText('5')
    await expect(tile(page, 'Orders')).toContainText('1')
    for (const title of [
      'Busiest times',
      'What guests do',
      'From visit to order',
      'Most added to the cart',
      'Most opened categories',
      'What guests search for',
      'Searched but not found',
      'Languages',
    ]) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: /Advanced analytics/ })).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'Languages' })).toContainText('English')

    const range = page.getByRole('tablist', { name: 'Range' })
    for (const [name, key] of [
      ['90 days', '90d'],
      ['All time', 'all'],
    ] as const) {
      const tab = range.getByRole('tab', { name })
      await expect(tab).toBeEnabled()
      const loaded = summaryFor(page, key)
      await tab.click()
      expect((await loaded).ok()).toBeTruthy()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      await expect(tile(page, 'Menu views')).toContainText('5')
    }
    // All time has nothing before it to compare with.
    await expect(tile(page, 'Menu views')).toContainText('Nothing to compare')
  })

  test('a restaurant nobody has visited yet shows empty states', async ({ page, owner }) => {
    await owner({ package: 'premium' })
    await page.goto('/analytics')

    await expect(tile(page, 'Menu views')).toContainText('0')
    await expect(
      page.getByText('No visits in this range yet. Share your menu link', { exact: false }),
    ).toBeVisible()
    await expect(page.getByText('No visits in this range yet.', { exact: true })).toBeVisible()
    await expect(page.getByText('No searches in this range.')).toBeVisible()
    await expect(page.getByText('Every search found something.')).toBeVisible()
    await expect(page.getByText('Nothing added to a cart in this range.')).toBeVisible()
  })

  test('a free owner finds Analytics locked, with this week’s views as a teaser', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({ package: 'free', visits: 5 })
    await page.goto('/overview')

    const nav = page.getByRole('navigation', { name: 'Dashboard' })
    const row = nav.getByRole('button', { name: /Analytics/ })
    await expect(row).toContainText('Pro')
    await row.click()
    await expect(page).toHaveURL(/\/analytics$/)

    await expect(page.getByRole('heading', { name: /See how guests use your menu/ })).toContainText(
      'Pro',
    )
    await expect(page.getByText('Comes with the Pro package.', { exact: false })).toBeVisible()
    await expect(page.getByText('5 people opened your menu this week.')).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Range' })).toHaveCount(0)
    await expectAccessible()

    await page.getByRole('button', { name: 'See packages' }).click()
    await expect(page).toHaveURL(/\/package$/)
  })

  test('the teaser says one person in the singular', async ({ page, owner }) => {
    await owner({ package: 'free', visits: 1 })
    await page.goto('/analytics')
    await expect(page.getByText('1 person opened your menu this week.')).toBeVisible()
  })
})
