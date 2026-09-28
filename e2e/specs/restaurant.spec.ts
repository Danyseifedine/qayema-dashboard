import { fileURLToPath } from 'node:url'
import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type Owner } from '../fixtures/test'

const FILES = fileURLToPath(new URL('../fixtures/files/', import.meta.url))

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_NAMES = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const
type Weekday = (typeof WEEKDAYS)[number]

/** Zones an hour or two apart, all in the browser's own list. */
const ZONES = [
  'Pacific/Kiritimati',
  'Pacific/Tongatapu',
  'Pacific/Auckland',
  'Australia/Sydney',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Dubai',
  'Europe/Moscow',
  'Africa/Cairo',
  'Europe/Paris',
  'Europe/London',
  'Atlantic/Azores',
  'America/Noronha',
  'America/Sao_Paulo',
  'America/Halifax',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Pacific/Pago_Pago',
]

/** The time and weekday it is now in a zone. */
function nowIn(timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  )
  const day = String(parts.weekday).toLowerCase().slice(0, 3) as Weekday
  return { hour: Number(parts.hour), minute: Number(parts.minute), day }
}

/** A zone where it is early morning now, so a range from last night is still running. */
function earlyMorningZone() {
  const zone = ZONES.find((candidate) => {
    const { hour } = nowIn(candidate)
    return hour >= 3 && hour <= 9
  })
  if (!zone) throw new Error('No zone is in the early morning right now')
  return { zone, ...nowIn(zone) }
}

function yesterdayOf(day: Weekday): Weekday {
  return WEEKDAYS[(WEEKDAYS.indexOf(day) + 6) % 7]!
}

const hhmm = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

/** The public menu, as a guest sees it on a wide screen. */
async function guestMenu(browser: Browser, owner: Owner, query = ''): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(`${owner.restaurant.public_url}${query}`)
  return guest
}

/** Saves the form and waits for the server's answer. */
async function save(page: Page) {
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/restaurant') && response.request().method() !== 'GET',
  )
  await page.getByRole('button', { name: either('Save changes', 'حفظ التغييرات') }).click()
  return saved
}

