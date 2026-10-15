import { expect, test } from '../../support/fixtures'
import { API_URL } from '../../support/urls'

/**
 * A request the host's bot protection refuses is said to be the hosting,
 * with the way past it, never "check your internet"; a phone that really
 * cannot reach the site is told so. (The refusal the browser hides, no
 * answer while the site still answers, is in session-gate.test.tsx: a routed
 * request here breaks the probe itself.)
 */
test.describe('connection', () => {
  test("the hosting's refusal is said to be the hosting, with the way past it", async ({
    page,
    owner,
  }) => {
    await owner({ package: 'free' })
    await page.route(`${API_URL}/api/user`, (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted',
        }),
      }),
    )

    await page.goto('/overview')

    await expect(page.getByText("Our hosting's security stopped your connection")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open qayema.com' })).toBeVisible()
  })

  test('a phone that cannot reach the site at all is told its connection is the problem', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'free' })
    await page.route(`${API_URL}/api/user`, (route) => route.abort('internetdisconnected'))
    await page.route(`${API_URL}/favicon.ico`, (route) => route.abort('internetdisconnected'))

    await page.goto('/overview')

    await expect(page.getByText('We could not load your account')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText("Our hosting's security stopped your connection")).toHaveCount(0)
  })
})
