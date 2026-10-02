import type { Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { API_URL, DASHBOARD_URL, LOGIN_URL } from '../../support/urls'

const CONTACT_URL = `${API_URL}/contact`

function navCta(page: Page) {
  return page.locator('nav.nav .nav-right a.btn')
}

/** The message under one contact field. */
function contactError(page: Page, field: 'name' | 'email' | 'message') {
  return page.locator(`[data-error-for="${field}"]`)
}

test.describe('portal', () => {
  test('the landing page loads and sends a guest to sign up @matrix', async ({ page }) => {
    const response = await page.goto(API_URL)
    expect(response?.status()).toBe(200)

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('on every phone')
    await expect(navCta(page)).toHaveText('Get started free')

    await navCta(page).click()
    await expect(page).toHaveURL(LOGIN_URL)
  })

  test('the pricing shows the packages as the admin set them, and no invented claims', async ({
    page,
  }) => {
    await page.goto(API_URL)
    const pricing = page.locator('#pricing')

    await expect(pricing.locator('.plan')).toHaveCount(4)
    const popular = pricing.locator('.plan', { hasText: 'Most popular' })
    await expect(popular).toHaveCount(1)
    await expect(popular).toContainText('Premium')
    await expect(popular).toContainText('$29')
    await expect(popular).toContainText('Everything in Pro, plus:')
    // Unlimited on screen, with the fair-use number stated under the cards.
    await expect(popular).toContainText('Unlimited dishes*')
    await expect(pricing).toContainText(
      '* Fair use on Premium: up to 1,000 dishes and 1,000 categories.',
    )
    await expect(pricing.locator('.plan', { hasText: 'Pro' }).first()).toContainText('150 dishes')
    await expect(
      pricing.locator('.plan').last().getByRole('link', { name: 'Talk to us' }),
    ).toHaveAttribute('href', CONTACT_URL)
    await expect(page.locator('#upgrade')).toContainText('No card,')
    for (const claim of ['AI', 'Apple Pay', 'Riyadh to Lisbon']) {
      await expect(page.locator('body')).not.toContainText(claim)
    }
  })

  test('the Arabic landing page reads the Arabic packages', async ({ page }) => {
    await page.goto(`${API_URL}/locale/ar`)
    await page.goto(API_URL)

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('#pricing')).toContainText('150 طبقاً')
    await expect(page.locator('#pricing')).toContainText('كل ما في مجاني، إضافةً إلى:')
  })

  test('a signed-in owner is offered the dashboard, not the sign-up', async ({ page, owner }) => {
    await owner()
    await page.goto(API_URL)

    await expect(navCta(page)).toHaveText('My dashboard')
    await expect(navCta(page)).toHaveAttribute('href', DASHBOARD_URL)
    await expect(page.locator('.hero-form-authed a')).toHaveAttribute('href', DASHBOARD_URL)

    await navCta(page).click()
    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
  })

  test('someone who has not finished setting up is offered to continue it', async ({
    page,
    scenario,
    signIn,
  }) => {
    const user = await scenario({ restaurant: false, onboarded: false })
    await signIn(user.user.email)
    await page.goto(API_URL)

    await expect(navCta(page)).toHaveText('Continue setup')
    await navCta(page).click()
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
  })

  for (const [path, title] of [
    ['privacy-policy', 'Privacy Policy'],
    ['terms-of-service', 'Terms of Service'],
    ['cookie-policy', 'Cookie Policy'],
    ['refund-policy', 'Refund Policy'],
  ] as const) {
    test(`the ${title} page renders`, async ({ page }) => {
      const response = await page.goto(`${API_URL}/${path}`)
      expect(response?.status()).toBe(200)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        new RegExp(title.replace(' ', '\\s+')),
      )
      await expect(page.locator('.legal-updated')).not.toBeEmpty()
    })
  }

  test('the footer links reach every legal page and the contact form', async ({ page }) => {
    await page.goto(API_URL)
    const footer = page.locator('footer')

    const links = [
      ['Terms', `${API_URL}/terms-of-service`],
      ['Privacy', `${API_URL}/privacy-policy`],
      ['Cookies', `${API_URL}/cookie-policy`],
      ['Refund Policy', `${API_URL}/refund-policy`],
      ['Contact', CONTACT_URL],
    ] as const
    await Promise.all(
      links.map(([name, url]) =>
        expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', url),
      ),
    )
  })

  test('the contact form checks every field before sending', async ({ page }) => {
    await page.goto(CONTACT_URL)

    let posted = false
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url() === CONTACT_URL) posted = true
    })

    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(contactError(page, 'name')).toHaveText('Name is required.')
    await expect(contactError(page, 'email')).toHaveText('Email is required.')
    await expect(contactError(page, 'message')).toHaveText('Message is required.')
    await expect(page.getByLabel('Name')).toBeFocused()

    await page.getByLabel('Name').fill('Rana')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Message').fill('Too short')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(contactError(page, 'name')).toHaveText('')
    await expect(contactError(page, 'email')).toHaveText('Please enter a valid email address.')
    await expect(contactError(page, 'message')).toHaveText('At least 10 characters required.')
    await expect(page.locator('#ctcCount')).toHaveText('9 / 2000')
    expect(posted).toBe(false)
  })

  test('an address the server rejects is shown under the email field', async ({ page }) => {
    await page.goto(CONTACT_URL)

    // Passes the page's own check, not the server's.
    await page.getByLabel('Name').fill('Rana')
    await page.getByLabel('Email').fill('rana@example..com')
    await page.getByLabel('Message').fill('We would like to hear about the Premium package.')

    const response = page.waitForResponse(
      (candidate) => candidate.url() === CONTACT_URL && candidate.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Send message' }).click()
    expect((await response).status()).toBe(422)

    await expect(contactError(page, 'email')).toHaveText('Please provide a valid email address.')
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
    await expect(page.locator('#ctcSuccess')).toBeHidden()
  })

  test('a sent message shows the thank-you card', async ({ page }) => {
    // The real endpoint allows 3 messages per IP per day, counted in the
    // shared e2e database (package requests from the dashboard count too),
    // so the answer is stood in for here; ContactTest covers the storing.
    const sent: Record<string, string> = {}
    await page.route(CONTACT_URL, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      // The page posts FormData, so the body is multipart.
      const multipart = route.request().postDataBuffer()?.toString() ?? ''
      for (const field of ['name', 'email', 'message']) {
        const match = multipart.match(new RegExp(`name="${field}"\\r\\n\\r\\n([^\\r]*)`))
        if (match) sent[field] = match[1]!
      }
      await route.fulfill({ status: 200, json: { message: 'Your message has been sent.' } })
    })
    await page.goto(CONTACT_URL)

    await page.getByLabel('Name').fill('Rana')
    await page.getByLabel('Email').fill('rana@example.com')
    await page.getByLabel('Message').fill('We would like to hear about the Premium package.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByRole('heading', { name: 'Message sent!' })).toBeVisible()
    await expect(page.locator('#ctcFormState')).toBeHidden()
    expect(sent).toMatchObject({
      name: 'Rana',
      email: 'rana@example.com',
      message: 'We would like to hear about the Premium package.',
    })
  })

  test('the daily limit is explained in a banner and the form can be sent again later', async ({
    page,
  }) => {
    const limit = "You've reached the daily message limit. Please try again in 5 hour(s)."
    await page.route(CONTACT_URL, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 429,
            json: { message: limit, code: 'too_many_requests', errors: { rate_limit: [limit] } },
          })
        : route.fallback(),
    )
    await page.goto(CONTACT_URL)

    await page.getByLabel('Name').fill('Rana')
    await page.getByLabel('Email').fill('rana@example.com')
    await page.getByLabel('Message').fill('We would like to hear about the Premium package.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.locator('#ctcBanner')).toBeVisible()
    await expect(page.locator('#ctcBanner')).toContainText(limit)
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
    await expect(page.getByLabel('Message')).toHaveValue(
      'We would like to hear about the Premium package.',
    )
  })

  test('on the narrowest phone the navbar fits, logo and button included', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })

    for (const path of ['/', '/ar', '/guides/qr-menu-vs-paper-menu-cost']) {
      await page.goto(`${API_URL}${path}`)
      for (const part of [page.locator('nav.nav .brand'), navCta(page)]) {
        const box = await part.boundingBox()
        expect(box, path).not.toBeNull()
        expect(box!.x, path).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width, path).toBeLessThanOrEqual(320)
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        path,
      ).toBe(true)
    }
    // The label is shorter on screen, but still the whole sentence to read out.
    await expect(navCta(page)).toHaveAccessibleName('Get started free')
  })

  test('switching the portal to Arabic turns it right to left, and back', async ({ page }) => {
    await page.goto(API_URL)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

    await page.locator('nav.nav .lang').getByRole('link', { name: 'ع' }).click()

    // Arabic has its own address, which is what lets Google index it.
    await expect(page).toHaveURL(`${API_URL}/ar`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(navCta(page)).toHaveText('ابدأ مجاناً')

    // Links on an Arabic page stay in Arabic.
    await page.locator('footer').getByRole('link', { name: 'تواصل', exact: true }).click()
    await expect(page).toHaveURL(`${API_URL}/ar/contact`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('button', { name: 'إرسال الرسالة' })).toBeVisible()

    // Typing the bare address after choosing Arabic lands on the Arabic home.
    await page.goto(API_URL)
    await expect(page).toHaveURL(`${API_URL}/ar`)

    await page.locator('nav.nav .lang').getByRole('link', { name: 'EN' }).click()
    await expect(page).toHaveURL(`${API_URL}/`)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(navCta(page)).toHaveText('Get started free')
  })
})
