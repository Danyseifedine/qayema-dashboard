import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { API_URL, DASHBOARD_URL } from '../../support/urls'
import { either, expect, test } from '../../support/fixtures'
import { lockedCard, openSidebar } from '../../support/helpers'

type QrOptions = {
  data: string
  qrOptions: { errorCorrectionLevel: string }
  dotsOptions: {
    type: string
    color?: string
    gradient?: { type: string; colorStops: { offset: number; color: string }[] }
  }
  cornersSquareOptions: { type: string; color: string }
  cornersDotOptions: { type: string; color: string }
  backgroundOptions: { color: string }
  image?: string
  imageOptions?: { imageSize: number }
}

/** What the menu's QR pop-up and the printable card draw, from the public endpoint. */
async function publicOptions(page: Page, slug: string): Promise<QrOptions> {
  const response = await page.request.get(`${API_URL}/${slug}/qr-options`, {
    headers: { Accept: 'application/json' },
  })
  expect(response.ok()).toBeTruthy()
  return ((await response.json()) as { data: QrOptions }).data
}

const PLAIN = {
  dotsOptions: { type: 'square', color: '#000000' },
  cornersSquareOptions: { type: 'square', color: '#000000' },
  cornersDotOptions: { type: 'square', color: '#000000' },
  backgroundOptions: { color: '#FFFFFF' },
}

