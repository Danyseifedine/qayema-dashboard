import type { Locator, Page } from '@playwright/test'
import { daysFromNow, expect, test } from '../../support/fixtures'
import { ADMIN_URL, DASHBOARD_URL, LOGIN_URL } from '../../support/urls'

/**
 * The admin's edge cases admin.spec.ts leaves out, beyond overrides
 * (admin-edge.spec.ts): a restaurant's own price when its package changes,
 * the list filters, an ended package extended, the Users list, a username
 * account, and deleting. The small helpers are copied from admin.spec.ts,
 * which this file may not import from.
 */

const ADMIN_EMAIL = 'admin@e2e.test'

/** A short random word, so a test finds its own rows among everyone else's. */
function tag(): string {
  return Math.random().toString(36).slice(2, 8)
}

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

/** The Restaurants list, searched down to the rows whose name holds `text`. */
async function restaurants(page: Page, text: string): Promise<Locator> {
  await page.goto(`${ADMIN_URL}/restaurants`)
  await expect(page.getByRole('heading', { level: 1, name: 'Restaurants' })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(text)
  const table = page.getByRole('table')
  await expect(table.locator('tbody').getByRole('row').first()).toContainText(text)
  // The search is settled once no row from before it is left.
  await expect(table.locator('tbody').getByRole('row').filter({ hasNotText: text })).toHaveCount(0)
  return table
}

/** One restaurant's row, by its id (the bulk checkbox is labelled with it). */
function restaurantRow(page: Page, id: number): Locator {
  return page.getByRole('row').filter({
    has: page.getByRole('checkbox', { name: `Select/deselect item ${id} for bulk actions.` }),
  })
}

/** Something in a Filament dropdown: its items are buttons or menu items depending on the kind. */
function menuItem(page: Page, name: string | RegExp): Locator {
  return page
    .getByRole('menuitem', { name })
    .or(page.getByRole('button', { name, exact: typeof name === 'string' }))
    .filter({ visible: true })
    .first()
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

/** A Filament notification toast. */
function notification(page: Page, text: string): Locator {
  return page.getByRole('status').getByText(text, { exact: true }).first()
}

/** Page through a Filament table until a row holding `text` is on screen. */
async function findRow(scope: Locator, text: string, pagesLeft = 50): Promise<Locator> {
  const rows = scope.locator('tbody').getByRole('row')
  const row = rows.filter({ hasText: text })
  const next = scope.getByRole('button', { name: 'Next' })
  await expect(rows.first()).toBeVisible()

  if ((await row.count()) === 0 && pagesLeft > 0 && (await next.isVisible())) {
    // Each row carries its owner's unique email; wait until the first one is gone.
    const firstEmail = (await rows.first().getByRole('cell').nth(1).innerText()).trim()
    await next.click()
    await expect(rows.filter({ hasText: firstEmail })).toHaveCount(0)
    return findRow(scope, text, pagesLeft - 1)
  }

  await expect(row).toBeVisible()
  return row
}

/** The login form at LOGIN_URL, filled and sent the way a person would. */
async function signInWithForm(page: Page, login: string, password: string) {
  await page.goto(LOGIN_URL)
  await page.getByLabel('Email or username').fill(login)
  // The label also holds the "Forgot password?" link, so the input is found by id.
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** The owner's Package page card for one package. */
function packageCard(page: Page, name: string): Locator {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

test.describe('admin: a restaurant’s own price', () => {
  test('a new package from the Package menu clears the old price; the owner sees the new package’s', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({
      package: 'pro',
      price_cents: 500,
      name: { en: `Own price ${word}` },
    })
    const row = restaurantRow(page, owner.restaurant.id)

    await asAdmin(page, signIn)
    await restaurants(page, word)
    await expect(row).toContainText('$5.00')
    await expect(row).toContainText('Custom')

    await row.getByRole('button', { name: 'Package' }).click()
    await menuItem(page, 'Change package').click()
    const modal = openModal(page)
    await pick(page, modal, 'Package', 'Premium')
    await modal.getByLabel('Note').fill(`Moved up ${word}`)
    await submit(page, modal, 'Save package')
    await expect(notification(page, 'Package saved')).toBeVisible()
    await expect(row).toContainText('$10.00')
    await expect(row).not.toContainText('Custom')

    await openRelation(page, owner.restaurant.id, 'Package history')
    const history = page.getByRole('row').filter({ hasText: `Moved up ${word}` })
    await expect(history).toContainText('Pro → Premium')
    await expect(history).toContainText('Package price')

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/package')
    await expect(packageCard(page, 'Premium')).toContainText('$10.00', { timeout: 20_000 })
    await expect(packageCard(page, 'Premium')).not.toContainText('$5.00')
  })

  test('a price set together with a new package on the restaurant page is kept, and the history shows it', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'pro', price_cents: 500 })

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/restaurants/${owner.restaurant.id}/edit`)
    const price = page.getByRole('spinbutton', { name: 'Price a month' })
    await expect(price).toHaveValue(/^5(\.00)?$/, { timeout: 20_000 })
    await pick(page, page, 'Package', 'Premium')
    await price.fill('6.50')
    await page.getByLabel('Note').fill('Premium at a launch price')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(notification(page, 'Saved')).toBeVisible()
    // The form opens again on what was saved; the box may drop the last 0, as on load.
    await expect(price).toHaveValue(/^6\.50?$/)

    await openRelation(page, owner.restaurant.id, 'Package history')
    const history = page.getByRole('row').filter({ hasText: 'Premium at a launch price' })
    await expect(history).toContainText('Pro → Premium')
    await expect(history).toContainText('$6.50')

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/package')
    await expect(packageCard(page, 'Premium')).toContainText('$6.50', { timeout: 20_000 })
  })

  test('the Restaurants filters: has its own price, and pays with Whish', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const priced = await scenario({
      package: 'pro',
      price_cents: 700,
      name: { en: `Priced ${word}` },
    })
    const whish = await scenario({ package: 'pro', name: { en: `Whish ${word}` } })
    const plain = await scenario({ package: 'pro', name: { en: `Plain ${word}` } })

    await asAdmin(page, signIn)
    // Whish is the admin's own record: there is no other way to set it.
    await page.goto(`${ADMIN_URL}/restaurants/${whish.restaurant.id}/edit`)
    await page.getByRole('switch', { name: 'Pays with Whish' }).click()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(notification(page, 'Saved')).toBeVisible()

    const table = await restaurants(page, word)
    const rows = table.locator('tbody').getByRole('row')
    await expect(rows).toHaveCount(3)

    const openFilters = async () => {
      const ownPrice = page.getByRole('checkbox', { name: 'Has its own price' })
      if (!(await ownPrice.isVisible())) {
        await page.getByRole('button', { name: 'Filter', exact: true }).click()
      }
      await expect(ownPrice).toBeVisible()
      return ownPrice
    }
    const apply = () => page.getByRole('button', { name: 'Apply filters' }).click()

    let ownPrice = await openFilters()
    await ownPrice.check()
    await apply()
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, priced.restaurant.id)).toBeVisible()

    ownPrice = await openFilters()
    await ownPrice.uncheck()
    await pick(page, page, 'Pays with Whish', 'Yes')
    await apply()
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, whish.restaurant.id)).toBeVisible()

    await openFilters()
    await pick(page, page, 'Pays with Whish', 'No')
    await apply()
    await expect(rows).toHaveCount(2)
    await expect(restaurantRow(page, priced.restaurant.id)).toBeVisible()
    await expect(restaurantRow(page, plain.restaurant.id)).toBeVisible()
  })
})

test.describe('admin: packages that ended', () => {
  test('Extend from the dashboard brings an offline menu back at once', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({
      package: 'pro',
      package_starts_at: daysFromNow(-60),
      package_ends_at: daysFromNow(-4),
    })
    // Past the three grace days: guests get nothing.
    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(404)

    await asAdmin(page, signIn)
    await page.goto(ADMIN_URL)
    const widget = page.getByRole('main')
    await expect(widget.getByRole('heading', { name: 'Packages ending soon' })).toBeVisible({
      timeout: 20_000,
    })
    const row = await findRow(widget, owner.user.email)
    await row.getByRole('button', { name: 'Extend' }).click()
    const modal = openModal(page)
    await choose(modal, '1 month')
    await submit(page, modal, 'Extend')
    await expect(notification(page, 'Package extended')).toBeVisible()

    // No job to wait for: online the moment it is extended.
    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(200)

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/dishes')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dishes', { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Your menu is offline' })).toHaveCount(0)
    await expect(page.getByText(/Your menu goes offline on/)).toHaveCount(0)
  })
})

test.describe('admin: lists, users and deleting', () => {
  test('the Restaurants search finds a restaurant by its Arabic name', async ({
    page,
    scenario,
    signIn,
  }) => {
    // Random Arabic letters, so only this test's restaurant matches.
    const letters = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'
    const arabic = Array.from(
      { length: 6 },
      () => letters[Math.floor(Math.random() * letters.length)],
    ).join('')
    const owner = await scenario({
      package: 'pro',
      second_locale: 'ar',
      name: { en: `Cedar ${tag()}`, ar: `مطعم ${arabic}` },
    })

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/restaurants`)
    await expect(page.getByRole('heading', { level: 1, name: 'Restaurants' })).toBeVisible({
      timeout: 20_000,
    })
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(arabic)
    const rows = page.getByRole('table').locator('tbody').getByRole('row')
    await expect(restaurantRow(page, owner.restaurant.id)).toBeVisible()
    await expect(rows).toHaveCount(1)
  })

  test('a username account: the admin gives it a username and a new password, and the owner signs in with them', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({ package: 'pro', name: { en: `Username ${word}` } })
    const username = `e2e.${word}`
    const password = `new-password-${word}`

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/users`)
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible({
      timeout: 20_000,
    })
    const search = page.getByRole('searchbox', { name: 'Search', exact: true })
    await search.fill(owner.user.email)
    const row = page.getByRole('table').locator('tbody').getByRole('row')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(`Username ${word}`)
    await row.getByRole('link', { name: 'Edit' }).click()

    const usernameField = page.getByLabel('Username')
    const email = page.getByLabel('Email Address')
    await expect(usernameField).toBeVisible({ timeout: 20_000 })
    await usernameField.fill(username)
    await usernameField.blur()
    // With a username the email is no longer required: the form says so once
    // the username has reached the server, as it would for a person tabbing on.
    await expect(email).not.toHaveAttribute('required')
    // An owner who signs in with a username needs no email.
    await email.fill('')
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(notification(page, 'Saved')).toBeVisible()

    // The list finds it by the username now.
    await page.goto(`${ADMIN_URL}/users`)
    await search.fill(username)
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(username)

    await leave(page)
    // The old password is gone.
    await signInWithForm(page, username, owner.user.password)
    await expect(
      page.getByText('The email, username or password is not correct.').first(),
    ).toBeVisible()

    await signInWithForm(page, username, password)
    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`, { timeout: 20_000 })
  })

  test('deleting a restaurant takes its owner’s account and its menu with it', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({ package: 'pro', name: { en: `Doomed ${word}` } })
    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(200)

    await asAdmin(page, signIn)
    await restaurants(page, word)
    await restaurantRow(page, owner.restaurant.id).getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    const modal = openModal(page)
    await expect(modal.getByRole('heading', { name: 'Delete restaurant and owner' })).toBeVisible()
    await expect(modal).toContainText('and the account they sign in with')
    await submit(page, modal, 'Delete')
    await expect(restaurantRow(page, owner.restaurant.id)).toHaveCount(0)

    await page.goto(`${ADMIN_URL}/users`)
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(owner.user.email)
    await expect(page.getByText('No users')).toBeVisible()

    expect((await page.request.get(owner.restaurant.public_url)).status()).toBe(404)

    await leave(page)
    await signInWithForm(page, owner.user.email, owner.user.password)
    await expect(
      page.getByText('The email, username or password is not correct.').first(),
    ).toBeVisible()
  })
})