test.describe('restaurant', () => {
  test.beforeEach(async ({ page }) => {
    // The map preview is OpenStreetMap's; answer it locally.
    await page.route('https://www.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>map</title>' }),
    )
  })

  test('an owner edits the name, description and phone, and the menu shows them @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'free' })
    await page.goto('/restaurant')

    const name = page.locator('#name-en')
    await expect(name).toHaveValue('E2E Kitchen')
    const saveButton = page.getByRole('button', { name: either('Save changes', 'حفظ التغييرات') })
    await expect(saveButton).toBeDisabled()

    await name.fill('Beit Rima')
    await page.locator('#description-en').fill('Slow food from the mountains.')
    await page.getByRole('textbox', { name: /^(Phone|الهاتف)/ }).fill('71 555 666')
    await expect(saveButton).toBeEnabled()

    expect((await save(page)).ok()).toBeTruthy()
    await expect(page.getByText(either('Settings saved', 'تم حفظ الإعدادات'))).toBeVisible()
    await expect(saveButton).toBeDisabled()

    await page.reload()
    await expect(name).toHaveValue('Beit Rima')

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.getByRole('heading', { level: 1 })).toHaveText('Beit Rima')
    await expect(guest.getByText('Slow food from the mountains.')).toBeVisible()
    await expect(guest.locator('a[href^="tel:"]').first()).toHaveAttribute('href', 'tel:71 555 666')
    await guest.context().close()
  })

  test('Save waits for a change, and Undo puts the saved values back', async ({ page, owner }) => {
    await owner()
    await page.goto('/restaurant')

    const saveButton = page.getByRole('button', { name: 'Save changes' })
    const undo = page.getByRole('button', { name: 'Undo changes' })
    await expect(page.getByText('Everything is saved.')).toBeVisible()
    await expect(saveButton).toBeDisabled()
    await expect(undo).toBeDisabled()

    await page.locator('#name-en').fill('Something else')
    await expect(page.getByText('You have unsaved changes.')).toBeVisible()
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect(page.locator('#name-en')).toHaveValue('E2E Kitchen')
    await expect(saveButton).toBeDisabled()
    await expect(page.getByText('Everything is saved.')).toBeVisible()
  })

  test('the name is required and checked before saving', async ({ page, owner }) => {
    await owner()
    await page.goto('/restaurant')

    await page.locator('#name-en').fill('')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('The restaurant name is required in English.')).toBeVisible()

    await page.locator('#name-en').fill('B')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('The restaurant name must be at least 2 characters.')).toBeVisible()
  })

  test('a pro owner writes the name in Arabic too, and the Arabic menu shows it', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'pro', second_locale: 'ar' })
    await page.goto('/restaurant')

    const tabs = page.getByRole('tablist', { name: 'Content language' }).first()
    await expect(tabs.getByRole('tab', { name: 'EN' })).toHaveAttribute('aria-selected', 'true')
    await tabs.getByRole('tab', { name: 'AR' }).click()
    const arabic = page.locator('#name-ar')
    await expect(arabic).toHaveAttribute('dir', 'rtl')
    await arabic.fill('بيت ريما')
    expect((await save(page)).ok()).toBeTruthy()

    const guest = await guestMenu(browser, restaurant, '?lang=ar')
    await expect(guest.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(guest.getByRole('heading', { level: 1 })).toHaveText('بيت ريما')
    await guest.goto(restaurant.restaurant.public_url)
    await expect(guest.getByRole('heading', { level: 1 })).toHaveText('E2E Kitchen')
    await guest.context().close()
  })

  test('a map link with coordinates draws a map; a short link says it cannot', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner()
    await page.goto('/restaurant')

    const location = page.getByRole('textbox', { name: /^Location/ })
    await location.fill('https://www.google.com/maps/@33.8938,35.5018,17z')
    await expect(page.locator('iframe[title="Where your restaurant is"]')).toBeVisible()
    await expect(page.getByText('33.89380, 35.50180')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/@33.8938,35.5018,17z',
    )

    await location.fill('https://maps.app.goo.gl/abc123')
    await expect(page.locator('iframe[title="Where your restaurant is"]')).toHaveCount(0)
    await expect(
      page.getByText('This link has no coordinates in it', { exact: false }),
    ).toBeVisible()

    expect((await save(page)).ok()).toBeTruthy()
    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('.facts-row a[data-track="map"]')).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/abc123',
    )
    await guest.context().close()
  })

  test('a mistake only the server catches is shown on its field', async ({ page, owner }) => {
    await owner()
    await page.goto('/restaurant')

    // A browser takes a space in a link; the server does not.
    const location = page.getByRole('textbox', { name: /^Location/ })
    await location.fill('https://maps.google.com/a place')
    const response = await save(page)
    expect(response.status()).toBe(422)

    await expect(page.getByText('Could not save your settings')).toBeVisible()
    await expect(location).toHaveAttribute('aria-invalid', 'true')
    await expect(location).toHaveAccessibleDescription(/valid URL/i)
  })

  test('currency and timezone come from searchable lists', async ({ page, browser, owner }) => {
    const restaurant = await owner({
      categories: [{ name: { en: 'Grills' }, dishes: [{ name: { en: 'Kafta' }, price: 12 }] }],
    })
    await page.goto('/restaurant')

    const currency = page.getByRole('combobox', { name: /^Currency/ })
    await expect(currency).toHaveValue('USD')
    await currency.click()
    await currency.fill('lebanese')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.getByRole('option', { name: /LBP/ }).click()
    await expect(currency).toHaveValue('LBP')

    const timezone = page.getByRole('combobox', { name: /^Timezone/ })
    await expect(timezone).toHaveValue('Asia/Beirut')
    await timezone.click()
    await timezone.fill('nothing like this')
    await expect(page.getByText('No timezone matches that')).toBeVisible()
    await timezone.fill('calcutta')
    await page.getByRole('option', { name: 'Asia/Calcutta', exact: true }).click()
    await expect(timezone).toHaveValue('Asia/Calcutta')

    expect((await save(page)).ok()).toBeTruthy()
    await page.reload()
    await expect(currency).toHaveValue('LBP')
    await expect(timezone).toHaveValue('Asia/Calcutta')

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('article.dish .price')).toHaveText('L.L.12.00')
    await guest.context().close()
  })

  test('opening hours, including a night that runs past midnight, drive "open now"', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner()
    const { zone, hour, minute, day } = earlyMorningZone()
    const yesterday = yesterdayOf(day)
    await page.goto('/restaurant')

    const timezone = page.getByRole('combobox', { name: /^Timezone/ })
    await timezone.click()
    await timezone.fill(zone.split('/').pop()!.replace(/_/g, ' '))
    await page.getByRole('option', { name: zone.replace(/_/g, ' '), exact: true }).click()

    // Every day starts closed; last night opens at 20:00 and runs past now.
    const lastNight = DAY_NAMES[yesterday]
    const lastNightOpen = page.getByRole('switch', { name: `${lastNight} is open` })
    await expect(lastNightOpen).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('textbox', { name: `${lastNight} opens` })).toBeDisabled()
    await lastNightOpen.click()
    await page.getByRole('textbox', { name: `${lastNight} opens` }).fill('20:00')
    await page.getByRole('textbox', { name: `${lastNight} closes` }).fill(hhmm(hour + 2, minute))

    // A time that is no time is caught before saving.
    await page.getByRole('switch', { name: `${DAY_NAMES[day]} is open` }).click()
    await page.getByRole('textbox', { name: `${DAY_NAMES[day]} opens` }).fill('25:00')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Use a time like 09:00.')).toBeVisible()
    // Today stays closed.
    await page.getByRole('switch', { name: `${DAY_NAMES[day]} is open` }).click()
    expect((await save(page)).ok()).toBeTruthy()

    const guest = await guestMenu(browser, restaurant)
    const facts = guest.locator('.facts-row')
    await expect(facts).toContainText('Open now')
    // Today itself is a closed day.
    await expect(facts).toContainText('Closed today')

    // Closing an hour ago means closed now.
    await page.reload()
    await page.getByRole('textbox', { name: `${lastNight} closes` }).fill(hhmm(hour - 1, minute))
    expect((await save(page)).ok()).toBeTruthy()
    await guest.reload()
    await expect(facts).toContainText('Closed now')
    await guest.context().close()
  })

  test('the logo is replaced, and a cover is added and removed', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ logo: true })
    await page.goto('/restaurant')

    // The logo can be replaced, never removed.
    await expect(page.getByText('Current image')).toBeVisible()
    const guestBefore = await guestMenu(browser, restaurant)
    const oldLogo = await guestBefore.locator('img.brand-mark').getAttribute('src')
    await guestBefore.context().close()

    await page.getByLabel(/^Logo/).setInputFiles(`${FILES}logo.png`)
    await expect(page.getByText('logo.png')).toBeVisible()
    await page.getByLabel(/^Cover image/).setInputFiles(`${FILES}dish.jpg`)
    await expect(page.getByText('dish.jpg')).toBeVisible()
    expect((await save(page)).ok()).toBeTruthy()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('img.brand-mark')).toBeVisible()
    expect(await guest.locator('img.brand-mark').getAttribute('src')).not.toBe(oldLogo)
    await expect(guest.locator('img.cover-photo')).toHaveCount(1)

    // Remove the cover.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Remove' }).click()
    expect((await save(page)).ok()).toBeTruthy()
    await guest.reload()
    await expect(guest.locator('img.cover-photo')).toHaveCount(0)
    await expect(guest.locator('img.brand-mark')).toBeVisible()
    await guest.context().close()
  })

  test('a file that is not an image is refused', async ({ page, owner }) => {
    await owner()
    await page.goto('/restaurant')

    await page.getByLabel(/^Cover image/).setInputFiles(`${FILES}not-an-image.txt`)
    await expect(page.getByText(/JPEG, PNG or WebP/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  test('the address link opens the public menu', async ({ page, owner, expectAccessible }) => {
    const restaurant = await owner()
    await page.goto('/restaurant')

    const link = page.getByRole('link', { name: `/${restaurant.restaurant.slug}`, exact: true })
    await expect(link).toHaveAttribute('href', restaurant.restaurant.public_url)
    await expectAccessible()
    const [menu] = await Promise.all([page.waitForEvent('popup'), link.click()])
    await expect(menu).toHaveURL(restaurant.restaurant.public_url)
    await expect(menu.getByRole('heading', { level: 1 })).toHaveText('E2E Kitchen')
  })
})
