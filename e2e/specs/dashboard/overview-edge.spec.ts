import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'

/**
 * Home's first card and numbers: sharing the menu's link with and without a
 * share menu, Preview and QR code, the orders waiting and today's numbers,
 * each a tap from its page. The set-up steps are overview.spec.ts.
 */

const linkCard = (page: Page) =>
  page.getByRole('region', { name: either('Your menu link', 'رابط قائمتك') })

test.describe('overview: the menu link and today', () => {
  test('without a share menu, Share copies the link; Preview opens the menu, QR code its page', async ({
    page,
    context,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'pro' })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    // A computer's browser with no share menu.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/overview')
    const card = linkCard(page)

    await card.getByRole('button', { name: 'Share my menu' }).click()
    await expect(page.getByText('Link copied')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(restaurant.public_url)

    const popup = page.waitForEvent('popup')
    await card.getByRole('button', { name: 'Preview' }).click()
    const menu = await popup
    await expect(menu).toHaveURL(restaurant.public_url)
    await menu.close()

    await card.getByRole('button', { name: 'QR code' }).click()
    await expect(page).toHaveURL(/\/qr$/)
  })

  test('a phone’s share menu gets the link; closing it copies nothing, a failure copies @matrix', async ({
    page,
    context,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'pro' })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    // The first share menu is closed by the owner, the second one fails.
    await page.addInitScript(() => {
      const shared: unknown[] = []
      ;(window as unknown as { shared: unknown[] }).shared = shared
      Object.defineProperty(Navigator.prototype, 'share', {
        configurable: true,
        value: (data: unknown) => {
          shared.push(data)
          const name = shared.length === 1 ? 'AbortError' : 'NotAllowedError'
          return Promise.reject(new DOMException('No share', name))
        },
      })
    })
    await page.goto('/overview')
    const share = linkCard(page).getByRole('button', {
      name: either('Share my menu', 'شارك قائمتي'),
    })

    await share.click()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { shared: { url: string }[] }).shared))
      .toEqual([expect.objectContaining({ url: restaurant.public_url })])
    await share.click()
    // The second share's "copied" is up, and it is the only one: the menu
    // closed before it copied nothing.
    const copied = page.getByText(either('Link copied', 'تم نسخ الرابط'))
    await expect(copied.first()).toBeVisible()
    await expect(copied).toHaveCount(1)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(restaurant.public_url)
  })

  test('orders waiting lead to Orders, and today’s numbers to Analytics', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium', order_mode: 'menu', orders: 2, visits: 30, qr_scans: 12 })
    await page.goto('/overview')

    const today = page.getByRole('region', { name: 'Today' })
    await expect(today.getByRole('button', { name: /^Views\s*30/ })).toBeVisible()
    await expect(today.getByRole('button', { name: /^QR scans\s*12/ })).toBeVisible()
    await expect(today.getByRole('button', { name: /^Orders\s*2/ })).toBeVisible()
    await today.getByRole('button', { name: /^QR scans/ }).click()
    await expect(page).toHaveURL(/\/analytics$/)

    await page.goto('/overview')
    await page.getByText('2 new orders waiting').click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('without analytics on the package, Home has no numbers for today', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'free', visits: 30 })
    await page.goto('/overview')
    await expect(linkCard(page)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Today' })).toHaveCount(0)
  })
})
