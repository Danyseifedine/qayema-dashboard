import { expect, test } from '../../support/fixtures'
import { guestMenu } from '../../support/helpers'

/**
 * What an admin's override for one restaurant does (the admin's "Extras &
 * overrides": a feature set exactly, whatever the package says). Creating
 * one in the panel is covered in admin.spec.ts; here the owner and the
 * guests see its effect.
 */
const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}

test.describe('overrides', () => {
  test('ordering turned off for a Premium restaurant: the owner is told, guests cannot order', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      categories: [GRILLS],
      overrides: [
        { feature: 'ordering', value: 0 },
        { feature: 'menu_ordering', value: 0 },
      ],
    })

    // The Features page says who turned it off, instead of naming a package.
    await page.goto('/features')
    await expect(page.getByText('Turned off by Qayema').first()).toBeVisible()

    // The menu shows the dishes but takes no order: no cart, no Add.
    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(guest.getByRole('button', { name: 'Add Kafta' })).toHaveCount(0)
    await expect(guest.getByRole('button', { name: 'Your cart' })).toHaveCount(0)
    await guest.context().close()
  })

  test('a dish limit lowered below the package stops new dishes and keeps the old ones', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      categories: [GRILLS],
      overrides: [{ feature: 'dish_limit', value: 2 }],
    })

    await page.goto('/dishes')
    await expect(page.getByText('2 / 2')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add dish' })).toBeDisabled()
    await expect(page.locator('article').filter({ hasText: 'Shish Taouk' })).toBeVisible()
  })

  test('a feature turned on beyond the package works like part of it', async ({ page, owner }) => {
    await owner({ package: 'free', overrides: [{ feature: 'qr_studio', value: 1 }] })

    await page.goto('/qr')
    await expect(page.getByText('Turned off for your restaurant')).toHaveCount(0)
    await expect(page.getByText('Customisation', { exact: false }).first()).toBeVisible()
  })

  test('the owner sees their own price on the Package page', async ({ page, owner }) => {
    await owner({ package: 'pro', price_cents: 500 })

    await page.goto('/package')
    const current = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Pro', exact: true }) })
    await expect(current).toContainText('5.00')
    await expect(current).not.toContainText('7.99')
  })
})
