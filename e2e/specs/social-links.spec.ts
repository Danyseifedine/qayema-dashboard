import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type Owner } from '../fixtures/test'

/** The public menu as a guest sees it, in a browser of their own. */
async function guestMenu(browser: Browser, owner: Owner): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const guest = await context.newPage()
  await guest.goto(owner.restaurant.public_url)
  return guest
}

/** Picks an option in a Combobox. */
async function choose(page: Page, combobox: ReturnType<Page['getByRole']>, option: string) {
  await combobox.click()
  await page.getByRole('option', { name: option, exact: true }).click()
  await expect(combobox).toHaveValue(option)
}

const ADD = either('Add link', 'إضافة رابط')

test.describe('social links', () => {
  test('an owner adds a link and it shows on the public menu @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'pro' })
    await page.goto('/social-links')

    await expect(
      page.getByText(either('No social links yet', 'لا توجد روابط تواصل بعد')),
    ).toBeVisible()
    await expect(page.getByText('0 / 2')).toBeVisible()
    await page.getByRole('button', { name: ADD }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: either('Add a social link', 'إضافة رابط تواصل') }),
    ).toBeVisible()
    const platform = dialog.getByRole('combobox', { name: /Platform|المنصة/ })
    await expect(platform).toHaveValue('Instagram')
    await choose(page, platform, 'Facebook')

    const link = dialog.getByRole('textbox', { name: /Link|الرابط/ })
    // Without the scheme it is not a link a guest's phone can open.
    await link.fill('facebook.com/e2e-kitchen')
    await dialog.getByRole('button', { name: either('Add link', 'إضافة الرابط') }).click()
    await expect(
      dialog.getByText(
        either(
          'Enter the full link, starting with https://',
          'أدخل الرابط كاملًا، بدءًا بـ https://',
        ),
      ),
    ).toBeVisible()

    await link.fill('https://facebook.com/e2e-kitchen')
    await dialog.getByRole('button', { name: either('Add link', 'إضافة الرابط') }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByText('Facebook', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /facebook\.com\/e2e-kitchen/ })).toHaveAttribute(
      'href',
      'https://facebook.com/e2e-kitchen',
    )
    await expect(page.getByText('1 / 2')).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await guest.getByRole('button', { name: 'WhatsApp' }).click()
    const popup = guest.locator('#pop-contact')
    await expect(popup.getByText('Follow us')).toBeVisible()
    await expect(popup.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://facebook.com/e2e-kitchen',
    )
    await guest.context().close()
  })

  test('an owner edits a link, then removes it after confirming', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'pro',
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/old-handle' }],
    })
    await page.goto('/social-links')

    await page.getByRole('button', { name: 'Edit Instagram link' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Edit link' })
    const link = dialog.getByRole('textbox', { name: /Link/ })
    await expect(link).toHaveValue('https://instagram.com/old-handle')
    await link.fill('https://instagram.com/new-handle')
    await dialog.getByRole('button', { name: 'Save link' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Link saved')).toBeVisible()
    await expect(page.getByRole('link', { name: /instagram\.com\/new-handle/ })).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('#pop-contact a.is-instagram')).toHaveAttribute(
      'href',
      'https://instagram.com/new-handle',
    )

    // Backing out of the confirm keeps it.
    await page.getByRole('button', { name: 'Remove Instagram link' }).click()
    const confirm = page.getByRole('dialog').filter({ hasText: 'Remove this link?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('Instagram', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Remove Instagram link' }).click()
    await confirm.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('No social links yet')).toBeVisible()
    await expect(page.getByText('0 / 2')).toBeVisible()

    await guest.reload()
    await expect(guest.locator('#pop-contact a.is-instagram')).toHaveCount(0)
    await guest.context().close()
  })

  test('only http and https links are accepted', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/social-links')
    await page.getByRole('button', { name: 'Add link' }).first().click()

    const dialog = page.getByRole('dialog')
    const link = dialog.getByRole('textbox', { name: /Link/ })
    const submit = dialog.getByRole('button', { name: 'Add link' })

    await submit.click()
    await expect(dialog.getByText('Enter the full link, starting with https://')).toBeVisible()

    await link.fill('javascript:alert(1)')
    await submit.click()
    await expect(dialog.getByText('A link must start with http:// or https://')).toBeVisible()

    await link.fill('ftp://files.example.com/menu')
    await submit.click()
    await expect(dialog.getByText('A link must start with http:// or https://')).toBeVisible()

    // Cancelling adds nothing.
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('No social links yet')).toBeVisible()
  })

  test('a platform already used is not offered again', async ({ page, owner }) => {
    await owner({
      package: 'pro',
      social_links: [{ platform: 'instagram', url: 'https://instagram.com/e2e' }],
    })
    await page.goto('/social-links')
    await page.getByRole('button', { name: 'Add link' }).click()

    const platform = page.getByRole('dialog').getByRole('combobox', { name: /Platform/ })
    await expect(platform).toHaveValue('X')
    await platform.click()
    await expect(page.getByRole('option')).toHaveText(['X', 'Facebook', 'TikTok'])
  })

  test('a free package allows one link: Add is disabled at the limit', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    await owner({
      package: 'free',
      social_links: [{ platform: 'tiktok', url: 'https://tiktok.com/@e2e' }],
    })
    await page.goto('/social-links')

    await expect(page.getByText('1 / 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add link' })).toBeDisabled()
    await expect(
      page.getByText('You have used every social link your plan allows.', { exact: false }),
    ).toBeVisible()
    await expectAccessible()

    // Removing one opens the way again.
    await page.getByRole('button', { name: 'Remove TikTok link' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Add link' })).toBeEnabled()
    await expect(
      page.getByText('You have used every social link your plan allows.', { exact: false }),
    ).toBeHidden()
  })

  test('with every platform used, Add is disabled and editing still works', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      social_links: [
        { platform: 'instagram', url: 'https://instagram.com/e2e' },
        { platform: 'x', url: 'https://x.com/e2e' },
        { platform: 'facebook', url: 'https://facebook.com/e2e' },
        { platform: 'tiktok', url: 'https://tiktok.com/@e2e' },
      ],
    })
    await page.goto('/social-links')

    await expect(page.getByText('4 / 10')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add link' })).toBeDisabled()
    await expect(
      page.getByText('Every platform your menu can show already has a link.', { exact: false }),
    ).toBeVisible()
    // Not the package limit, so that warning stays away.
    await expect(
      page.getByText('You have used every social link your plan allows.', { exact: false }),
    ).toBeHidden()

    // Editing one offers only its own platform.
    await page.getByRole('button', { name: 'Edit X link' }).click()
    const platform = page.getByRole('dialog').getByRole('combobox', { name: /Platform/ })
    await expect(platform).toHaveValue('X')
    await platform.click()
    await expect(page.getByRole('option')).toHaveText(['X'])
  })
})
