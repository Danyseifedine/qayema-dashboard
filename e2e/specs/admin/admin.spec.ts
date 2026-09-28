import type { Locator, Page } from '@playwright/test'
import { daysFromNow, either, expect, test } from '../../support/fixtures'
import { ADMIN_URL } from '../../support/urls'

const ADMIN_EMAIL = 'admin@e2e.test'

/** A short random word, so a test finds its own restaurants among everyone else's. */
function tag(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** "Oct 3, 2026", as Carbon's toFormattedDateString() prints it in the app's timezone (UTC). */
function carbonDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

/** `YYYY-MM-DDTHH:mm`, what a datetime-local field takes (in UTC, like the app). */
function localDateTime(iso: string): string {
  return iso.slice(0, 16)
}

/** Add whole months the way Carbon's addMonthsNoOverflow() does. */
function addMonths(iso: string, months: number): string {
  const date = new Date(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return date.toISOString()
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
  await expect(page.getByRole('heading', { level: 1, name: 'Restaurants' })).toBeVisible()
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

/** Open the row's "Package" menu and pick an action. */
async function packageAction(page: Page, row: Locator, action: string): Promise<Locator> {
  await row.getByRole('button', { name: 'Package' }).click()
  await menuItem(page, action).click()
  const modal = openModal(page)
  await expect(modal.getByRole('heading').first()).toBeVisible()
  return modal
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
const RELATIONS = { 'Extra slots & add-ons': 0, 'Package history': 1 } as const

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

/** A row's Package cell reads "<package> <dates>" (two lines). */
function standing(packageName: string, dates: string): RegExp {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escape(packageName)}\\s*${escape(dates)}`)
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

test.describe('admin', () => {
  test('signs in through the Filament form', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByRole('textbox', { name: /^Email address/ }).fill(ADMIN_EMAIL)
    await page.getByRole('textbox', { name: /^Password/ }).fill('e2e-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Packages ending soon' })).toBeVisible()
  })

  test('the dashboard lists packages ending soon and just ended', async ({
    page,
    scenario,
    signIn,
  }) => {
    const endsAt = daysFromNow(5)
    const endedAt = daysFromNow(-3)
    const ending = await scenario({ package: 'pro', package_ends_at: endsAt })
    const ended = await scenario({
      package: 'premium',
      package_starts_at: daysFromNow(-60),
      package_ends_at: endedAt,
    })
    const forever = await scenario({ package: 'premium' })

    await asAdmin(page, signIn)
    await page.goto(ADMIN_URL)
    const widget = page.getByRole('main')
    await expect(widget.getByRole('heading', { name: 'Packages ending soon' })).toBeVisible()

    // Oldest end first: the one that ended comes before the one still running.
    const endedRow = await findRow(widget, ended.user.email)
    await expect(endedRow).toContainText(
      standing('Premium', `Ended ${carbonDate(endedAt)}, on Free`),
    )

    const endingRow = await findRow(widget, ending.user.email)
    await expect(endingRow).toContainText(standing('Pro', `Until ${carbonDate(endsAt)}`))
    await expect(endingRow.getByRole('button', { name: 'Extend' })).toBeVisible()

    await expect(widget.getByText(forever.user.email)).toHaveCount(0)
  })

  test('the Restaurants table says where each package stands', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const endsAt = daysFromNow(60)
    const endedAt = daysFromNow(-3)
    const startsAt = daysFromNow(4)
    const forever = await scenario({ package: 'pro', name: { en: `Forever ${word}` } })
    const until = await scenario({
      package: 'pro',
      package_ends_at: endsAt,
      name: { en: `Until ${word}` },
    })
    const ended = await scenario({
      package: 'pro',
      package_starts_at: daysFromNow(-60),
      package_ends_at: endedAt,
      name: { en: `Ended ${word}` },
    })
    const starts = await scenario({
      package: 'premium',
      package_starts_at: startsAt,
      name: { en: `Starts ${word}` },
    })

    await asAdmin(page, signIn)
    await restaurants(page, word)

    await expect(restaurantRow(page, forever.restaurant.id)).toContainText(
      standing('Pro', 'Forever'),
    )
    await expect(restaurantRow(page, until.restaurant.id)).toContainText(
      standing('Pro', `Until ${carbonDate(endsAt)}`),
    )
    await expect(restaurantRow(page, ended.restaurant.id)).toContainText(
      standing('Pro', `Ended ${carbonDate(endedAt)}, on Free`),
    )
    await expect(restaurantRow(page, starts.restaurant.id)).toContainText(
      standing('Premium', `Starts ${carbonDate(startsAt)}`),
    )
  })

  test('the Restaurants filters: package in force and package dates', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const pro = await scenario({ package: 'pro', name: { en: `Filter pro ${word}` } })
    const ended = await scenario({
      package: 'pro',
      package_starts_at: daysFromNow(-60),
      package_ends_at: daysFromNow(-2),
      name: { en: `Filter ended ${word}` },
    })
    const scheduled = await scenario({
      package: 'premium',
      package_starts_at: daysFromNow(5),
      name: { en: `Filter scheduled ${word}` },
    })

    await asAdmin(page, signIn)
    const table = await restaurants(page, word)
    const rows = table.locator('tbody').getByRole('row')
    await expect(rows).toHaveCount(3)

    const filters = async ({ inForce = 'All', dates = 'All' }) => {
      const inForceField = page.locator('.fi-fo-field', { hasText: 'Package in force' }).first()
      if (!(await inForceField.isVisible())) {
        await page.getByRole('button', { name: 'Filter', exact: true }).click()
      }
      // "All" is the empty placeholder, not an option: clear the field.
      for (const [label, value] of [
        ['Package in force', inForce],
        ['Package dates', dates],
      ] as const) {
        if (value !== 'All') {
          await pick(page, page, label, value)
          continue
        }
        const clear = page
          .locator('.fi-fo-field', { hasText: label })
          .first()
          .getByRole('button', { name: /clear|remove/i })
        if (await clear.isVisible()) await clear.click()
      }
      await page.getByRole('button', { name: 'Apply filters' }).click()
    }

    // Pro in force: the one whose Pro still runs, not the one whose Pro ended.
    await filters({ inForce: 'Pro' })
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, pro.restaurant.id)).toBeVisible()

    // Free in force: the ended one and the one whose Premium has not started.
    await filters({ inForce: 'Free' })
    await expect(rows).toHaveCount(2)
    await expect(restaurantRow(page, ended.restaurant.id)).toBeVisible()
    await expect(restaurantRow(page, scheduled.restaurant.id)).toBeVisible()

    await filters({ dates: 'Starts later' })
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, scheduled.restaurant.id)).toBeVisible()

    await filters({ dates: 'Ended' })
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, ended.restaurant.id)).toBeVisible()

    await filters({ dates: 'Forever' })
    await expect(rows).toHaveCount(1)
    await expect(restaurantRow(page, pro.restaurant.id)).toBeVisible()
  })

  test('Change package for some months, with a note the history keeps', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({ package: 'free', name: { en: `Months ${word}` } })
    const note = `Paid 3 months by transfer ${word}`

    await asAdmin(page, signIn)
    await restaurants(page, word)
    const row = restaurantRow(page, owner.restaurant.id)
    const modal = await packageAction(page, row, 'Change package')
    await expect(
      modal.getByRole('heading', { name: `Change the package of Months ${word}` }),
    ).toBeVisible()

    const startsAt = await modal.getByLabel('Starts').inputValue()
    await pick(page, modal, 'Package', 'Premium')
    await choose(modal, 'A number of months')
    await pick(page, modal, /^\s*Months/, '3 months')
    await modal.getByLabel('Note').fill(note)
    await submit(page, modal, 'Save package')

    await expect(notification(page, 'Package saved')).toBeVisible()
    await expect(row).toContainText(
      standing('Premium', `Until ${carbonDate(addMonths(`${startsAt}Z`, 3))}`),
    )

    await openRelation(page, owner.restaurant.id, 'Package history')
    const history = page.getByRole('row').filter({ hasText: note })
    await expect(history).toContainText('Free → Premium')
    await expect(history).toContainText('E2E Admin')
  })

  test('Change package until a date, forever, and from a later date', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({ package: 'free', name: { en: `Dates ${word}` } })
    const row = restaurantRow(page, owner.restaurant.id)

    await asAdmin(page, signIn)
    await restaurants(page, word)

    // Until a date.
    const endsAt = daysFromNow(20)
    let modal = await packageAction(page, row, 'Change package')
    await pick(page, modal, 'Package', 'Pro')
    await choose(modal, 'Until a date')
    await modal.getByLabel('Ends').fill(localDateTime(endsAt))
    await modal.getByLabel('Note').fill('Until a date')
    await submit(page, modal, 'Save package')
    await expect(notification(page, 'Package saved')).toBeVisible()
    await expect(row).toContainText(standing('Pro', `Until ${carbonDate(endsAt)}`))

    // Forever.
    modal = await packageAction(page, row, 'Change package')
    await pick(page, modal, 'Package', 'Premium')
    await choose(modal, 'Forever')
    await submit(page, modal, 'Save package')
    await expect(row).toContainText(standing('Premium', 'Forever'))

    // A start still to come schedules it.
    const startsAt = daysFromNow(6)
    modal = await packageAction(page, row, 'Change package')
    await pick(page, modal, 'Package', 'Custom')
    await modal.getByLabel('Starts').fill(localDateTime(startsAt))
    await choose(modal, 'Forever')
    await submit(page, modal, 'Save package')
    await expect(row).toContainText(standing('Custom', `Starts ${carbonDate(startsAt)}`))

    await openRelation(page, owner.restaurant.id, 'Package history')
    await expect(page.getByRole('row').filter({ hasText: 'Until a date' })).toContainText(
      'Free → Pro',
    )
    await expect(page.getByRole('row').filter({ hasText: 'Premium → Custom' })).toBeVisible()
  })

  test('Extend by a month, then forever', async ({ page, scenario, signIn }) => {
    const word = tag()
    const endsAt = daysFromNow(10)
    const owner = await scenario({
      package: 'pro',
      package_ends_at: endsAt,
      name: { en: `Extend ${word}` },
    })
    const row = restaurantRow(page, owner.restaurant.id)

    await asAdmin(page, signIn)
    await restaurants(page, word)
    await expect(row).toContainText(standing('Pro', `Until ${carbonDate(endsAt)}`))

    let modal = await packageAction(page, row, 'Extend')
    await choose(modal, '1 month')
    await submit(page, modal, 'Extend')
    await expect(notification(page, 'Package extended')).toBeVisible()
    await expect(row).toContainText(standing('Pro', `Until ${carbonDate(addMonths(endsAt, 1))}`))

    modal = await packageAction(page, row, 'Extend')
    await choose(modal, 'Forever')
    await submit(page, modal, 'Extend')
    await expect(row).toContainText(standing('Pro', 'Forever'))

    // Nothing left to extend on a package that runs forever.
    await row.getByRole('button', { name: 'Package' }).click()
    await expect(menuItem(page, 'Change package')).toBeVisible()
    await expect(menuItem(page, 'Extend')).toHaveCount(0)
  })

  test('Back to the default package', async ({ page, scenario, signIn }) => {
    const word = tag()
    const owner = await scenario({ package: 'premium', name: { en: `Reset ${word}` } })
    const row = restaurantRow(page, owner.restaurant.id)

    await asAdmin(page, signIn)
    await restaurants(page, word)
    await expect(row).toContainText(standing('Premium', 'Forever'))

    const modal = await packageAction(page, row, 'Back to Free')
    await modal.getByLabel('Note').fill(`Stopped paying ${word}`)
    await submit(page, modal, 'Confirm')
    await expect(notification(page, 'Back on the default package')).toBeVisible()
    await expect(row).toContainText(standing('Free', 'Forever'))
  })

  test('Change package on several restaurants at once', async ({ page, scenario, signIn }) => {
    const word = tag()
    const first = await scenario({ package: 'free', name: { en: `Bulk one ${word}` } })
    const second = await scenario({ package: 'free', name: { en: `Bulk two ${word}` } })
    const untouched = await scenario({ package: 'free', name: { en: `Bulk other ${word}` } })

    await asAdmin(page, signIn)
    await restaurants(page, word)
    const modal = openModal(page)
    // The selection lives in Alpine, which a late Livewire re-render can
    // reset at any point until the modal is open, so the whole way there is
    // one step that starts again if it does.
    await expect(async () => {
      await restaurantRow(page, first.restaurant.id).getByRole('checkbox').check()
      await restaurantRow(page, second.restaurant.id).getByRole('checkbox').check()
      await expect(page.getByText('2 records selected')).toBeVisible({ timeout: 2_000 })
      await page
        .getByRole('button', { name: 'Bulk actions', exact: true })
        .filter({ visible: true })
        .click({ timeout: 2_000 })
      await menuItem(page, 'Change package').click({ timeout: 2_000 })
      await expect(
        modal.getByRole('heading', { name: 'Change the package of the selected restaurants' }),
      ).toBeVisible({ timeout: 2_000 })
    }).toPass()
    await pick(page, modal, 'Package', 'Pro')
    await modal.getByLabel('Note').fill(`Group deal ${word}`)
    await submit(page, modal, 'Save package')

    await expect(notification(page, 'Package saved for 2 restaurants')).toBeVisible()
    await expect(restaurantRow(page, first.restaurant.id)).toContainText(standing('Pro', 'Forever'))
    await expect(restaurantRow(page, second.restaurant.id)).toContainText(
      standing('Pro', 'Forever'),
    )
    await expect(restaurantRow(page, untouched.restaurant.id)).toContainText(
      standing('Free', 'Forever'),
    )
  })

  test('Extra slots: five more dishes reach the owner’s dashboard', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'free' })

    await asAdmin(page, signIn)
    await openRelation(page, owner.restaurant.id, 'Extra slots & add-ons')
    await page.getByRole('button', { name: 'Grant slots' }).click()
    const modal = openModal(page)
    await pick(page, modal, 'Feature', 'Dishes')
    await modal.getByLabel('Amount').fill('5')
    await modal.getByLabel('Note').fill('Launch week')
    await submit(page, modal, 'Create')
    await expect(page.getByRole('row').filter({ hasText: 'Launch week' })).toContainText('+5')

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/overview')
    await expect(page.getByRole('definition').filter({ hasText: /0 \/ 45/ })).toBeVisible()
  })

  test('An add-on: ordering for a Free owner unlocks Orders', async ({
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({ package: 'free' })

    await asAdmin(page, signIn)
    await openRelation(page, owner.restaurant.id, 'Extra slots & add-ons')
    await page.getByRole('button', { name: 'Grant slots' }).click()
    const modal = openModal(page)
    await pick(page, modal, 'Feature', 'Ordering')
    await expect(modal.getByLabel('Amount')).toBeDisabled()
    await submit(page, modal, 'Create')
    await expect(page.getByRole('row').filter({ hasText: 'Ordering' })).toContainText('Unlocked')

    await asOwner(page, signIn, owner.user.email)
    await page.goto('/orders')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orders')
    await expect(page.getByRole('heading', { name: /^Take orders from the menu/ })).toHaveCount(0)
    await expect(
      page.getByRole('navigation', { name: 'Dashboard' }).getByRole('button', { name: 'Orders' }),
    ).toHaveAccessibleName('Orders')
  })

  test('A package request from the dashboard is applied from Contact Messages', async ({
    page,
    owner,
    signIn,
  }) => {
    const created = await owner({ package: 'free', name: { en: `Request ${tag()}` } })
    await page.goto('/package')
    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Premium', exact: true }) })
      .getByRole('button', { name: 'Request this package' })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText('Request sent')).toBeVisible()

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/contact-messages`)
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(created.user.email)
    const message = page.getByRole('row').filter({ hasText: created.user.email })
    await expect(message).toContainText('Premium')
    await message
      .getByRole('link', { name: 'View' })
      .or(message.getByRole('button', { name: 'View' }))
      .first()
      .click()

    await expect(page.getByText('Requested package')).toBeVisible()
    await page.getByRole('button', { name: 'Apply this package' }).click()
    const modal = openModal(page)
    await expect(modal.getByRole('heading', { name: /on Premium$/ })).toBeVisible()
    await expect(
      modal.locator('.fi-fo-field', { hasText: 'Package' }).first().locator('.fi-select-input-btn'),
    ).toContainText('Premium')
    await expect(modal.getByLabel('Note')).toHaveValue(/^Requested on /)
    await submit(page, modal, 'Save package')
    await expect(notification(page, 'Package saved')).toBeVisible()

    await asOwner(page, signIn, created.user.email)
    await page.goto('/package')
    await expect(
      page.getByRole('button', { name: 'Premium package. Open your package.' }),
    ).toBeVisible()
  })

  test('Editing the English name keeps the Arabic one', async ({ page, scenario, signIn }) => {
    const word = tag()
    const owner = await scenario({
      package: 'pro',
      second_locale: 'ar',
      name: { en: `Cedar House ${word}`, ar: 'بيت الأرز' },
    })

    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/restaurants/${owner.restaurant.id}/edit`)
    const name = page.getByLabel('Name (English)')
    await expect(name).toHaveValue(`Cedar House ${word}`)
    await name.fill(`Cedar Hall ${word}`)
    await name.blur()
    // The address stays: it is printed on the restaurant's QR codes.
    await expect(page.getByLabel('Slug')).toHaveValue(owner.restaurant.slug)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(notification(page, 'Saved')).toBeVisible()

    const menu = await page.context().newPage()
    await menu.goto(`${owner.restaurant.public_url}?lang=en`)
    await expect(menu).toHaveTitle(`Cedar Hall ${word}`)
    await menu.goto(`${owner.restaurant.public_url}?lang=ar`)
    await expect(menu).toHaveTitle('بيت الأرز')
    await menu.close()
  })

  test('Templates: Midnight is a premium design', async ({ page, signIn }) => {
    await asAdmin(page, signIn)
    await page.goto(`${ADMIN_URL}/templates`)
    const midnight = page.getByRole('row').filter({ hasText: 'Midnight' })
    // Only looked at: the switch is global, and other tests rely on it.
    await expect(midnight.getByRole('switch').last()).toBeChecked()

    await midnight.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('switch', { name: 'Premium design' })).toBeChecked()
  })

  test('Log in as owner opens the dashboard as that owner @matrix', async ({
    page,
    scenario,
    signIn,
  }) => {
    const word = tag()
    const owner = await scenario({ package: 'pro', name: { en: `Visit ${word}` } })

    await asAdmin(page, signIn)
    await restaurants(page, word)
    await restaurantRow(page, owner.restaurant.id)
      .getByRole('link', { name: 'Log in as owner' })
      .click()

    // Impersonation lands on the home page, which leads a signed-in owner in.
    await page.getByRole('link', { name: 'My dashboard' }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      either('Overview', 'نظرة عامة'),
    )
    await expect(page.getByRole('link', { name: new RegExp(owner.restaurant.slug) })).toBeVisible()
  })
})
