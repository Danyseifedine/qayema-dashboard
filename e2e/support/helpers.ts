import { fileURLToPath } from 'node:url'
import type { Browser, Locator, Page } from '@playwright/test'
import { either, test, type Owner } from './fixtures'
import { API_URL, DASHBOARD_URL } from './urls'

/** A file under e2e/support/files, for an upload field. */
export function fixtureFile(name: 'dish.jpg' | 'logo.png' | 'not-an-image.txt'): string {
  return fileURLToPath(new URL(`./files/${name}`, import.meta.url))
}

/**
 * Call the owner API as the signed-in browser does, CSRF token included, to
 * set something up (or break it) behind the page's back.
 */
export async function callApi(page: Page, method: 'POST' | 'DELETE', path: string, data?: object) {
  const request = page.context().request
  const headers = {
    Accept: 'application/json',
    Origin: DASHBOARD_URL,
    Referer: `${DASHBOARD_URL}/`,
  }
  const csrf = await request.get(`${API_URL}/api/csrf-token`, { headers })
  const { token } = (await csrf.json()) as { token: string }
  return request.fetch(`${API_URL}${path}`, {
    method,
    data,
    headers: { ...headers, 'X-CSRF-TOKEN': token },
  })
}

/** The dashboard's sidebar, opened first on a phone where it is a drawer. */
export async function openSidebar(page: Page) {
  if (test.info().project.name === 'phone') {
    await page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') }).click()
  }
  return page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })
}

/** The owner's public menu in a separate, signed-out browser. */
export async function guestMenu(browser: Browser, owner: Owner, query = ''): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(`${owner.restaurant.public_url}${query}`)
  return guest
}

/**
 * A locked feature's card (LockedState), found by its title. The package
 * chip sits above the title, so check the card, not the heading, for it.
 */
export function lockedCard(page: Page, title: string | RegExp): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .last()
}
