import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { either, expect, test, type Owner, type ScenarioInput } from '../fixtures/test'
import { API_URL, DASHBOARD_URL } from '../support/urls'

const ONBOARDING_URL = `${API_URL}/onboarding`
const file = (name: string) => fileURLToPath(new URL(`../fixtures/files/${name}`, import.meta.url))

/** A name nobody else's test will pick, and the slug the wizard makes of it. */
function uniqueName(prefix: string) {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return {
    name: `${prefix} ${suffix}`,
    slug: `${prefix.toLowerCase().replace(/\s+/g, '-')}-${suffix}`,
  }
}

function wizard(page: Page) {
  return {
    name: page.getByLabel(/Restaurant name/),
    slug: page.getByLabel(/Menu link/),
    phone: page.locator('input[name="phone"]'),
    logo: page.locator('input[type="file"]#logo'),
    cover: page.locator('input[type="file"]#cover_image'),
    next: page.getByRole('button', { name: /^(Continue|Finish)$/ }),
    back: page.getByRole('button', { name: 'Back' }),
    step: (n: number) => expect(page.locator('.step-meta .num')).toHaveText(`0${n} / 03`),
    error: (text: string) => page.locator('.ui-help.error:visible', { hasText: text }),
  }
}

/** Signs in a brand-new user (no restaurant yet) and opens the wizard. */
async function startOnboarding(
  page: Page,
  scenario: (input?: ScenarioInput) => Promise<Owner>,
  signIn: (email: string) => Promise<void>,
) {
  const user = await scenario({ restaurant: false, onboarded: false })
  await signIn(user.user.email)
  await page.goto(ONBOARDING_URL)
  return user
}

