import type { Browser, Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'

/**
 * Opening hours past the basics in restaurant.spec.ts: a day split into
 * shifts, the clashes the form refuses, and what the menu then says.
 */

/** Picks "HH:MM" (on a quarter hour) the way the picker reads: hour, minutes, AM or PM. */
async function pickTime(page: Page, what: string, time: string) {
  const [hour24, minute] = time.split(':').map(Number) as [number, number]
  const hour = String(hour24 % 12 === 0 ? 12 : hour24 % 12)
  await page.getByRole('combobox', { name: `${what}: hour` }).click()
  await page.getByRole('option', { name: hour, exact: true }).click()
  await page.getByRole('combobox', { name: `${what}: minutes` }).click()
  await page.getByRole('option', { name: String(minute).padStart(2, '0'), exact: true }).click()
  await page
    .getByRole('tablist', { name: `${what}: AM or PM` })
    .getByRole('tab', { name: hour24 < 12 ? 'AM' : 'PM' })
    .click()
}

/** The menu's hours line, read on a phone whose clock says `utc`. */
async function hoursAt(browser: Browser, url: string, utc: string) {
  const context = await browser.newContext()
  const guest = await context.newPage()
  await guest.clock.setFixedTime(new Date(utc))
  await guest.goto(url)
  const label = (await guest.locator('[data-hours-label]').first().textContent())?.trim()
  const value = (await guest.locator('[data-hours-value]').first().textContent())?.trim()
  await context.close()
  return { label, value }
}

test.describe('opening hours: edge cases', () => {
  test.beforeEach(async ({ page }) => {
    // The map preview is OpenStreetMap's; answer it locally.
    await page.route('https://www.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>map</title>' }),
    )
  })

  test('a day split into up to three shifts, a clash refused and a shift removed, reads right on the menu', async ({
    page,
    browser,
    owner,
  }) => {
    // Beirut is UTC+3 in October; 12 October 2026 is a Monday.
    const restaurant = await owner({ opening_hours: { mon: { open: '12:00', close: '15:00' } } })
    const url = restaurant.restaurant.public_url
    await page.goto('/restaurant')
    const addShift = page.getByRole('button', { name: 'Add a shift on Monday' })
    const hour = (what: string) => page.getByRole('combobox', { name: `${what}: hour` })

    // Each new shift starts where the last one closes, for two hours.
    await addShift.click()
    await expect(hour('Monday, shift 2, opens')).toHaveValue('3')
    await expect(hour('Monday, shift 2, closes')).toHaveValue('5')
    await addShift.click()
    await expect(hour('Monday, shift 3, opens')).toHaveValue('5')
    await expect(hour('Monday, shift 3, closes')).toHaveValue('7')
    // Three is the most a day takes.
    await expect(addShift).toHaveCount(0)

    // The second shift moved back into lunch: they overlap, and it is said
    // under the shift at fault, before anything is sent.
    await pickTime(page, 'Monday, shift 2, opens', '14:00')
    let sent = false
    page.on('request', (request) => {
      if (request.url().endsWith('/api/restaurant') && request.method() !== 'GET') sent = true
    })
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText("Shifts on the same day can't overlap.")).toBeVisible()
    expect(sent).toBe(false)

    // Taking that shift off fixes it; the third becomes the second.
    await page.getByRole('button', { name: 'Remove shift 2 on Monday' }).click()
    await expect(page.getByText("Shifts on the same day can't overlap.")).toHaveCount(0)
    await expect(hour('Monday, shift 2, opens')).toHaveValue('5')
    await expect(addShift).toBeVisible()
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/restaurant') && response.request().method() !== 'GET',
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    expect((await saved).ok()).toBeTruthy()

    await page.reload()
    await expect(hour('Monday, shift 1, opens')).toHaveValue('12')
    await expect(hour('Monday, shift 2, opens')).toHaveValue('5')
    await expect(hour('Monday, shift 2, closes')).toHaveValue('7')

    // Monday 18:00, in the dinner shift; 16:00, between the two.
    expect(await hoursAt(browser, url, '2026-10-12T15:00:00Z')).toEqual({
      label: 'Open now',
      value: '12:00 - 15:00, 17:00 - 19:00',
    })
    expect((await hoursAt(browser, url, '2026-10-12T13:00:00Z')).label).toBe('Closed now')
    // Tuesday was never opened.
    expect(await hoursAt(browser, url, '2026-10-13T10:00:00Z')).toEqual({
      label: 'Closed now',
      value: 'Closed today',
    })

    // Monday switched off is closed all day, both shifts with it, while
    // another day keeps the menu's hours line. (With every day off there are
    // no hours at all, as before any were set, and the line goes.)
    await page.getByRole('switch', { name: 'Monday is open' }).click()
    await expect(hour('Monday, shift 1, opens')).toHaveCount(0)
    await page.getByRole('switch', { name: 'Tuesday is open' }).click()
    const closed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/restaurant') && response.request().method() !== 'GET',
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    expect((await closed).ok()).toBeTruthy()
    expect(await hoursAt(browser, url, '2026-10-12T15:00:00Z')).toEqual({
      label: 'Closed now',
      value: 'Closed today',
    })
  })
})
