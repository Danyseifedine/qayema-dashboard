import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { API_URL, DASHBOARD_URL, LOGIN_URL } from '../../support/urls'

const FAILED = 'The email, username or password is not correct.'

/** The login form at LOGIN_URL, filled and sent the way a person would. */
async function signInWithForm(page: Page, login: string, password: string) {
  await page.goto(LOGIN_URL)
  await page.getByLabel('Email or username').fill(login)
  // The label also holds the "Forgot password?" link, so the input is found by id.
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** The message under the email or username field (the page repeats it in a banner too). */
function loginError(page: Page) {
  return page
    .locator('.ui-field')
    .filter({ has: page.locator('#login') })
    .locator('.ui-help.error:visible')
}

test.describe('sign in', () => {
  test('an owner signs in through the form and lands on the dashboard @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro' })

    await signInWithForm(page, owner.user.email, owner.user.password)

    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
    await expect(
      page.getByRole('button', { name: either('Account menu', 'قائمة الحساب') }),
    ).toBeVisible()
  })

  test('someone still setting up is sent to the onboarding wizard', async ({ page, scenario }) => {
    const user = await scenario({ restaurant: false, onboarded: false })

    await signInWithForm(page, user.user.email, user.user.password)

    await expect(page).toHaveURL(`${API_URL}/onboarding`)
    await expect(page.getByLabel(/Restaurant name/)).toBeVisible()
  })

  test('a wrong password is refused and the email is kept', async ({ page, scenario }) => {
    const owner = await scenario()

    await signInWithForm(page, owner.user.email, 'not-the-password')

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(loginError(page)).toHaveText(FAILED)
    await expect(page.getByLabel('Email or username')).toHaveValue(owner.user.email)
    await expect(page.locator('#password')).toHaveValue('')
  })

  test('an unknown email gets the same answer as a wrong password', async ({ page }) => {
    await signInWithForm(page, `nobody-${Date.now()}@e2e.test`, 'whatever-password')

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(loginError(page)).toHaveText(FAILED)
  })

  test('empty fields are caught before anything is sent', async ({ page }) => {
    await page.goto(LOGIN_URL)

    let posted = false
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url() === LOGIN_URL) posted = true
    })

    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(loginError(page)).not.toHaveText('')
    await expect(page.getByLabel('Email or username')).toBeFocused()

    await page.getByLabel('Email or username').fill('owner@e2e.test')
    await page.getByRole('button', { name: 'Sign in' }).click()

    const passwordError = page
      .locator('.ui-field')
      .filter({ has: page.locator('#password') })
      .locator('.ui-help.error:visible')
    await expect(passwordError).not.toHaveText('')
    await expect(page.locator('#password')).toBeFocused()
    expect(posted).toBe(false)
  })

  test('an account made with Google is told to use the Google button', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ has_password: false })

    await signInWithForm(page, owner.user.email, 'any-password-at-all')

    await expect(loginError(page)).toHaveText(
      'This account uses Google sign-in. Please use the "Continue with Google" button above.',
    )
  })

  test('repeated failures do not lock the account out in e2e (array cache)', async ({
    page,
    scenario,
  }) => {
    // The login limiter (5 tries per email+IP) counts in the cache, and the
    // e2e server's array store forgets it after every request, so no lockout
    // can build up here. PHPUnit covers the limiter itself.
    const owner = await scenario()

    // One attempt after another, as a person (or a script) would make them.
    for (let attempt = 0; attempt < 6; attempt++) {
      await signInWithForm(page, owner.user.email, `wrong-${attempt}`)
      await expect(loginError(page)).toHaveText(FAILED)
    }

    await signInWithForm(page, owner.user.email, owner.user.password)
    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
  })

  test('an owner creates an account with a username and signs in with it', async ({ page }) => {
    const username = `e2e.${Date.now()}`
    const password = 'a-username-e2e-password'

    await page.goto(LOGIN_URL)
    await page.getByRole('link', { name: 'Create one with a username' }).click()
    await expect(page).toHaveURL(`${API_URL}/create-account`)

    await page.getByLabel('Your name').fill('Rami')
    await page.getByLabel('Username').fill(username)
    await page.locator('#password').fill(password)
    await page.locator('#password_confirmation').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(`${API_URL}/onboarding`)

    await page.context().clearCookies()
    await signInWithForm(page, username.toUpperCase(), password)
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
  })

  test('the Google button points at the Google sign-in route', async ({ page }) => {
    await page.goto(LOGIN_URL)

    await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      `${API_URL}/auth/google`,
    )
  })
})

