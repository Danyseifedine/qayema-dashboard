import type { Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { callApi } from '../../support/helpers'
import { ADMIN_URL } from '../../support/urls'

/**
 * How the admin is laid out: the menu's groups and badges, a restaurant's
 * page with every part of it a tab away, and the inbox keeping open
 * messages apart from handled ones. The small helpers are copied from
 * admin.spec.ts, which this file may not import from.
 */

const ADMIN_EMAIL = 'admin@e2e.test'

function tag(): string {
  return Math.random().toString(36).slice(2, 8)
}

async function asAdmin(page: Page, signIn: (email: string) => Promise<void>): Promise<void> {
  await page.goto('about:blank')
  await page.context().clearCookies()
  await signIn(ADMIN_EMAIL)
}

test.describe('admin layout', () => {
  test('the menu has the daily work on top, then menu content, then settings', async ({
    page,
    signIn,
  }) => {
    await asAdmin(page, signIn)
    await page.goto(ADMIN_URL)

    const sidebar = page.locator('.fi-sidebar-nav')
    const labels = sidebar.locator('.fi-sidebar-item-label, .fi-sidebar-group-label')
    await expect(labels).toHaveText([
      'Dashboard',
      'Restaurants',
      'Inbox',
      'Users',
      'Menu content',
      'Dishes',
      'Categories',
      'Social links',
      'Offers',
      'Settings',
      'Packages',
      'AI credits',
      'Templates',
      'Blocked IPs',
    ])
    await expect(page.getByText('A month', { exact: true })).toBeVisible()
  })

  test("a restaurant's page holds its details and its menu in tabs", async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({
      package: 'pro',
      name: { en: `Tabs ${word}` },
      categories: [{ name: { en: 'Grills' }, dishes: [{ name: { en: `Kafta ${word}` } }] }],
    })

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/restaurants/${owner.restaurant.id}/edit`)
    await expect(page.getByText('At a glance')).toBeVisible()
    await expect(page.getByText('1 / 150 dishes')).toBeVisible()

    await page.getByRole('tab', { name: 'Dishes' }).click()
    await expect(page.getByRole('row').filter({ hasText: `Kafta ${word}` })).toBeVisible()
    await page.getByRole('tab', { name: 'Categories' }).click()
    await expect(page.getByRole('row').filter({ hasText: 'Grills' })).toBeVisible()
    await page.getByRole('tab', { name: 'Details' }).click()
    await expect(page.getByLabel('Name (English)')).toHaveValue(`Tabs ${word}`)
  })

  test('a message marked handled leaves the open inbox and can be reopened', async ({
    page,
    owner,
    signIn,
  }) => {
    const created = await owner({ package: 'free', name: { en: `Inbox ${tag()}` } })
    const sent = await callApi(page, 'POST', '/api/packages/request', {
      package: 'pro',
      message: 'Please move me to Pro.',
    })
    expect(sent.status()).toBe(201)

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/contact-messages`)
    const search = page.getByRole('searchbox', { name: 'Search', exact: true })
    await search.fill(created.user.email)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    await expect(message).toContainText('Pro')

    await message.getByRole('button', { name: 'Mark handled' }).click()
    await expect(page.getByText('Marked handled').first()).toBeVisible()
    await expect(message).toHaveCount(0)

    await page.getByRole('tab', { name: 'Handled' }).click()
    await search.fill(created.user.email)
    await message.getByRole('button', { name: 'Reopen' }).click()
    await expect(message).toHaveCount(0)
    await page.getByRole('tab', { name: /^Open/ }).click()
    await search.fill(created.user.email)
    await expect(message).toBeVisible()
  })
})