test.describe('QR code', () => {
  test('a premium owner styles the code, saves it and the menu follows @matrix', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium' })
    await page.goto('/qr')

    await expect(
      page.getByRole('img', { name: either("Your menu's QR code", 'رمز QR لقائمتك') }),
    ).toBeVisible()
    const dots = page.getByRole('group', { name: either('Dots', 'النقاط') })
    await dots.getByText(either('Extra rounded', 'مستدير جدًا')).click()
    await expect(
      dots.getByRole('radio', { name: either('Extra rounded', 'مستدير جدًا') }),
    ).toBeChecked()
    await page.getByRole('textbox', { name: either('Dots', 'النقاط') }).fill('#1F6FEB')

    const save = page.getByRole('button', { name: either('Save', 'حفظ') })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByText(either('QR code saved', 'تم حفظ رمز QR'))).toBeVisible()
    await expect(save).toBeDisabled()

    await page.reload()
    await expect(
      dots.getByRole('radio', { name: either('Extra rounded', 'مستدير جدًا') }),
    ).toBeChecked()
    await expect(page.getByRole('textbox', { name: either('Dots', 'النقاط') })).toHaveValue(
      '#1F6FEB',
    )

    const options = await publicOptions(page, restaurant.slug)
    expect(options.dotsOptions).toEqual({ type: 'extra-rounded', color: '#1F6FEB' })
    // The link never changes with the design.
    expect(options.data).toBe(`${restaurant.public_url}?qr=1`)
  })

  test('every part of the design reaches the card, the menu pop-up and the options', async ({
    page,
    browser,
    owner,
  }) => {
    const { restaurant } = await owner({ package: 'premium', logo: true })
    await page.goto('/qr')

    // Colours, with a radial gradient.
    await page.getByRole('textbox', { name: 'Dots', exact: true }).fill('#123456')
    await page.getByRole('textbox', { name: 'Background', exact: true }).fill('#FFFDF5')
    await page.getByRole('textbox', { name: 'Corner frames', exact: true }).fill('#1A2B3C')
    await page.getByRole('textbox', { name: 'Corner centres', exact: true }).fill('#0B3D2E')
    const gradient = page.getByRole('switch', { name: 'Gradient' })
    await gradient.click()
    await expect(gradient).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('textbox', { name: 'Second colour', exact: true }).fill('#5B21B6')
    await page
      .getByRole('group', { name: 'Direction' })
      .getByText('From the centre', { exact: true })
      .click()

    // Shapes.
    await page
      .getByRole('group', { name: 'Dots' })
      .getByText('Classy rounded', { exact: true })
      .click()
    await page
      .getByRole('group', { name: 'Corner frames' })
      .getByText('Circle', { exact: true })
      .click()
    await page
      .getByRole('group', { name: 'Corner centres' })
      .getByText('Circle', { exact: true })
      .click()

    // The logo, large.
    const logo = page.getByRole('switch', { name: 'Your logo in the middle' })
    await expect(logo).toBeEnabled()
    await logo.click()
    await page.getByRole('group', { name: 'Logo size' }).getByText('Large', { exact: true }).click()

    // The card.
    await page
      .getByRole('group', { name: 'Card', exact: true })
      .getByText('Dark', { exact: true })
      .click()
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Table card title')
    await page.getByRole('textbox', { name: 'Subtitle' }).fill('Grills since 1990')
    await page.getByRole('textbox', { name: 'Call to action' }).fill('Point your camera here')
    const showUrl = page.getByRole('switch', { name: 'Show the link under the code' })
    await showUrl.click()
    await expect(showUrl).toHaveAttribute('aria-checked', 'false')

    // Unsaved, the card still shows the saved design, and says so.
    await expect(
      page.getByText('The card shows your saved design.', { exact: false }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('QR code saved')).toBeVisible()
    await expect(page.getByText('The card shows your saved design.', { exact: false })).toBeHidden()

    // A reload keeps every choice.
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Dots', exact: true })).toHaveValue('#123456')
    await expect(page.getByRole('textbox', { name: 'Second colour', exact: true })).toHaveValue(
      '#5B21B6',
    )
    await expect(
      page
        .getByRole('group', { name: 'Direction' })
        .getByRole('radio', { name: 'From the centre' }),
    ).toBeChecked()
    await expect(
      page.getByRole('group', { name: 'Dots' }).getByRole('radio', { name: 'Classy rounded' }),
    ).toBeChecked()
    await expect(
      page.getByRole('group', { name: 'Corner frames' }).getByRole('radio', { name: 'Circle' }),
    ).toBeChecked()
    await expect(
      page.getByRole('group', { name: 'Logo size' }).getByRole('radio', { name: 'Large' }),
    ).toBeChecked()
    await expect(
      page.getByRole('group', { name: 'Card', exact: true }).getByRole('radio', { name: 'Dark' }),
    ).toBeChecked()
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
      'Table card title',
    )
    await expect(showUrl).toHaveAttribute('aria-checked', 'false')

    // The options the card and the menu draw from.
    const options = await publicOptions(page, restaurant.slug)
    expect(options).toMatchObject({
      data: `${restaurant.public_url}?qr=1`,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: {
        type: 'classy-rounded',
        gradient: {
          type: 'radial',
          colorStops: [
            { offset: 0, color: '#123456' },
            { offset: 1, color: '#5B21B6' },
          ],
        },
      },
      cornersSquareOptions: { type: 'dot', color: '#1A2B3C' },
      cornersDotOptions: { type: 'dot', color: '#0B3D2E' },
      backgroundOptions: { color: '#FFFDF5' },
      imageOptions: { imageSize: 0.45 },
    })
    expect(options.image).toMatch(/^data:image\/png;base64,/)

    // The printable card opens from the page, in the saved design.
    const [card] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: 'Open the printable table card' }).click(),
    ])
    await expect(card).toHaveURL(`${restaurant.public_url}/qr`)
    await expect(card.locator('.card')).toHaveClass(/theme-dark/)
    await expect(card.getByText('Table card title')).toBeVisible()
    await expect(card.getByText('Grills since 1990')).toBeVisible()
    await expect(card.getByText('Point your camera here')).toBeVisible()
    await expect(card.locator('.url')).toHaveCount(0)
    const drawn = card.getByRole('img', { name: 'QR code for the menu' }).locator('svg')
    await expect(drawn).toBeVisible()
    await expect(drawn.locator('stop[stop-color="#5B21B6"]').first()).toBeAttached()
    await expect(drawn.locator('image')).toBeAttached()
    await card.close()

    // A guest's "Share menu" pop-up draws the same code.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const guest = await context.newPage()
    await guest.goto(restaurant.public_url)
    const fetched = guest.waitForResponse((response) => response.url().endsWith('/qr-options'))
    await guest.getByRole('button', { name: 'Share menu' }).click()
    expect(((await (await fetched).json()) as { data: QrOptions }).data).toEqual(options)
    const popup = guest.locator('#pop-qr')
    await expect(popup.getByRole('heading', { name: 'Scan to open this menu' })).toBeVisible()
    const menuCode = popup.getByRole('img', { name: 'QR code for the menu' }).locator('svg')
    await expect(menuCode).toBeVisible()
    await expect(menuCode.locator('stop[stop-color="#5B21B6"]').first()).toBeAttached()
    await context.close()
  })

  test('Reset to simple puts back the plain code but keeps the card text', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'premium',
      qr_settings: {
        dot_style: 'dots',
        dot_color: '#7C3AED',
        corner_style: 'dot',
        eye_style: 'dot',
        title: 'Kept title',
      },
    })
    await page.goto('/qr')
    await expect(page.getByRole('textbox', { name: 'Dots', exact: true })).toHaveValue('#7C3AED')

    const save = page.getByRole('button', { name: 'Save' })
    await expect(save).toBeDisabled()
    await page.getByRole('button', { name: 'Reset to simple' }).click()
    await expect(page.getByRole('textbox', { name: 'Dots', exact: true })).toHaveValue('#000000')
    await expect(
      page.getByRole('group', { name: 'Dots' }).getByRole('radio', { name: 'Square' }),
    ).toBeChecked()
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
      'Kept title',
    )
    await save.click()
    await expect(page.getByText('QR code saved')).toBeVisible()

    expect(await publicOptions(page, restaurant.slug)).toMatchObject({
      ...PLAIN,
      qrOptions: { errorCorrectionLevel: 'M' },
    })
  })

  test('the code downloads as PNG and SVG, and the link copies', async ({ page, owner }) => {
    const { restaurant } = await owner({ package: 'premium' })
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: DASHBOARD_URL,
    })
    await page.goto('/qr')
    await expect(page.getByText(`127.0.0.1/${restaurant.slug}`)).toBeVisible()

    for (const extension of ['png', 'svg'] as const) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: extension.toUpperCase(), exact: true }).click(),
      ])
      expect(download.suggestedFilename()).toBe(`${restaurant.slug}-qr.${extension}`)
      const file = await readFile((await download.path())!)
      expect(file.byteLength).toBeGreaterThan(500)
      if (extension === 'png') {
        expect(file.subarray(1, 4).toString('latin1')).toBe('PNG')
      } else {
        expect(file.toString('utf8')).toContain('<svg')
      }
    }

    // A link shared by hand is not a scan, so the copy leaves out ?qr=1.
    await page.getByRole('button', { name: 'Copy link' }).click()
    await expect(page.getByText('Link copied')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(restaurant.public_url)
  })

  test('a colour too close to the background warns that it may not scan', async ({
    page,
    owner,
  }) => {
    await owner({ package: 'premium' })
    await page.goto('/qr')

    const warning = page.getByText('This may not scan')
    await expect(warning).toBeHidden()
    await page.getByRole('textbox', { name: 'Dots', exact: true }).fill('#FFE066')
    await expect(warning).toBeVisible()
    await expect(
      page.getByText('The dots is too close to the background colour', { exact: false }),
    ).toBeVisible()

    await page.getByRole('textbox', { name: 'Corner centres', exact: true }).fill('#EA4335')
    await expect(
      page.getByText('The dots and corner centres are too close', { exact: false }),
    ).toBeVisible()

    // Dark colours read again.
    await page.getByRole('textbox', { name: 'Dots', exact: true }).fill('#111111')
    await page.getByRole('textbox', { name: 'Corner centres', exact: true }).fill('#111111')
    await expect(warning).toBeHidden()
  })

  test('card text as long as the fields allow stays inside the card', async ({ page, owner }) => {
    // One unbroken word per line, at each field's maximum length.
    const { restaurant } = await owner({
      package: 'premium',
      qr_settings: { title: 'W'.repeat(60), subtitle: 'x'.repeat(80), cta: 'x'.repeat(60) },
    })
    await page.goto(`${restaurant.public_url}/qr`)

    const card = page.locator('.card')
    await expect(card.locator('.cta')).toHaveText('x'.repeat(60))
    const bounds = await card.boundingBox()

    for (const line of ['.title', '.subtitle', '.cta', '.url']) {
      const box = await card.locator(line).boundingBox()
      expect(box, line).not.toBeNull()
      expect(box!.x, line).toBeGreaterThanOrEqual(bounds!.x)
      expect(box!.x + box!.width, line).toBeLessThanOrEqual(bounds!.x + bounds!.width)
      expect(
        await card.locator(line).evaluate((element) => element.scrollWidth <= element.clientWidth),
        line,
      ).toBe(true)
    }
  })

  test('switching the gradient or the logo off takes it off the preview', async ({
    page,
    owner,
  }) => {
    // The drawing library's update() merged, so both stayed on the code.
    await owner({ package: 'premium', logo: true })
    await page.goto('/qr')
    const preview = page.getByRole('img', { name: "Your menu's QR code" })
    const gradients = preview.locator('linearGradient, radialGradient')
    const logos = preview.locator('image')

    const gradient = page.getByRole('switch', { name: 'Gradient' })
    await gradient.click()
    await expect(gradients).not.toHaveCount(0)
    await gradient.click()
    await expect(gradient).toHaveAttribute('aria-checked', 'false')
    await expect(gradients).toHaveCount(0)

    const logo = page.getByRole('switch', { name: 'Your logo in the middle' })
    await logo.click()
    await expect(logos).toHaveCount(1)
    await logo.click()
    await expect(logo).toHaveAttribute('aria-checked', 'false')
    await expect(logos).toHaveCount(0)
    await expect(preview.locator('svg')).toHaveCount(1)
  })

  test('the logo switch waits for a logo', async ({ page, owner }) => {
    await owner({ package: 'premium' })
    await page.goto('/qr')

    await expect(page.getByRole('switch', { name: 'Your logo in the middle' })).toBeDisabled()
    await expect(page.getByText('Add a logo on the Restaurant page first.')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Logo size' })).toHaveCount(0)
  })

  test('a free owner gets the plain code, the studio locked and no scan counts', async ({
    page,
    owner,
    expectAccessible,
  }) => {
    const { restaurant } = await owner({ package: 'free', visits: 3, qr_scans: 2 })
    await page.goto('/qr')

    await expect(page.getByRole('img', { name: "Your menu's QR code" })).toBeVisible()
    await expect(lockedCard(page, /Make the code your own/)).toContainText('Premium')
    await expect(page.getByText('Your logo in the middle')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
    await expect(page.getByText('Scans', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Open the printable table card' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'PNG', exact: true })).toBeEnabled()
    await expectAccessible()

    // Without the studio there is no printable card, and the menu draws the plain code.
    const card = await page.request.get(`${restaurant.public_url}/qr`)
    expect(card.status()).toBe(404)
    expect(await publicOptions(page, restaurant.slug)).toMatchObject(PLAIN)

    await page.getByRole('button', { name: 'See packages' }).click()
    await expect(page).toHaveURL(/\/package$/)
  })

  test('a pro owner sees scan counts but the studio stays locked', async ({ page, owner }) => {
    await owner({ package: 'pro', visits: 6, qr_scans: 4 })
    await page.goto('/qr')

    await expect(page.getByText('Scans', { exact: true })).toBeVisible()
    await expect(page.locator('dl > div').filter({ hasText: 'All time' })).toContainText('4')
    await expect(lockedCard(page, /Make the code your own/)).toContainText('Premium')
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  })

  test('QR Studio switched off and on shows on the QR page at once, with no reload', async ({
    page,
    owner,
  }) => {
    // Invalidated only, the QR page opened on its old copy until the refetch
    // landed. Holding the refetch catches that copy on screen.
    await owner({ package: 'premium' })
    await page.goto('/qr')
    // The studio's own sections; "Make the code your own" is the locked one.
    const studio = page.getByRole('heading', { name: 'Colours', exact: true })
    const off = page.getByText('QR Studio is switched off')
    await expect(studio).toBeVisible()

    const open = async (name: string) => {
      const nav = await openSidebar(page)
      await nav.getByRole('button', { name, exact: true }).click()
    }
    const holdTheQrPage = async () => {
      let release = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/qr', async (route) => {
        await held
        await route.continue()
      })
      return async () => {
        release()
        // Waits for the held request to go through before dropping the hold.
        await page.unrouteAll({ behavior: 'wait' })
      }
    }
    const flipQrStudio = async (to: 'true' | 'false') => {
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/features') && response.request().method() === 'PUT',
      )
      await page.getByRole('switch', { name: 'QR Studio on' }).click()
      expect((await saved).ok()).toBeTruthy()
      await expect(page.getByRole('switch', { name: 'QR Studio on' })).toHaveAttribute(
        'aria-checked',
        to,
      )
    }

    // Off: back on the QR page, the old studio never shows.
    await open('Features')
    await flipQrStudio('false')
    let release = await holdTheQrPage()
    await open('QR code')
    await expect(studio).toHaveCount(0)
    await release()
    await expect(off).toBeVisible()
    await expect(studio).toHaveCount(0)

    // On again: the old "switched off" never shows.
    await open('Features')
    await flipQrStudio('true')
    release = await holdTheQrPage()
    await open('QR code')
    await expect(off).toHaveCount(0)
    await release()
    await expect(studio).toBeVisible()
  })

  test('with QR Studio switched off the page points to Features', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'premium',
      switched_off: ['qr'],
      qr_settings: { dot_style: 'dots', dot_color: '#7C3AED' },
    })
    await page.goto('/qr')

    await expect(page.getByText('QR Studio is switched off')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Make the code your own/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
    // The design is kept, but the menu draws the plain code meanwhile.
    expect(await publicOptions(page, restaurant.slug)).toMatchObject(PLAIN)

    await page.getByRole('button', { name: 'Open Features' }).click()
    await expect(page).toHaveURL(/\/features$/)
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/features') && response.request().method() === 'PUT',
    )
    await page.getByRole('switch', { name: 'QR Studio on' }).click()
    expect((await saved).ok()).toBeTruthy()
    await expect(page.getByRole('switch', { name: 'QR Studio on' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await page.goto('/qr')
    await expect(page.getByRole('textbox', { name: 'Dots', exact: true })).toHaveValue('#7C3AED')
    expect((await publicOptions(page, restaurant.slug)).dotsOptions).toEqual({
      type: 'dots',
      color: '#7C3AED',
    })
  })
})
