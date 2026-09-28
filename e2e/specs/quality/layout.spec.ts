import { devices } from '@playwright/test'
import { expect, test } from '../../support/fixtures'

/**
 * No dashboard page may be wider than a phone. A too-wide element makes the
 * mobile browser widen the whole layout, so every page scrolls sideways, and
 * an Arabic page opens shifted (the compare table on the Package page did).
 */
const PAGES = [
  'overview',
  'analytics',
  'categories',
  'dishes',
  'design',
  'appearance',
  'orders',
  'qr',
  'social-links',
  'restaurant',
  'features',
  'package',
  'account',
]

test.use({ ...devices['Pixel 7'] })

for (const language of ['en', 'ar'] as const) {
  test.describe(language, () => {
    test.use({ uiLanguage: language })

    test(`every page fits a phone's width (${language})`, async ({ page, owner }) => {
      await owner({
        package: 'free',
        categories: [{ name: { en: 'Grills' }, dishes: [{ name: { en: 'Kafta' } }] }],
      })
      const width = page.viewportSize()!.width

      for (const key of PAGES) {
        await page.goto(`/${key}`)
        await expect(page.locator('main h2, main h1').first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect
          .poll(() => page.evaluate(() => window.innerWidth), { message: `/${key}` })
          .toBe(width)
      }
    })
  })
}
