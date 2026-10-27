import type { Locator, Page } from '@playwright/test'
import { daysFromNow, expect, test } from '../../support/fixtures'
import { callApi, openSidebar } from '../../support/helpers'
import { ADMIN_URL } from '../../support/urls'

/**
 * The package and entitlement edges packages.spec.ts and overrides.spec.ts
 * leave out: where "ending soon" starts, renewing an offline menu through a
 * request, what overrides do to the Package page, and a restaurant's own
 * price at its extremes.
 */

/** The owner's Package page card for one package. */
function packageCard(page: Page, name: string): Locator {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

/** One of the current package's usage rows (Dishes, Categories, Social links). */
function usage(page: Page, label: string): Locator {
  return page.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) })
}

/** The Filament modal that is open now (copied from admin.spec.ts). */
function openModal(page: Page): Locator {
  return page.locator('.fi-modal.fi-modal-open')
}

/** Pick one of a Filament ToggleButtons field's options (copied from admin.spec.ts). */
async function choose(modal: Locator, option: string): Promise<void> {
  await modal
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${option}\\s*$`) })
    .click()
  await expect(modal.getByRole('radio', { name: option, exact: true })).toBeChecked()
}

test.describe('packages: where "ending soon" starts', () => {
  test('seven days left warns and offers to extend; eight days left does not', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'pro', package_ends_at: daysFromNow(7) })
    await page.goto('/package')
    await expect(page.getByText('7 days left')).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText('Ending soon. Ask us to extend it so your menu stays online.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask to extend' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Pro package, 7 days left. Open your package.' }),
    ).toBeVisible()

    // A second owner, a day further from the end.
    await owner({ package: 'pro', package_ends_at: daysFromNow(8) })
    await page.goto('/package')
    await expect(page.getByText('8 days left')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/^Ending soon/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ask to extend' })).toHaveCount(0)
  })
})

test.describe('packages: renewing an offline menu', () => {
  test('the owner asks to renew, the admin applies the request, and the menu is back at once', async ({
    page,
    owner,
    signIn,
  }) => {
    const created = await owner({
      package: 'pro',
      package_starts_at: daysFromNow(-60),
      package_ends_at: daysFromNow(-4),
    })
    expect((await page.request.get(created.restaurant.public_url)).status()).toBe(404)

    await page.goto('/dishes')
    await expect(page.getByRole('heading', { name: 'Your menu is offline' })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole('button', { name: 'Ask to renew' }).click()
    await expect(page).toHaveURL(/\/package$/)
    // The Package page has its own "Ask to renew", under what ended.
    await expect(
      page.getByText(/Your menu is offline: guests cannot open it until you renew/),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Ask to renew' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ask about Pro' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText('Request sent')).toBeVisible()

    // The admin, on another browser.
    await page.goto('about:blank')
    await page.context().clearCookies()
    await signIn('admin@e2e.test')
    await page.goto(`${ADMIN_URL}/contact-messages`)
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(created.user.email)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    await expect(message).toContainText('Pro', { timeout: 20_000 })
    await message
      .getByRole('link', { name: 'View' })
      .or(message.getByRole('button', { name: 'View' }))
      .first()
      .click()
    await page.getByRole('button', { name: 'Apply this package' }).click()
    const modal = openModal(page)
    await expect(modal.getByRole('heading', { name: /on Pro$/ })).toBeVisible()
    await choose(modal, 'A number of months')
    await modal.getByRole('button', { name: 'Save package', exact: true }).click()
    await expect(openModal(page)).toHaveCount(0)

    // Online the moment it is applied: no job to wait for.
    expect((await page.request.get(created.restaurant.public_url)).status()).toBe(200)

    await page.goto('about:blank')
    await page.context().clearCookies()
    await signIn(created.user.email)
    await page.goto('/dishes')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dishes', { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Your menu is offline' })).toHaveCount(0)
    await expect(page.getByText(/Your menu goes offline on/)).toHaveCount(0)
    await page.goto('/package')
    await expect(page.getByText(/^Your Pro package ended/)).toHaveCount(0)
    await expect(page.getByText(/\d+ days left/).first()).toBeVisible()
  })
})

test.describe('packages: renewing from a request, as the form comes', () => {
  test('“Apply this package” on a renewal saves as it opens and the menu is back', async ({
    page,
    owner,
    signIn,
  }) => {
    const created = await owner({
      package: 'pro',
      package_starts_at: daysFromNow(-60),
      package_ends_at: daysFromNow(-4),
    })
    // The request the Package page's "Ask to renew" sends.
    const sent = await callApi(page, 'POST', '/api/packages/request', { package: 'pro' })
    expect(sent.ok(), `${sent.status()} ${await sent.text()}`).toBeTruthy()

    await page.goto('about:blank')
    await page.context().clearCookies()
    await signIn('admin@e2e.test')
    await page.goto(`${ADMIN_URL}/contact-messages`)
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(created.user.email)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    await expect(message).toContainText('Pro', { timeout: 20_000 })
    await message
      .getByRole('link', { name: 'View' })
      .or(message.getByRole('button', { name: 'View' }))
      .first()
      .click()
    await page.getByRole('button', { name: 'Apply this package' }).click()
    const modal = openModal(page)
    await expect(modal.getByRole('heading', { name: /on Pro$/ })).toBeVisible()
    // Saved as it opens: the package asked for, starting now.
    await modal.getByRole('button', { name: 'Save package', exact: true }).click()
    await expect(modal.getByText('The ends field must be a date after starts.')).toHaveCount(0)
    await expect(openModal(page)).toHaveCount(0)
    expect((await page.request.get(created.restaurant.public_url)).status()).toBe(200)
  })
})

test.describe('packages: what overrides do to the Package page', () => {
  test('a raised limit, an unlimited one and a feature turned off all show as the owner’s own', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'pro',
      overrides: [
        { feature: 'dish_limit', value: 60 },
        { feature: 'category_limit', value: null },
        { feature: 'analytics', value: 0 },
      ],
    })
    await page.goto('/package')

    await expect(usage(page, 'Dishes')).toContainText('0 / 60', { timeout: 20_000 })
    // Unlimited has nothing to count against: the count alone.
    await expect(usage(page, 'Categories').locator('dd')).toHaveText('0')
    // Pro's own two, untouched.
    await expect(usage(page, 'Social links')).toContainText('0 / 2')
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: /^Analytics/ })
        .first(),
    ).toContainText('turned off')

    // Analytics, which Pro has, is not offered as an upgrade.
    const nav = await openSidebar(page)
    await expect(nav.getByRole('button', { name: /^\s*Analytics/ })).toHaveCount(0)
    await page.goto('/analytics')
    await expect(page.getByText('Turned off for your restaurant')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Contact us' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'See packages' })).toHaveCount(0)
  })

  test('a set limit holds whatever the package: moving down to Free keeps it', async ({
    page,
    owner,
    setPackage,
  }) => {
    const created = await owner({
      package: 'premium',
      overrides: [{ feature: 'social_link_limit', value: 5 }],
    })
    await setPackage(created.restaurant.id, { package: 'free' })

    await page.goto('/social-links')
    await expect(page.getByText('0 / 5')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('0 / 1')).toHaveCount(0)
  })

  test('a feature an override brings arrives switched on, even one the owner had switched off', async ({
    page,
    owner,
  }) => {
    // Switched off while Free could not use it, then given by an admin.
    await owner({
      package: 'free',
      switched_off: ['analytics'],
      overrides: [{ feature: 'analytics', value: 1 }],
    })
    await page.goto('/features')

    const analytics = page.getByRole('switch', { name: 'Analytics on' })
    await expect(analytics).toBeEnabled({ timeout: 20_000 })
    await expect(analytics).toHaveAttribute('aria-checked', 'true')
    const nav = page.getByRole('navigation', { name: 'Dashboard' })
    await expect(nav.getByRole('button', { name: /^\s*Analytics/ })).toBeVisible()
  })
})

test.describe('packages: a restaurant’s own price', () => {
  test('an own price of 0 reads Free on the current card; the other cards keep theirs', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'pro', price_cents: 0 })
    await page.goto('/package')

    const pro = packageCard(page, 'Pro')
    await expect(pro.getByText('Free', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(pro).not.toContainText('$7.99')
    // Only the owner's own package is at the owner's price.
    await expect(packageCard(page, 'Premium')).toContainText('$10.00')
  })
})
