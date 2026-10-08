import type { Browser } from '@playwright/test'
import { DASHBOARD_URL, LOGIN_URL } from '../../support/urls'
import { either, expect, test } from '../../support/fixtures'

/** Signs in through the real form, in a browser of its own. */
async function logInThroughForm(browser: Browser, email: string, password: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(LOGIN_URL)
  await page.locator('#login').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('form button[type="submit"]').click()
  return { page, context }
}

test.describe('account', () => {
  test('an owner renames themselves from the avatar menu @matrix', async ({ page, owner }) => {
    const { user } = await owner({ package: 'free' })
    await page.goto('/overview')

    await page.getByRole('button', { name: either('Account menu', 'قائمة الحساب') }).click()
    await page.getByRole('menuitem', { name: either('Account', 'الحساب') }).click()
    await expect(page).toHaveURL(/\/account$/)

    // The email is who they are, so it is shown, not edited.
    await expect(page.getByText(user.email)).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Email|البريد/ })).toHaveCount(0)

    const name = page.getByRole('textbox', { name: either('Your name', 'اسمك') })
    await expect(name).toHaveValue('E2E Owner')
    const save = page.getByRole('button', { name: either('Save', 'حفظ') })
    await expect(save).toBeDisabled()

    await name.fill('Rima Haddad')
    await save.click()
    await expect(page.getByText(either('Profile saved', 'تم حفظ الملف الشخصي'))).toBeVisible()

    await page.reload()
    await expect(name).toHaveValue('Rima Haddad')
    await page.getByRole('button', { name: either('Account menu', 'قائمة الحساب') }).click()
    await expect(page.getByRole('menu')).toContainText('Rima Haddad')
  })

  test('a name that is too short is refused', async ({ page, owner }) => {
    await owner()
    await page.goto('/account')

    const name = page.getByRole('textbox', { name: 'Your name' })
    await name.fill('R')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Your name must be at least 2 characters.')).toBeVisible()
  })

  test('changing the password needs the current one, and the new one signs in', async ({
    page,
    browser,
    owner,
  }) => {
    const { user } = await owner()
    await page.goto('/account')

    const current = page.getByLabel(/^Current password\s*\*?$/)
    const next = page.getByLabel(/^New password\s*\*?$/)
    const confirm = page.getByLabel(/^Confirm password\s*\*?$/)
    const submit = page.getByRole('button', { name: 'Change password' })

    // Nothing typed.
    await submit.click()
    await expect(page.getByText('Enter your current password.')).toBeVisible()
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible()

    // The two new ones differ.
    await current.fill(user.password)
    await next.fill('a-new-password-1')
    await confirm.fill('a-new-password-2')
    await submit.click()
    await expect(page.getByText('The two passwords do not match.')).toBeVisible()

    // The server checks the current one.
    await current.fill('not-my-password')
    await confirm.fill('a-new-password-1')
    await submit.click()
    // On the field it is about, as well as in the toast.
    await expect(current).toHaveAccessibleDescription('The current password is incorrect.')
    await expect(current).toHaveAttribute('aria-invalid', 'true')

    await current.fill(user.password)
    await submit.click()
    await expect(page.getByText('Password changed')).toBeVisible()
    // Never left sitting in the form.
    await expect(current).toHaveValue('')
    await expect(next).toHaveValue('')

    // The old password no longer works, the new one does.
    const old = await logInThroughForm(browser, user.email, user.password)
    await expect(old.page).toHaveURL(/\/get-started/)
    await expect(old.page.locator('.ui-help.error').first()).toBeVisible()
    await old.context.close()

    const fresh = await logInThroughForm(browser, user.email, 'a-new-password-1')
    await expect(fresh.page).toHaveURL(new RegExp(`^${DASHBOARD_URL}`))
    await expect(fresh.page.getByRole('heading', { level: 1 })).toBeVisible()
    await fresh.context.close()
  })

  test('a Google-only owner sets a first password without a current one', async ({
    page,
    browser,
    owner,
  }) => {
    const { user } = await owner({ has_password: false })
    await page.goto('/account')

    await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible()
    await expect(page.getByText('You signed up with Google.', { exact: false })).toBeVisible()
    await expect(page.getByLabel(/^Current password\s*\*?$/)).toHaveCount(0)

    await page.getByLabel(/^Password\s*\*?$/).fill('first-password-1')
    await page.getByLabel(/^Confirm password\s*\*?$/).fill('first-password-1')
    await page.getByRole('button', { name: 'Set password' }).click()
    await expect(page.getByText('Password set')).toBeVisible()

    // Now it is a change, which asks for the one just set.
    await expect(page.getByRole('heading', { name: 'Password', exact: true })).toBeVisible()
    await expect(page.getByLabel(/^Current password\s*\*?$/)).toBeVisible()

    const fresh = await logInThroughForm(browser, user.email, 'first-password-1')
    await expect(fresh.page).toHaveURL(new RegExp(`^${DASHBOARD_URL}`))
    await fresh.context.close()
  })
})
