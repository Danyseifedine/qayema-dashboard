import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { fixtureFile } from '../../support/helpers'

/** A count tile on the overview, found by its label. */
const tile = (page: Page, label: RegExp) =>
  page.locator('dl > div').filter({ has: page.locator('dt').getByText(label) })

const STEPS = {
  restaurant: 'Your restaurant',
  menu: 'Your dishes',
  share: 'Share your menu',
} as const

/** A set-up step's list of items, opening the step first when it is closed. */
async function step(page: Page, which: keyof typeof STEPS) {
  const toggle = page.getByRole('button', { name: new RegExp(STEPS[which]) })
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
  return page.getByRole('list', { name: STEPS[which] })
}

const EVERY_DAY = Object.fromEntries(
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [
    day,
    { open: '09:00', close: '23:00' },
  ]),
)

test.describe('overview', () => {
  test('counts what is on the menu against the free package @matrix', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Starters' },
          dishes: [{ name: { en: 'Hummus' } }, { name: { en: 'Fattoush' } }],
        },
        { name: { en: 'Mains' }, dishes: [{ name: { en: 'Kafta' } }] },
      ],
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/e2e.kitchen' }],
    })
    await page.goto('/overview')

    const dishes = tile(page, either('Dishes', 'الأطباق'))
    await expect(dishes.locator('dd').first()).toHaveText('3')
    await expect(dishes.getByText('3 / 40')).toBeVisible()

    const categories = tile(page, either('Categories', 'الأقسام'))
    await expect(categories.locator('dd').first()).toHaveText('2')
    await expect(categories.getByText('2 / 8')).toBeVisible()

    const social = tile(page, either('Social links', 'روابط التواصل الاجتماعي'))
    await expect(social.locator('dd').first()).toHaveText('1')
    // A reached limit reads left to right in both languages.
    await expect(social.getByText('1 / 1')).toHaveAttribute('dir', 'ltr')

    await expect(
      page.getByRole('heading', { name: either('Set up your menu', 'جهّز قائمتك') }),
    ).toBeVisible()
    // The menu's link comes first, ready to copy.
    await expect(
      page.getByRole('button', { name: either('Copy link', 'نسخ الرابط') }),
    ).toBeVisible()
  })

  test('an unlimited package says so instead of showing a number', async ({ page, owner }) => {
    await owner({
      package: 'custom',
      categories: [{ name: { en: 'Starters' }, dishes: [{ name: { en: 'Hummus' } }] }],
    })
    await page.goto('/overview')

    for (const label of ['Dishes', 'Categories', 'Social links']) {
      const count = tile(page, new RegExp(`^${label}$`))
      await expect(count).toContainText('No limit on your package')
      await expect(count).not.toContainText('/')
    }
    await expect(
      tile(page, /^Dishes$/)
        .locator('dd')
        .first(),
    ).toHaveText('1')
  })

  test('a menu with only the basics lists what is left, first', async ({ page, owner }) => {
    // The scenario's restaurant has a description and a phone, nothing else.
    await owner({ package: 'free' })
    await page.goto('/overview')

    await expect(page.getByText('2 of 10 done')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Menu set-up' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
    await expect(page.getByText('Three steps, each with what is still missing.')).toBeVisible()

    // The first step is open: the restaurant, with its description and phone done.
    const rows = (await step(page, 'restaurant')).getByRole('listitem')
    await expect(rows).toHaveCount(6)
    // What is done comes last and has no button.
    await expect(rows.nth(4)).toContainText('(done)')
    await expect(rows.nth(5)).toContainText('(done)')
    await expect(rows.nth(5).getByRole('button')).toHaveCount(0)
    await expect(rows.first()).toContainText('(to do)')
  })

  test('each item to do opens the page that fixes it', async ({ page, owner }) => {
    await owner({ package: 'free' })

    const targets: [which: keyof typeof STEPS, button: string, path: string][] = [
      ['restaurant', 'Add: Your logo', 'restaurant'],
      ['restaurant', 'Add: A cover photo', 'restaurant'],
      ['restaurant', 'Add: Opening hours', 'restaurant'],
      ['restaurant', 'Add: Your location', 'restaurant'],
      ['menu', 'Add: A category', 'categories'],
      ['menu', 'Add: A dish', 'dishes'],
      ['menu', 'Fix: Dish photos', 'dishes'],
      ['share', 'Add: A social link', 'social-links'],
    ]

    for (const [which, button, path] of targets) {
      await page.goto('/overview')
      await (await step(page, which)).getByRole('button', { name: button }).click()
      await expect(page).toHaveURL(new RegExp(`/${path}$`))
    }

    // Sharing ends at the QR code.
    await page.goto('/overview')
    await step(page, 'share')
    await page.getByRole('button', { name: 'Get your QR code' }).click()
    await expect(page).toHaveURL(/\/qr$/)
  })

  test('the photo item counts the dishes still without one', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        { name: { en: 'Grill' }, dishes: [{ name: { en: 'Kafta' } }, { name: { en: 'Tawouk' } }] },
      ],
    })
    await page.goto('/overview')

    await (
      await step(page, 'menu')
    )
      .getByRole('button', { name: 'Fix: 2 dishes have no photo' })
      .click()
    await expect(page).toHaveURL(/\/dishes$/)
  })

  test('the checklist completes once the menu is complete', async ({ page, owner }) => {
    await owner({
      package: 'free',
      logo: true,
      opening_hours: EVERY_DAY,
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      categories: [{ name: { en: 'Grill' }, dishes: [{ name: { en: 'Shish taouk' }, price: 9 }] }],
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/e2e.grill' }],
    })
    await page.goto('/overview')
    await expect(page.getByText('8 of 10 done')).toBeVisible()

    // The cover photo, from the Restaurant page.
    await (
      await step(page, 'restaurant')
    )
      .getByRole('button', { name: 'Add: A cover photo' })
      .click()
    await expect(page).toHaveURL(/\/restaurant$/)
    // Two image fields: the logo, then the cover.
    await page.locator('input[type="file"]').nth(1).setInputFiles(fixtureFile('dish.jpg'))
    await expect(page.getByText('dish.jpg')).toBeVisible()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Everything is saved.')).toBeVisible()

    // The last dish photo, from the Dishes page.
    await page.goto('/overview')
    await expect(page.getByText('9 of 10 done')).toBeVisible()
    await (
      await step(page, 'menu')
    )
      .getByRole('button', { name: 'Fix: 1 dish has no photo' })
      .click()
    await expect(page).toHaveURL(/\/dishes$/)
    await page.getByRole('button', { name: 'Edit Shish taouk' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]').setInputFiles(fixtureFile('dish.jpg'))
    await expect(dialog.getByText('dish.jpg')).toBeVisible()
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()

    await page.goto('/overview')
    await expect(page.getByText('10 of 10 done')).toBeVisible()
    await expect(
      page.getByText('Your menu is ready: everything guests look for is on it.'),
    ).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Menu set-up' })).toHaveAttribute(
      'aria-valuenow',
      '10',
    )
    for (const name of Object.values(STEPS)) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toContainText('Done')
    }
    const dishes = await step(page, 'menu')
    await expect(dishes.getByRole('button')).toHaveCount(0)
    await expect(dishes.getByText('Every dish has a photo')).toBeVisible()
  })
})
