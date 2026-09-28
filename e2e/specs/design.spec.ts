import type { Page } from '@playwright/test'
import { either, expect, test } from '../fixtures/test'

const CLASSIC_ACCENT = '#F8D38D'
const MIDNIGHT_ACCENT = '#1F6FEB'

/** One design's card, by its name in either interface language. */
const design = (page: Page, name: 'Classic' | 'Midnight') =>
  page.getByRole('article').filter({
    has: page.getByRole('heading', {
      name: name === 'Classic' ? either('Classic', 'كلاسيك') : either('Midnight', 'منتصف الليل'),
    }),
  })

/** The main colour the public menu is drawn with. */
async function publicAccent(page: Page, url: string): Promise<string> {
  await page.goto(url)
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toUpperCase(),
  )
}

test.describe('design', () => {
  test('a new owner picks a design with one tap @matrix', async ({ page, owner }) => {
    await owner({ package: 'pro', template: null })
    await page.goto('/')
    await expect(page).toHaveURL(/\/design$/)
    await expect(
      page.getByText(either('Your menu needs a design', 'قائمتك تحتاج إلى تصميم')),
    ).toBeVisible()

    const classic = design(page, 'Classic')
    await classic
      .getByRole('button', { name: either('Use this design', 'استخدم هذا التصميم') })
      .click()

    await expect(classic.getByText(either('In use', 'مُستخدم'), { exact: true })).toBeVisible()
    await expect(
      classic.getByRole('button', { name: either('Currently in use', 'مُستخدم حاليًا') }),
    ).toBeDisabled()
    await expect(
      page.getByText(either('Your menu needs a design', 'قائمتك تحتاج إلى تصميم')),
    ).toHaveCount(0)

    // It stays chosen.
    await page.reload()
    await expect(
      design(page, 'Classic').getByText(either('In use', 'مُستخدم'), { exact: true }),
    ).toBeVisible()
  })

  test('a premium design is locked on Pro and points to the packages', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/design')

    const midnight = design(page, 'Midnight')
    await expect(midnight.getByText('Premium', { exact: true })).toBeVisible()
    await expect(midnight.getByRole('button', { name: 'Use this design' })).toHaveCount(0)
    await expect(design(page, 'Classic').getByText('In use', { exact: true })).toBeVisible()

    await midnight.getByRole('button', { name: 'Comes with Premium' }).click()
    await expect(page).toHaveURL(/\/package$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Package')
  })

  test('on Premium the premium design is one tap away, and back', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'premium',
      categories: [{ name: { en: 'Mains' }, dishes: [{ name: { en: 'Kafta' } }] }],
    })
    await page.goto('/design')

    await design(page, 'Midnight').getByRole('button', { name: 'Use this design' }).click()
    await expect(design(page, 'Midnight').getByText('In use', { exact: true })).toBeVisible()
    await expect(
      design(page, 'Classic').getByRole('button', { name: 'Use this design' }),
    ).toBeEnabled()
    expect(await publicAccent(page, restaurant.public_url)).toBe(MIDNIGHT_ACCENT)

    await page.goto('/design')
    await design(page, 'Classic').getByRole('button', { name: 'Use this design' }).click()
    await expect(design(page, 'Classic').getByText('In use', { exact: true })).toBeVisible()
    expect(await publicAccent(page, restaurant.public_url)).toBe(CLASSIC_ACCENT)
  })

  test('losing Premium keeps the choice while the menu shows Classic', async ({
    page,
    owner,
    setPackage,
  }) => {
    const { restaurant } = await owner({
      package: 'premium',
      template: 'midnight',
      categories: [{ name: { en: 'Mains' }, dishes: [{ name: { en: 'Kafta' } }] }],
    })
    expect(await publicAccent(page, restaurant.public_url)).toBe(MIDNIGHT_ACCENT)

    await setPackage(restaurant.id, { package: 'free' })
    await page.goto('/design')

    await expect(page.getByText('Your menu shows another design for now')).toBeVisible()
    await expect(
      page.getByText(
        'Midnight needs a package with premium designs, so your menu uses Classic until you have one. Your choice is kept.',
      ),
    ).toBeVisible()
    // Still the chosen one.
    await expect(design(page, 'Midnight').getByText('In use', { exact: true })).toBeVisible()
    expect(await publicAccent(page, restaurant.public_url)).toBe(CLASSIC_ACCENT)

    // Back on Premium, the menu is Midnight again.
    await setPackage(restaurant.id, { package: 'premium' })
    await page.goto('/design')
    await expect(design(page, 'Midnight').getByText('In use', { exact: true })).toBeVisible()
    await expect(page.getByText('Your menu shows another design for now')).toHaveCount(0)
    expect(await publicAccent(page, restaurant.public_url)).toBe(MIDNIGHT_ACCENT)
  })
})
