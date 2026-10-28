import type { Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { API_URL } from '../../support/urls'

/**
 * Every page of the website, in English at the root and in Arabic under
 * /ar: it answers, it is written in its language and direction, its
 * language switch leads to its twin, and on the narrowest phone nothing
 * makes it wider than the screen. A box pushed off to the left (the contact
 * form's hidden field once was) widens only the Arabic page, since that is
 * the side an Arabic page scrolls to.
 */

const PAGES = [
  '',
  'pricing',
  'guides',
  'guides/how-to-make-a-qr-menu',
  'guides/qr-menu-vs-paper-menu-cost',
  'guides/update-menu-prices-fast',
  'qr-menu-lebanon',
  'digital-menu-for-cafes',
  'contact',
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
  'refund-policy',
]

/** The page's address in a language: English at the root, Arabic under /ar. */
function address(language: 'en' | 'ar', path: string): string {
  const prefix = language === 'ar' ? '/ar' : ''
  return `${API_URL}${prefix}${path ? `/${path}` : language === 'ar' ? '' : '/'}`
}

/** How far the page reaches past the screen's width, in pixels. */
function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test.describe('the website, page by page', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  for (const language of ['en', 'ar'] as const) {
    test(`every page answers in ${language} and fits a 360px phone @matrix`, async ({ page }) => {
      test.setTimeout(120_000)

      for (const path of PAGES) {
        const url = address(language, path)
        const response = await page.goto(url)
        expect(response?.status(), url).toBe(200)

        const html = page.locator('html')
        await expect(html, url).toHaveAttribute('lang', language)
        await expect(html, url).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
        await expect(page.getByRole('heading', { level: 1 }).first(), url).not.toBeEmpty()

        // The switch in the navbar remembers the choice and leads to the same
        // page in the other language.
        const other = language === 'ar' ? 'en' : 'ar'
        const twin = address(other, path).slice(API_URL.length)
        await expect(page.locator(`a[hreflang="${other}"]`).first(), url).toHaveAttribute(
          'href',
          `${API_URL}/locale/${other}?to=${encodeURIComponent(twin)}`,
        )

        expect(await overflow(page), `${url} is wider than the phone`).toBe(0)
      }
    })
  }

  test('the sign-in pages follow the language chosen on the website and fit the phone', async ({
    page,
  }) => {
    for (const language of ['en', 'ar'] as const) {
      // The pages without a language in their address remember the website's.
      await page.goto(`${API_URL}/locale/${language}`)
      for (const path of ['get-started', 'create-account', 'forgot-password']) {
        const response = await page.goto(`${API_URL}/${path}`)
        expect(response?.status(), path).toBe(200)
        await expect(page.locator('.form-col'), `${path} (${language})`).toHaveAttribute(
          'dir',
          language === 'ar' ? 'rtl' : 'ltr',
        )
        expect(await overflow(page), `${path} (${language}) is wider than the phone`).toBe(0)
      }
    }
  })

  test('the contact form in Arabic fits the phone, its hidden field included', async ({ page }) => {
    await page.goto(`${API_URL}/ar/contact`)
    await expect(page.locator('#contactForm')).toBeVisible()
    // The honeypot is still in the form for bots, just never seen.
    const trap = page.locator('input[name="hp_field"]')
    await expect(trap).toHaveCount(1)
    await expect(trap).not.toBeInViewport()
    expect(await overflow(page)).toBe(0)
  })

  test('an address that is no page says so in its language, with the way home', async ({
    page,
  }) => {
    const english = await page.goto(`${API_URL}/no-such-page-${Date.now()}`)
    expect(english?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    expect(await overflow(page)).toBe(0)

    const arabic = await page.goto(`${API_URL}/ar/no-such-page-${Date.now()}`)
    expect(arabic?.status()).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('link', { name: 'العودة إلى الرئيسية' })).toBeVisible()
    expect(await overflow(page)).toBe(0)
  })
})
