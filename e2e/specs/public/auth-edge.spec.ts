import type { Page } from '@playwright/test'
import { expect, test } from '../../support/fixtures'
import { API_URL, LOGIN_URL } from '../../support/urls'

/**
 * Making an account with a username, the mistakes the form must catch and
 * say under the right field, and the ways back in for each kind of
 * account. The happy paths are in auth.spec.ts.
 */

const SIGNUP_URL = `${API_URL}/create-account`

/** A username no other test has. */
function freshUsername(): string {
  return `e2e.${Date.now()}${Math.random().toString(36).slice(2, 6)}`
}

/** The sign-up form, filled the way a person would and sent. */
async function signUp(
  page: Page,
  fields: { name?: string; username: string; email?: string; password: string; confirm?: string },
) {
  await page.goto(SIGNUP_URL)
  await page.getByLabel('Your name').fill(fields.name ?? 'Rami')
  await page.getByLabel('Username').fill(fields.username)
  if (fields.email) await page.getByLabel('Email (optional)').fill(fields.email)
  await page.locator('#password').fill(fields.password)
  await page.locator('#password_confirmation').fill(fields.confirm ?? fields.password)
  await page.getByRole('button', { name: 'Create account' }).click()
}

/** The message under one of the sign-up form's fields. */
function fieldError(page: Page, id: string) {
  return page
    .locator('.ui-field')
    .filter({ has: page.locator(`#${id}`) })
    .locator('.ui-help.error')
}

/** The sign-in form, filled and sent. */
async function signInWithForm(page: Page, login: string, password: string) {
  await page.goto(LOGIN_URL)
  await page.getByLabel('Email or username').fill(login)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('making an account', () => {
  test('a username someone has is refused under its field, and the name typed stays', async ({
    page,
  }) => {
    const username = freshUsername()
    await signUp(page, { username, password: 'first-e2e-password' })
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
    await page.context().clearCookies()

    // The same name in other letters is the same username.
    await signUp(page, {
      name: 'Someone Else',
      username: username.toUpperCase(),
      password: 'second-e2e-password',
    })
    await expect(page).toHaveURL(SIGNUP_URL)
    await expect(fieldError(page, 'username')).toHaveText(
      'That username is taken. Try another one.',
    )
    await expect(page.getByLabel('Your name')).toHaveValue('Someone Else')
    // A password is never sent back into the page.
    await expect(page.locator('#password')).toHaveValue('')

    // The first account still signs in with its own password, not the second.
    await signInWithForm(page, username, 'second-e2e-password')
    await expect(page).toHaveURL(LOGIN_URL)
    await signInWithForm(page, username, 'first-e2e-password')
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
  })

  test('a username with spaces or signs is refused, and passwords that differ too', async ({
    page,
  }) => {
    await signUp(page, { username: 'beit rami!', password: 'an-e2e-password' })
    await expect(fieldError(page, 'username')).toContainText('3 to 30 letters, numbers')

    await signUp(page, {
      username: freshUsername(),
      password: 'an-e2e-password',
      confirm: 'another-e2e-password',
    })
    await expect(page).toHaveURL(SIGNUP_URL)
    await expect(fieldError(page, 'password')).toBeVisible()
  })

  test('an email given at sign-up is a second way in, and one already used is refused', async ({
    page,
    scenario,
  }) => {
    const username = freshUsername()
    const email = `${username}@e2e.test`
    await signUp(page, { username, email, password: 'an-e2e-password' })
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
    await page.context().clearCookies()

    await signInWithForm(page, email, 'an-e2e-password')
    await expect(page).toHaveURL(`${API_URL}/onboarding`)
    await page.context().clearCookies()

    const other = await scenario()
    await signUp(page, {
      username: freshUsername(),
      email: other.user.email,
      password: 'x-e2e-password',
    })
    await expect(page).toHaveURL(SIGNUP_URL)
    await expect(fieldError(page, 'email')).toBeVisible()
    await expect(page.getByLabel('Email (optional)')).toHaveValue(other.user.email)
  })

  test('someone signed in who opens the sign-up page is sent to the website', async ({
    page,
    owner,
  }) => {
    await owner()
    await page.goto(SIGNUP_URL)
    await expect(page).toHaveURL(`${API_URL}/`)
  })
})

test.describe('a lost password', () => {
  test('the forgot-password page tells a username account to ask us, with the way to', async ({
    page,
  }) => {
    await page.goto(LOGIN_URL)
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(`${API_URL}/forgot-password`)
    await expect(page.getByText(/Signed up with a username and no email\?/)).toBeVisible()
    await page.getByRole('link', { name: 'Contact us' }).click()
    await expect(page).toHaveURL(`${API_URL}/contact`)
  })
})
