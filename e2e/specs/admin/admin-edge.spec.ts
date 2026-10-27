import type { Locator, Page } from '@playwright/test'
import { daysFromNow, expect, test } from '../../support/fixtures'
import { callApi, openSidebar } from '../../support/helpers'
import { ADMIN_URL } from '../../support/urls'

/**
 * The overrides edge cases admin.spec.ts leaves out (the restaurant's
 * "Extras & overrides"): end dates, several for one feature, taking them
 * away, a limit of 0 or unlimited, a feature set on or off, and the owner's
 * way to ask for one back. The small helpers are copied from admin.spec.ts,
 * which this file may not import from. Prices, ended packages, users and
 * deleting are in admin-accounts-edge.spec.ts.
 */

const ADMIN_EMAIL = 'admin@e2e.test'

/**
 * Forget the current session. The page is closed down first: a Livewire or
 * API request still in flight would otherwise set the old cookie again.
 */
async function leave(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.context().clearCookies()
}

/** Leave the owner's session behind and sign in as the admin, as on another browser. */
async function asAdmin(page: Page, signIn: (email: string) => Promise<void>): Promise<void> {
  await leave(page)
  await signIn(ADMIN_EMAIL)
}

/** And back to an owner, to see what the admin's change did to their dashboard. */
async function asOwner(
  page: Page,
  signIn: (email: string) => Promise<void>,
  email: string,
): Promise<void> {
  await leave(page)
  await signIn(email)
}

/**
 * Picks an option in a Filament dropdown (never the browser's own select in
 * this admin): opens the field found by its label, then clicks the option.
 */
