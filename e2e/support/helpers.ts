import { fileURLToPath } from 'node:url'
import type { Browser, Locator, Page } from '@playwright/test'
import { either, expect, type Owner } from './fixtures'
import { API_URL, DASHBOARD_URL } from './urls'

/** A file under e2e/support/files, for an upload field. */
export function fixtureFile(name: 'dish.jpg' | 'logo.png' | 'not-an-image.txt'): string {
  return fileURLToPath(new URL(`./files/${name}`, import.meta.url))
}

/**
 * Call the owner API as the signed-in browser does, CSRF token included, to
 * set something up (or break it) behind the page's back.
 */
export async function callApi(
  page: Page,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: object,
) {
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

/** Below Tailwind's `lg` the dashboard is a phone app: tabs at the bottom, no sidebar. */
export function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 1024
}

/**
 * The dashboard's navigation. On a computer, the sidebar. On a phone, the
 * More tab is opened and both are searched: the four tabs (Home, Menu, the
 * orders, More) and the More page, which lists every section but Home, so a
 * section a tab opens is found twice. On a phone Overview is "Home" and
 * Dishes is "Menu".
 */
export async function openSidebar(page: Page): Promise<Locator> {
  const sections = page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })
  if (!isPhone(page)) return sections
  const tabs = page.getByRole('navigation', { name: either('Sections', 'أقسام اللوحة') })
  await tabs.getByRole('button', { name: either('More', 'المزيد') }).click()
  await expect(sections).toBeVisible()
  return sections.or(tabs)
}

/** Back to the page that was open before `openSidebar`: on a phone that opened More. */
export async function closeSidebar(page: Page) {
  if (isPhone(page)) await page.goBack()
}

/**
 * The public menu's cart: its own column on a wide screen, a sheet opened
 * from the header on a phone.
 */
export async function openMenuCart(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) >= 1024) return page.locator('aside.col-aside')
  await page.locator('[data-open-cart]').first().click()
  const sheet = page.locator('#cart-sheet')
  await expect(sheet).toBeVisible()
  return sheet
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

/**
 * Picks the choice for one part of a build in the menu's dish sheet: its
 * own picker (a button opening a listbox), the part by its place from 0,
 * the choice by the start of its name.
 */
export async function pickPart(sheet: Locator, part: number, choice: string) {
  await sheet.locator('.build-pick-button').nth(part).click()
  await sheet
    .getByRole('listbox')
    .getByRole('option', { name: new RegExp(`^${choice}`) })
    .click()
  await expect(sheet.getByRole('listbox')).toBeHidden()
}
