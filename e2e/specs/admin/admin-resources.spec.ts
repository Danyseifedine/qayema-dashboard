import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { ADMIN_URL, API_URL, LOGIN_URL } from '../../support/urls'

/**
 * The admin's other lists and what deleting there takes with it: an account
 * opened with its restaurant, a user deleted with their menu, an offer
 * switched off and deleted on its restaurant's page, a category deleted
 * without its dishes, and a package deleted with its restaurants moved to
 * the default. Packages and the package actions are in admin.spec.ts.
 */

const ADMIN_EMAIL = 'admin@e2e.test'

/** A short random word, so a test finds its own rows among everyone else's. */
function tag(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Forget the session, with no Livewire request left in flight to set it again. */
async function leave(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.context().clearCookies()
}

/** The Filament modal that is open now. */
function openModal(page: Page): Locator {
  return page.locator('.fi-modal.fi-modal-open')
}

/** Press a modal's button and wait for it to close. */
async function submit(page: Page, modal: Locator, button: string): Promise<void> {
  await modal.getByRole('button', { name: button, exact: true }).click()
  await expect(openModal(page)).toHaveCount(0)
}

/** A Filament notification toast. */
function notification(page: Page, text: string): Locator {
  return page.getByRole('status').getByText(text, { exact: true }).first()
}

/** Picks an option in a Filament dropdown, found by its label. */
async function pick(page: Page, label: string, option: string) {
  const field = page
    .locator('.fi-fo-field')
    .filter({
      has: page.locator('.fi-fo-field-label-content', { hasText: new RegExp(`^\\s*${label}`) }),
    })
    .first()
  await field.locator('.fi-select-input-btn').click()
  await page
    .getByRole('option', { name: option, exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(field.locator('.fi-select-input-btn')).toContainText(option)
}

/** The restaurant's relation managers, in the order its page shows them. */
const RELATIONS = { 'Package history': 1, Categories: 4, Offers: 6 } as const

/** A restaurant's page opened on one relation manager, once it has loaded. */
async function openRelation(
  page: Page,
  restaurantId: number,
  name: keyof typeof RELATIONS,
): Promise<Locator> {
  await page.goto(`${ADMIN_URL}/restaurants/${restaurantId}/edit?relation=${RELATIONS[name]}`)
  await page.getByRole('tablist').scrollIntoViewIfNeeded()
  const panel = page.getByRole('tabpanel')
  await expect(panel.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 20_000 })
  return panel
}

/** A list searched down to what matches `text`. */
async function search(page: Page, path: string, text: string): Promise<Locator> {
  await page.goto(`${ADMIN_URL}/${path}`)
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(text)
  return page.getByRole('table').locator('tbody').getByRole('row')
}

test.describe('admin: accounts', () => {
  test('an account opened with its restaurant on Pro: the owner signs in and the wizard starts at its second step', async ({
    page,
    signIn,
  }) => {
    const word = tag()
    const username = `opened.${word}`
    const password = `opened-password-${word}`

    await signIn(ADMIN_EMAIL)
    await page.goto(`${ADMIN_URL}/users/create`)
    await page.getByRole('textbox', { name: /^Name/ }).fill('Opened Owner')
    await page.getByLabel('Username').fill(username)
    // With a username the email may stay empty, once the form has heard it.
    await page.getByLabel('Username').blur()
    await expect(page.getByLabel('Email Address')).not.toHaveAttribute('required')
    await page.getByRole('textbox', { name: /^Password/ }).fill(password)
    await page.getByLabel('Restaurant name').fill(`Opened ${word}`)
    await page.getByLabel('Restaurant name').blur()
    // The link is written from the name.
    await expect(page.getByLabel('Menu link')).toHaveValue(`opened-${word}`)
    await pick(page, 'Package', 'Pro')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(notification(page, 'Created')).toBeVisible()

    // On Pro from the start, as agreed.
    const rows = await search(page, 'restaurants', `Opened ${word}`)
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Pro')

    await leave(page)
    await page.goto(LOGIN_URL)
    await page.getByLabel('Email or username').fill(username)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
    // The name and link are made: the owner goes on with the phone and logo.
    await expect(page.locator('.step-meta .num')).toHaveText('02 / 03')
  })

  test('deleting a user from the Users list takes their restaurant and menu with it', async ({
    page,
    scenario,
    signIn,
  }) => {
    const name = `Gone ${tag()}`
    const owner = await scenario({ package: 'pro', name: { en: name } })
    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(200)

    await signIn(ADMIN_EMAIL)
    const rows = await search(page, 'users', owner.user.email)
    await expect(rows).toHaveCount(1)
    await rows.first().getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    const modal = openModal(page)
    await expect(modal.getByRole('heading', { name: 'Delete user' })).toBeVisible()
    await expect(modal).toContainText('their restaurant')
    await submit(page, modal, 'Delete')
    await expect(page.getByText('No users')).toBeVisible()

    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(404)
    await search(page, 'restaurants', name)
    await expect(page.getByText('No restaurants')).toBeVisible()
  })
})

test.describe('admin: a restaurant’s menu content', () => {
  test('an offer switched off on its restaurant’s page leaves the menu; deleted, it is gone', async ({
    page,
    browser,
    scenario,
    signIn,
  }) => {
    const title = `Grill week ${tag()}`
    const owner = await scenario({
      package: 'premium',
      categories: [{ name: { en: 'Grills' }, dishes: [{ name: { en: 'Kafta' } }] }],
      offers: [{ title: { en: title }, placements: ['banner'] }],
    })
    const guest = await (await browser.newContext()).newPage()
    await guest.goto(owner.restaurant.public_url)
    await expect(guest.locator('.offers-banner .offer', { hasText: title })).toBeVisible()

    await signIn(ADMIN_EMAIL)
    const panel = await openRelation(page, owner.restaurant.id, 'Offers')
    const row = panel.locator('tbody').getByRole('row').filter({ hasText: title })
    await expect(row).toContainText('Live')
    await row.getByRole('switch').click()
    await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    // Saved, not only drawn: it is still off on a fresh page.
    await page.reload()
    await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false', {
      timeout: 20_000,
    })

    await guest.reload()
    await expect(guest.locator('.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(guest.getByText(title)).toHaveCount(0)

    await row.getByRole('button', { name: 'Delete' }).click()
    await submit(page, openModal(page), 'Delete')
    await expect(panel.locator('tbody').getByRole('row').filter({ hasText: title })).toHaveCount(0)
    const offers = await search(page, 'offers', title)
    await expect(offers.filter({ hasText: title })).toHaveCount(0)
    await guest.context().close()
  })

  test('a category deleted on its restaurant’s page keeps its dish, off the menu until it is moved', async ({
    page,
    browser,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({
      package: 'pro',
      categories: [
        { name: { en: 'Grills' }, dishes: [{ name: { en: 'Kafta' } }] },
        { name: { en: 'Mezze' }, dishes: [{ name: { en: 'Hummus' } }] },
      ],
    })

    await signIn(ADMIN_EMAIL)
    const panel = await openRelation(page, owner.restaurant.id, 'Categories')
    const row = panel.locator('tbody').getByRole('row').filter({ hasText: 'Grills' })
    await row.getByRole('button', { name: 'Delete' }).click()
    const modal = openModal(page)
    await expect(modal).toContainText(
      'Its dishes are kept without a category, and leave the menu until they are moved to another one.',
    )
    await submit(page, modal, 'Delete')
    await expect(row).toHaveCount(0)

    const guest = await (await browser.newContext()).newPage()
    await guest.goto(owner.restaurant.public_url)
    await expect(guest.locator('.dish', { hasText: 'Hummus' })).toBeVisible()
    await expect(guest.locator('.dish', { hasText: 'Kafta' })).toHaveCount(0)
    await guest.context().close()

    // Kept for the owner, who finds it under "No category".
    await leave(page)
    await signIn(owner.user.email)
    await page.goto('/dishes')
    await page.getByRole('tab', { name: /^No category/ }).click({ timeout: 20_000 })
    await expect(page.getByRole('main').getByText('Kafta', { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByText('Hummus', { exact: true })).toHaveCount(0)
  })
})

test.describe('admin: deleting a package', () => {
  test('its restaurants move to the default package, and their history says why', async ({
    page,
    scenario,
    signIn,
    setPackage,
  }) => {
    const slug = `gone-${tag()}`
    const name = `Gone ${slug}`
    const restaurantName = `Moved ${tag()}`
    const owner = await scenario({ package: 'pro', name: { en: restaurantName } })

    await signIn(ADMIN_EMAIL)
    await page.goto(`${ADMIN_URL}/packages/create`)
    await page.getByLabel('Name (English)').fill(name)
    await page.getByLabel('Slug').fill(slug)
    // Off, since every other test shares the packages on offer.
    await page.getByRole('switch', { name: 'Active' }).click()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(notification(page, 'Package created')).toBeVisible()
    await setPackage(owner.restaurant.id, { package: slug })

    await page.goto(`${ADMIN_URL}/packages`)
    const rows = page.getByRole('table').locator('tbody').getByRole('row')
    // The default package can never be deleted, so it has no Delete.
    await expect(
      rows.filter({ hasText: /^\s*Edit\s*Free\b/ }).getByRole('button', { name: 'Delete' }),
    ).toHaveCount(0)
    const row = rows.filter({ hasText: name })
    await row.getByRole('button', { name: 'Delete' }).click()
    const modal = openModal(page)
    await expect(modal).toContainText('1 restaurant on this package move to Free')
    await submit(page, modal, 'Delete')
    await expect(rows.filter({ hasText: name })).toHaveCount(0)

    const history = await openRelation(page, owner.restaurant.id, 'Package history')
    await expect(history).toContainText(`The ${name} package was deleted.`)
    const restaurant = await search(page, 'restaurants', restaurantName)
    await expect(restaurant).toHaveCount(1)
    await expect(restaurant.first()).toContainText('Free')
  })
})
