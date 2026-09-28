import type { Page, Route } from '@playwright/test'
import { either, expect, test } from '../fixtures/test'
import { API_URL } from '../support/urls'

const CATEGORIES_API = `${API_URL}/api/categories`

/** Fails a request the way the API would, only for the method given. */
function failing(method: string, status: number, body: object) {
  return (route: Route) =>
    route.request().method() === method ? route.fulfill({ status, json: body }) : route.fallback()
}

async function openNewCategory(page: Page) {
  await page.goto('/categories')
  await page.getByRole('button', { name: 'Add category' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'New category' })).toBeVisible()
  return dialog
}

test.describe('errors', () => {
  test('a page whose data fails to load says so, and Try again recovers @matrix', async ({
    page,
    owner,
  }) => {
    await owner({ categories: [{ name: { en: 'Grills' } }] })
    await page.route(
      CATEGORIES_API,
      failing('GET', 500, { message: 'Server Error', code: 'server_error' }),
    )

    await page.goto('/categories')

    const alert = page.getByRole('alert').filter({ hasText: /That did not load|تعذّر التحميل/ })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await expect(alert).toContainText('Server Error')
    await expect(page.getByText('Grills')).toHaveCount(0)

    await page.unroute(CATEGORIES_API)
    await alert.getByRole('button', { name: either('Try again', 'حاول مجددًا') }).click()

    await expect(page.getByText('Grills')).toBeVisible()
    await expect(alert).toHaveCount(0)
  })

  test('a request that never reaches the server is explained as a connection problem', async ({
    page,
    owner,
  }) => {
    await owner({ categories: [{ name: { en: 'Grills' } }] })
    await page.route(CATEGORIES_API, (route) =>
      route.request().method() === 'GET' ? route.abort('internetdisconnected') : route.fallback(),
    )

    await page.goto('/categories')

    const alert = page.getByRole('alert').filter({ hasText: 'That did not load' })
    await expect(alert).toContainText(
      'We could not reach the server. Check your connection and try again.',
      { timeout: 20_000 },
    )

    await page.unroute(CATEGORIES_API)
    await alert.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('Grills')).toBeVisible()
  })

  test('when the account itself cannot load, the owner can try again', async ({ page, owner }) => {
    await owner()
    const user = `${API_URL}/api/user`
    await page.route(user, failing('GET', 503, { message: 'Service Unavailable', code: 'down' }))

    await page.goto('/overview')

    await expect(page.getByText('We could not load your account')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Service Unavailable')).toBeVisible()

    await page.unroute(user)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()
  })

  test('a link the server would reject is caught before it is sent', async ({ page, owner }) => {
    await owner()
    await page.goto('/social-links')

    await page.getByRole('button', { name: 'Add your first link' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'Platform' }).click()
    await page.getByRole('option', { name: 'Instagram' }).click()
    // A URL to the browser, but not to the server: a path cannot hold a space.
    await dialog.getByLabel('Link').fill('https://instagram.com/e2e kitchen')

    let posted = false
    page.on('request', (request) => {
      if (request.url() === `${API_URL}/api/social-links` && request.method() === 'POST') {
        posted = true
      }
    })
    await dialog.getByRole('button', { name: 'Add link' }).click()

    const link = dialog.getByLabel('Link')
    await expect(link).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByText('Enter the full link, starting with https://')).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(posted).toBe(false)
  })

  test('a 422 on a nested field lands under that field', async ({ page, owner }) => {
    await owner()
    await page.route(
      CATEGORIES_API,
      failing('POST', 422, {
        message: 'A category with this name already exists.',
        code: 'validation_failed',
        errors: { 'name.en': ['A category with this name already exists.'] },
      }),
    )
    const dialog = await openNewCategory(page)

    await dialog.getByLabel('Name').fill('Grills')
    await dialog.getByRole('button', { name: 'Add category' }).click()

    await expect(dialog.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByText('A category with this name already exists.')).toBeVisible()
    await expect(dialog.getByLabel('Name')).toHaveValue('Grills')
  })

  test('a rate limit says how long to wait', async ({ page, owner }) => {
    await owner()
    await page.route(
      CATEGORIES_API,
      failing('POST', 429, {
        message: 'Too Many Attempts.',
        code: 'too_many_requests',
        retry_after: 42,
      }),
    )
    const dialog = await openNewCategory(page)

    await dialog.getByLabel('Name').fill('Grills')
    await dialog.getByRole('button', { name: 'Add category' }).click()

    const toast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Could not add that category' })
    await expect(toast).toContainText('Too many requests. Try again in 42 seconds.')
    // The form keeps what was typed so it can be sent again.
    await expect(dialog.getByLabel('Name')).toHaveValue('Grills')
    await expect(dialog.getByRole('button', { name: 'Add category' })).toBeEnabled()
  })

  test('double-clicking save sends one request and adds one category', async ({ page, owner }) => {
    await owner()
    const dialog = await openNewCategory(page)
    await dialog.getByLabel('Name').fill('Only once')

    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url() === CATEGORIES_API) posts.push(request.url())
    })

    await dialog.getByRole('button', { name: 'Add category' }).dblclick()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Only once')).toHaveCount(1)
    await page.reload()
    await expect(page.getByText('Only once')).toHaveCount(1)
    expect(posts).toHaveLength(1)
  })
})