test.describe('onboarding', () => {
  test('a new owner sets up the restaurant, picks a design and the dashboard unlocks @matrix', async ({
    page,
    scenario,
    signIn,
  }) => {
    await startOnboarding(page, scenario, signIn)
    const w = wizard(page)
    const { name, slug } = uniqueName('Cedar House')

    // Step 1 — name, and the menu link made from it and checked live.
    await w.step(1)
    await w.name.fill(name)
    await expect(w.slug).toHaveValue(slug)
    await expect(page.getByText('This link is available.')).toBeVisible()
    await w.next.click()

    // Step 2 — contact and currency.
    await w.step(2)
    await w.phone.fill('70 123 456')
    await page.locator('.ui-combo-control').click()
    await page.locator('.ui-combo-input').fill('EUR')
    await page.locator('.ui-menu-item', { hasText: 'Euro' }).click()
    await expect(page.locator('input[name="currency"]')).toHaveValue('EUR')
    await w.next.click()

    // Step 3 — branding: a logo is required, a cover is optional.
    await w.step(3)
    await w.logo.setInputFiles(file('logo.png'))
    await expect(page.locator('input[name="logo_key"]')).toHaveCount(1)
    await w.cover.setInputFiles(file('dish.jpg'))
    await expect(page.locator('input[name="cover_image_key"]')).toHaveCount(1)
    await w.next.click()

    // Into the dashboard, where only Design is open until one is chosen.
    await expect(page).toHaveURL(`${DASHBOARD_URL}/design`)
    // On a phone the sidebar is a drawer, opened from the top bar.
    const narrow = (page.viewportSize()?.width ?? 1440) < 1024
    const openNav = async () => {
      if (narrow) {
        await page.getByRole('button', { name: either('Open navigation', 'فتح القائمة') }).click()
      }
    }
    const nav = page.getByRole('navigation', { name: either('Dashboard', 'لوحة التحكم') })
    const categories = nav.getByRole('button', { name: either('Categories', 'الأقسام') })
    await openNav()
    await expect(categories).toBeDisabled()
    if (narrow) {
      await page
        .getByRole('button', { name: either('Close navigation', 'إغلاق القائمة') })
        .last()
        .click()
    }

    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: either('Classic', 'كلاسيك') }) })
      .getByRole('button', { name: either('Use this design', 'استخدم هذا التصميم') })
      .click()
    await expect(
      page.getByRole('button', { name: either('Currently in use', 'مُستخدم حاليًا') }),
    ).toBeVisible()

    await openNav()
    await expect(categories).toBeEnabled()
    await categories.click()
    await expect(page).toHaveURL(/\/categories$/)

    // The menu is live at the link chosen in step 1.
    const menu = await page.request.get(`${API_URL}/${slug}`)
    expect(menu.status()).toBe(200)
    expect(await menu.text()).toContain(name)
  })

  test('a link someone already has is shown as taken and cannot be used', async ({
    page,
    scenario,
    signIn,
  }) => {
    const { slug: taken } = uniqueName('Taken')
    await scenario({ slug: taken })
    await startOnboarding(page, scenario, signIn)
    const w = wizard(page)

    await w.name.fill('Somewhere New')
    await w.slug.fill(taken)

    await expect(
      page.getByText('This link is already taken — try something different.'),
    ).toBeVisible()
    await w.next.click()
    await expect(w.error('This link is already taken. Please choose another.')).toBeVisible()
    await w.step(1)

    await w.slug.fill(`${taken}-2`)
    await expect(page.getByText('This link is available.')).toBeVisible()
    await w.next.click()
    await w.step(2)
  })

  test('characters a link cannot hold are turned into a valid link as they are typed', async ({
    page,
    scenario,
    signIn,
  }) => {
    await startOnboarding(page, scenario, signIn)
    const w = wizard(page)

    await w.slug.pressSequentially('Café Ñame/ #1!')
    await expect(w.slug).toHaveValue('caf-ame-1')

    // A name alone is not enough; the step asks for it.
    await w.next.click()
    await expect(w.error('Restaurant name is required.')).toBeVisible()
    await w.name.fill('A')
    await w.next.click()
    await expect(w.error('Restaurant name must be at least 2 characters.')).toBeVisible()
    await w.step(1)
  })

  test('the phone is required and checked, then Back and Continue keep every value', async ({
    page,
    scenario,
    signIn,
  }) => {
    await startOnboarding(page, scenario, signIn)
    const w = wizard(page)
    const { name, slug } = uniqueName('Olive Tree')

    await w.name.fill(name)
    await expect(page.getByText('This link is available.')).toBeVisible()
    await w.next.click()
    await w.step(2)

    await w.phone.fill('')
    await w.next.click()
    await expect(w.error('Phone number is required.')).toBeVisible()

    await w.phone.fill('12')
    await w.next.click()
    await expect(w.error('Please enter a valid phone number using digits only.')).toBeVisible()

    // Letters never reach the field.
    await w.phone.fill('')
    await w.phone.pressSequentially('71abc 222 333')
    await expect(w.phone).toHaveValue('71 222 333')
    await w.next.click()
    await w.step(3)

    await w.back.click()
    await w.step(2)
    await expect(w.phone).toHaveValue('71 222 333')

    await w.back.click()
    await w.step(1)
    await expect(w.name).toHaveValue(name)
    await expect(w.slug).toHaveValue(slug)

    await w.next.click()
    await w.step(2)
    await w.next.click()
    await w.step(3)

    // A reload resumes at the furthest step reached, with the saved values.
    await page.reload()
    await w.step(3)
    await w.back.click()
    await expect(w.phone).toHaveValue('71 222 333')
  })

  test('the logo is required, and a file that is not an image is refused', async ({
    page,
    scenario,
    signIn,
  }) => {
    await startOnboarding(page, scenario, signIn)
    const w = wizard(page)
    const { name } = uniqueName('Blue Door')

    await w.name.fill(name)
    await expect(page.getByText('This link is available.')).toBeVisible()
    await w.next.click()
    await w.phone.fill('70 123 456')
    await w.next.click()
    await w.step(3)

    await w.next.click()
    await expect(w.error('Please upload a logo to continue.')).toBeVisible()

    await w.logo.setInputFiles(file('not-an-image.txt'))
    await expect(
      page.getByText('Only JPG, PNG and WebP are allowed. GIFs and videos are not permitted.'),
    ).toBeVisible()
    await expect(page.locator('input[name="logo_key"]')).toHaveCount(0)
    await w.next.click()
    await expect(w.error('Please upload a logo to continue.')).toBeVisible()
    await expect(page).toHaveURL(ONBOARDING_URL)

    // Without a cover (it is optional), a logo is enough to finish.
    await w.logo.setInputFiles(file('logo.png'))
    await expect(page.locator('input[name="logo_key"]')).toHaveCount(1)
    await w.next.click()
    await expect(page).toHaveURL(`${DASHBOARD_URL}/design`)
  })

  test('a finished owner opening the wizard again goes to the dashboard', async ({
    page,
    owner,
  }) => {
    await owner()

    await page.goto(ONBOARDING_URL)

    await expect(page).toHaveURL(`${DASHBOARD_URL}/overview`)
  })
})