test.describe('session', () => {
  test('a guest opening the dashboard is sent to sign in', async ({ page }) => {
    await page.goto('/categories')

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('logging out from the avatar menu ends the session @matrix', async ({ page, owner }) => {
    await owner()
    await page.goto('/')
    await expect(page).toHaveURL(/\/overview$/)

    await page.getByRole('button', { name: either('Account menu', 'قائمة الحساب') }).click()
    await page.getByRole('menuitem', { name: either('Log out', 'تسجيل الخروج') }).click()

    await expect(page).toHaveURL(LOGIN_URL)

    // The session is gone on the server, not just in this tab.
    await page.goto('/overview')
    await expect(page).toHaveURL(LOGIN_URL)
  })

  test('Back after logging out leads to sign in, not a stuck dashboard', async ({
    page,
    owner,
  }) => {
    await owner()
    await page.goto('/overview')
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Log out' }).click()
    await expect(page).toHaveURL(LOGIN_URL)

    await page.goBack()

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('Back after being sent to sign in leads to sign in again', async ({ page }) => {
    await page.goto('/categories')
    await expect(page).toHaveURL(LOGIN_URL)

    await page.goBack()

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('a session lost mid-use sends the owner back to sign in', async ({ page, owner }) => {
    await owner()
    await page.goto('/categories')
    await page.getByRole('button', { name: 'Add category' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Lost session')

    // The session ends (expired, signed out elsewhere) while the page is open.
    // Nothing may still be in flight, or its Set-Cookie would bring it back.
    await page.waitForLoadState('networkidle')
    await page.context().clearCookies()
    await dialog.getByRole('button', { name: 'Add category' }).click()

    await expect(page).toHaveURL(LOGIN_URL)
  })
})

test.describe('password reset', () => {
  test('asking for a reset link says one is on its way', async ({ page, scenario }) => {
    const owner = await scenario()

    await page.goto(LOGIN_URL)
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(`${API_URL}/forgot-password`)

    await page.getByLabel('Email').fill(owner.user.email)
    await page.getByRole('button', { name: 'Email me a reset link' }).click()

    await expect(
      page.getByText('If that address has an account, a reset link is on its way.'),
    ).toBeVisible()
  })

  test('an unknown address gets the same answer, so accounts cannot be probed', async ({
    page,
  }) => {
    await page.goto(`${API_URL}/forgot-password`)
    await page.getByLabel('Email').fill(`nobody-${Date.now()}@e2e.test`)
    await page.getByRole('button', { name: 'Email me a reset link' }).click()

    await expect(
      page.getByText('If that address has an account, a reset link is on its way.'),
    ).toBeVisible()
  })

  test('a reset link sets a new password; the old one stops working', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario()
    const response = await page.request.post(`${API_URL}/__e2e/password-reset-token`, {
      data: { email: owner.user.email },
      headers: { Accept: 'application/json' },
    })
    expect(response.ok()).toBeTruthy()
    const { token } = (await response.json()) as { token: string }
    const newPassword = 'a-brand-new-e2e-password'

    await page.goto(
      `${API_URL}/reset-password/${token}?email=${encodeURIComponent(owner.user.email)}`,
    )
    await expect(page.getByLabel('Email')).toHaveValue(owner.user.email)
    await page.locator('#password').fill(newPassword)
    await page.locator('#password_confirmation').fill(newPassword)
    await page.getByRole('button', { name: 'Save new password' }).click()

    await expect(page).toHaveURL(LOGIN_URL)
    await expect(
      page.getByText('Your password has been changed. Sign in with it now.'),
    ).toBeVisible()

    await signInWithForm(page, owner.user.email, owner.user.password)
    await expect(loginError(page)).toHaveText(FAILED)

    await signInWithForm(page, owner.user.email, newPassword)
    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
  })

  test('a forged reset token is refused', async ({ page, scenario }) => {
    const owner = await scenario()

    await page.goto(
      `${API_URL}/reset-password/not-a-real-token?email=${encodeURIComponent(owner.user.email)}`,
    )
    await page.locator('#password').fill('another-e2e-password')
    await page.locator('#password_confirmation').fill('another-e2e-password')
    await page.getByRole('button', { name: 'Save new password' }).click()

    await expect(loginError(page)).toHaveText(
      'This reset link is invalid or has expired. Please request a new one.',
    )

    // The old password still works.
    await signInWithForm(page, owner.user.email, owner.user.password)
    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
  })

  test('a new password that does not match its confirmation is refused', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario()
    const response = await page.request.post(`${API_URL}/__e2e/password-reset-token`, {
      data: { email: owner.user.email },
      headers: { Accept: 'application/json' },
    })
    const { token } = (await response.json()) as { token: string }

    await page.goto(
      `${API_URL}/reset-password/${token}?email=${encodeURIComponent(owner.user.email)}`,
    )
    await page.locator('#password').fill('first-e2e-password')
    await page.locator('#password_confirmation').fill('second-e2e-password')
    await page.getByRole('button', { name: 'Save new password' }).click()

    await expect(
      page
        .locator('.ui-field')
        .filter({ has: page.locator('#password') })
        .locator('.ui-help.error:visible'),
    ).toContainText('confirmation does not match')
  })
})