async function pick(page: Page, scope: Locator | Page, label: string | RegExp, option: string) {
  const name = typeof label === 'string' ? new RegExp(`^\\s*${label}`) : label
  const field = scope
    .locator('.fi-fo-field')
    .filter({ has: page.locator('.fi-fo-field-label-content', { hasText: name }) })
    .first()
  await field.locator('.fi-select-input-btn').click()
  await page
    .getByRole('option', { name: option, exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(field.locator('.fi-select-input-btn')).toContainText(option)
}

/** The Filament modal that is open now (its role="dialog" box has no size of its own). */
function openModal(page: Page): Locator {
  return page.locator('.fi-modal.fi-modal-open')
}

/** Pick one of a Filament ToggleButtons field's options (the label covers its radio). */
async function choose(modal: Locator, option: string): Promise<void> {
  await modal
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${option}\\s*$`) })
    .click()
  await expect(modal.getByRole('radio', { name: option, exact: true })).toBeChecked()
}

/** The restaurant's relation managers, in the order the edit page shows them. */
const RELATIONS = { 'Extras & overrides': 0, 'Package history': 1 } as const

/**
 * Open a restaurant's edit page on one relation manager (its tab is in the
 * URL), and wait for the manager, which loads lazily, to show its heading.
 */
async function openRelation(
  page: Page,
  restaurantId: number,
  name: keyof typeof RELATIONS,
): Promise<Locator> {
  await page.goto(`${ADMIN_URL}/restaurants/${restaurantId}/edit?relation=${RELATIONS[name]}`)
  // Lazy managers load once they scroll into view.
  await page.getByRole('tablist').scrollIntoViewIfNeeded()
  const panel = page.getByRole('tabpanel')
  await expect(panel.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 20_000 })
  return panel
}

/**
 * Press a modal's submit button and wait for the modal to close, so no
 * Livewire request is still on its way when the test moves on.
 */
async function submit(page: Page, modal: Locator, button: string): Promise<void> {
  await modal.getByRole('button', { name: button, exact: true }).click()
  await expect(openModal(page)).toHaveCount(0)
}

type Override = {
  feature: string
  /** "Set exactly" instead of the form's default, "Add on top of the package". */
  set?: boolean
  limit?: number
  unlimited?: boolean
  state?: 'On' | 'Off'
  until?: string
  note: string
}

/** Add an extra or override on the restaurant's "Extras & overrides" tab, through its form. */
async function addOverride(page: Page, restaurantId: number, override: Override): Promise<void> {
  await openRelation(page, restaurantId, 'Extras & overrides')
  await page.getByRole('button', { name: 'Add extra or override' }).click()
  const modal = openModal(page)
  await pick(page, modal, 'Feature', override.feature)
  if (override.set) {
    await modal.getByText('Set exactly (overrides the package)').click()
  }
  if (override.unlimited) {
    await modal.getByRole('switch', { name: 'Unlimited' }).click()
    await expect(modal.getByRole('spinbutton', { name: /^Limit/ })).toHaveCount(0)
  } else if (override.limit !== undefined) {
    // "Limit" once set, "Amount" when added (the label follows the choice).
    const field = modal.getByRole('spinbutton', { name: override.set ? /^Limit/ : /^Amount/ })
    await expect(field).toBeVisible()
    await field.fill(String(override.limit))
  }
  if (override.state) await choose(modal, override.state)
  // To the second (the picker shows seconds), in UTC like the app.
  if (override.until) await modal.getByLabel('Until').fill(override.until.slice(0, 19))
  await modal.getByLabel('Note').fill(override.note)
  await submit(page, modal, 'Create')
  await expect(page.getByRole('row').filter({ hasText: override.note })).toBeVisible()
}

/** Delete the override whose note is `note`, from the tab already open. */
async function deleteOverride(page: Page, note: string): Promise<void> {
  const row = page.getByRole('row').filter({ hasText: note })
  await row.getByRole('button', { name: 'Delete' }).click()
  await submit(page, openModal(page), 'Delete')
  await expect(row).toHaveCount(0)
}

test.describe('admin: overrides, their dates and their removal', () => {
  test('an override whose end date has passed no longer applies; one still running does', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'pro' })

    await asAdmin(page, signIn)
    // The running one first, so the ended one is the newest: were it still
    // counted, newest-wins would make it the answer.
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 4,
      until: daysFromNow(2),
      note: 'Running for two more days',
    })
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 7,
      until: daysFromNow(-1),
      note: 'Ended yesterday',
    })

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('0 / 4')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('0 / 7')).toHaveCount(0)
  })

  test('two set overrides for one feature: the newest wins, and removing them steps back to the package', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'pro' })

    await asAdmin(page, signIn)
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 6,
      note: 'Older: six links',
    })
    // Lower than the older one: the newest decides, not the largest.
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 3,
      note: 'Newer: three links',
    })

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('0 / 3')).toBeVisible({ timeout: 20_000 })

    await asAdmin(page, signIn)
    await openRelation(page, owner.restaurant.id, 'Extras & overrides')
    await deleteOverride(page, 'Newer: three links')

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('0 / 6')).toBeVisible({ timeout: 20_000 })

    await asAdmin(page, signIn)
    await openRelation(page, owner.restaurant.id, 'Extras & overrides')
    await deleteOverride(page, 'Older: six links')

    // Pro's own two.
    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('0 / 2')).toBeVisible({ timeout: 20_000 })
  })

  test('an override ending in under a minute lifts by itself when the time comes', async ({
    page,
    scenario,
    signIn,
  }) => {
    // The owner's page is read again until the end passes, under a minute.
    test.slow()
    const owner = await scenario({ package: 'pro' })

    await asAdmin(page, signIn)
    // Long enough to see it applied first, on a slow machine.
    const until = new Date(Date.now() + 45_000).toISOString()
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 5,
      until,
      note: 'Under a minute only',
    })

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('0 / 5')).toBeVisible({ timeout: 20_000 })

    // No job runs at the end: the cached answer only lasts until then.
    await expect(async () => {
      await page.reload()
      await expect(page.getByText('0 / 2')).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 90_000, intervals: [3_000] })
  })

  test('social links set to 0: the link already there stays, and no new one can be added', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({
      package: 'pro',
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/e2e-kitchen' }],
    })

    await asAdmin(page, signIn)
    await addOverride(page, owner.restaurant.id, {
      feature: 'Social links',
      set: true,
      limit: 0,
      note: 'No links for now',
    })
    await expect(page.getByRole('row').filter({ hasText: 'No links for now' })).toContainText(
      'Set to 0',
    )

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/social-links')
    await expect(page.getByText('1 / 0')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: /instagram\.com\/e2e-kitchen/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add link' })).toBeDisabled()
    await expect(
      page.getByText(
        'You have used every social link your plan allows. Remove one to add another.',
      ),
    ).toBeVisible()

    // The server refuses too, whatever the page shows.
    const response = await callApi(page, 'POST', '/api/social-links', {
      platform: 'facebook',
      url: 'https://facebook.com/e2e-kitchen',
    })
    expect(response.status()).toBe(422)
  })

  test('a limit set to unlimited: the counter goes and the owner adds past the package', async ({
    page,
    scenario,
    signIn,
  }) => {
    // Free's eight categories, all used.
    const categories = Array.from({ length: 8 }, (_, index) => ({
      name: { en: `Section ${index + 1}` },
    }))
    const owner = await scenario({ package: 'free', categories })

    await asAdmin(page, signIn)
    await addOverride(page, owner.restaurant.id, {
      feature: 'Categories',
      set: true,
      unlimited: true,
      note: 'Big menu',
    })
    await expect(page.getByRole('row').filter({ hasText: 'Big menu' })).toContainText(
      'Set to unlimited',
    )

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/categories')
    await expect(page.getByText('Section 8', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Add category' })).toBeEnabled()
    await expect(page.getByText('on your package')).toHaveCount(0)
    await expect(page.getByText('8 / 8')).toHaveCount(0)

    const response = await callApi(page, 'POST', '/api/categories', {
      name: { en: 'Section 9' },
    })
    expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy()
  })

  test('a feature set On beyond a Free package puts its page in the sidebar', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'free' })

    await asAdmin(page, signIn)
    await addOverride(page, owner.restaurant.id, {
      feature: 'Analytics',
      set: true,
      state: 'On',
      note: 'Analytics trial',
    })
    await expect(page.getByRole('row').filter({ hasText: 'Analytics trial' })).toContainText(
      'Turned on',
    )

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/overview')
    const nav = await openSidebar(page)
    await expect(nav.getByRole('button', { name: /^\s*Analytics/ })).toBeVisible({
      timeout: 20_000,
    })
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Analytics')
    await expect(page.getByRole('heading', { name: /^See how guests use your menu/ })).toHaveCount(
      0,
    )
    await expect(page.getByRole('button', { name: 'See packages' })).toHaveCount(0)
  })

  test('removing a turned-off override keeps the owner’s own switches as they were', async ({
    page,
    scenario,
    signIn,
  }) => {
    // The owner had switched Analytics off themselves and left Variants on;
    // then an admin turned both off for the restaurant.
    const owner = await scenario({
      package: 'premium',
      switched_off: ['analytics'],
      overrides: [
        { feature: 'analytics', value: 0 },
        { feature: 'variants', value: 0 },
      ],
    })

    await asAdmin(page, signIn)
    const panel = await openRelation(page, owner.restaurant.id, 'Extras & overrides')
    const rows = panel.locator('tbody').getByRole('row')
    await expect(rows).toHaveCount(2)
    for (const feature of ['Analytics', 'Variants']) {
      const row = rows.filter({ hasText: feature })
      await row.getByRole('button', { name: 'Delete' }).click()
      await submit(page, openModal(page), 'Delete')
      await expect(row).toHaveCount(0)
    }

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/features')
    const analytics = page.getByRole('switch', { name: 'Analytics on' })
    const variants = page.getByRole('switch', { name: 'Variants on' })
    await expect(analytics).toBeEnabled({ timeout: 20_000 })
    await expect(analytics).toHaveAttribute('aria-checked', 'false')
    await expect(variants).toBeEnabled()
    await expect(variants).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Turned off by Qayema')).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Dashboard' })
    await expect(nav.getByRole('button', { name: /^\s*Analytics/ })).toHaveCount(0)
  })

  test('“Contact us” on a turned-off feature sends a request the admin reads, naming the feature', async ({
    page,
    owner,
    signIn,
  }) => {
    const created = await owner({
      package: 'premium',
      order_mode: 'menu',
      overrides: [
        { feature: 'ordering', value: 0 },
        { feature: 'menu_ordering', value: 0 },
      ],
    })
    await page.goto('/orders')
    await expect(page.getByText('Turned off for your restaurant')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Contact us' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Ask us to turn it back on' })).toBeVisible()
    // The note names the feature that was turned off.
    const note = dialog.getByLabel(/Anything we should know\?/)
    await expect(note).toHaveValue(/^Please turn .*ordering.* back on for my restaurant\.$/i)
    const text = await note.inputValue()
    await dialog.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText('Request sent')).toBeVisible()
    await expect(dialog).toBeHidden()

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/contact-messages`)
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(created.user.email)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    // Asked about the package it is on, which already has the feature.
    await expect(message).toContainText('Premium')
    // The list cuts a message at 60 characters; the message page has it all.
    await expect(message).toContainText(text.slice(0, 40))
    await message
      .getByRole('link', { name: 'View' })
      .or(message.getByRole('button', { name: 'View' }))
      .first()
      .click()
    await expect(page.getByText('Requested package')).toBeVisible()
    await expect(page.getByText(text, { exact: true })).toBeVisible()
  })
})
