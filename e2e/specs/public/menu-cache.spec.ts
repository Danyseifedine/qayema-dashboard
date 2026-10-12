import type { Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * What lets Cloudflare keep a guest's menu (CacheMenuForGuests in ../qayema),
 * and what keeps a kept page right: open or closed on the phone's clock in
 * the restaurant's timezone; and the photo shrunk on the owner's phone.
 */

const MENU: ScenarioInput['categories'] = [
  { name: { en: 'Starters' }, dishes: [{ name: { en: 'Hummus' }, price: 6 }] },
]

test.describe('a menu Cloudflare may keep', () => {
  test("a guest's menu may be kept, and carries no cookie", async ({ page, scenario }) => {
    const owner = await scenario({ categories: MENU })

    const response = await page.goto(owner.restaurant.public_url)

    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).toBe('max-age=0, public, s-maxage=3600')
    const cookies = (await response!.headersArray()).filter(
      ({ name }) => name.toLowerCase() === 'set-cookie',
    )
    expect(cookies).toEqual([])
  })

  test("a signed-in owner's own menu is never kept", async ({ page, owner }) => {
    const restaurant = await owner({ categories: MENU })

    const response = await page.goto(restaurant.restaurant.public_url)

    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).not.toContain('public')
  })

  test('an address asking for a preview is never kept, even from a guest', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: MENU })

    const response = await page.goto(`${owner.restaurant.public_url}?preview=1`)

    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control']).not.toContain('public')
  })
})

test.describe('open or closed on a phone in another timezone', () => {
  // The guest's phone is in New York; the restaurant is in Beirut.
  test.use({ timezoneId: 'America/New_York' })

  test("the restaurant's own clock decides, not the phone's", async ({ page, scenario }) => {
    const owner = await scenario({
      categories: MENU,
      opening_hours: { mon: { open: '12:00', close: '15:00' } },
    })

    // 10:00 UTC on Monday 12 October 2026: 13:00 in Beirut, 06:00 in New York.
    await page.clock.setFixedTime(new Date('2026-10-12T10:00:00Z'))
    await page.goto(owner.restaurant.public_url)

    // Every place the hours show (the header row, the card under the cover).
    const labels = page.locator('[data-hours-label]')
    await expect(labels).not.toHaveCount(0)
    for (const label of await labels.all()) {
      await expect(label).toHaveText('Open now')
    }
    for (const value of await page.locator('[data-hours-value]').all()) {
      await expect(value).toHaveText('12:00 - 15:00')
    }
  })
})

/** A photo as a phone takes it: big, and too detailed to compress well. */
async function bigPhoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 4000
    canvas.height = 3000
    const context = canvas.getContext('2d')!
    const pixels = context.createImageData(canvas.width, canvas.height)
    for (let index = 0; index < pixels.data.length; index += 4) {
      pixels.data[index] = (index * 7) % 256
      pixels.data[index + 1] = (index * 13) % 256
      pixels.data[index + 2] = (index * 29) % 256
      pixels.data[index + 3] = 255
    }
    context.putImageData(pixels, 0, 0)
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((made) => resolve(made!), 'image/jpeg', 0.95),
    )
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    }
    return btoa(binary)
  })

  return Buffer.from(base64, 'base64')
}

test.describe('photos shrink on the phone before they upload', () => {
  test('a big photo goes up as a small WebP, and the upload works', async ({ page, owner }) => {
    // What the dashboard hands the upload as its file (a request body
    // carrying a file cannot be read back from the browser).
    await page.addInitScript(() => {
      const append = FormData.prototype.append
      FormData.prototype.append = function (
        name: string,
        value: string | Blob,
        ...rest: [string?]
      ) {
        if (name === 'file' && value instanceof File) {
          ;(window as unknown as { sentFile: object }).sentFile = {
            name: value.name,
            type: value.type,
            size: value.size,
          }
        }
        return append.call(this, name, value as Blob, ...(rest as [string]))
      }
    })
    await owner({ categories: MENU })
    await page.goto('/dishes')
    const photo = await bigPhoto(page)

    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    const uploaded = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/uploads/temp') && response.request().method() === 'POST',
    )
    await dialog
      .locator('input[type="file"]')
      .setInputFiles({ name: 'phone-photo.jpg', mimeType: 'image/jpeg', buffer: photo })

    expect((await uploaded).ok()).toBeTruthy()
    const sent = await page.evaluate(
      () =>
        (window as unknown as { sentFile: { name: string; type: string; size: number } }).sentFile,
    )
    expect(sent).toMatchObject({ name: 'phone-photo.webp', type: 'image/webp' })
    expect(sent.size).toBeLessThan(photo.length)
    await expect(dialog.locator('img')).toHaveAttribute('src', /^blob:/)
  })
})

test.describe('a browser that keeps nothing', () => {
  test('still counts the visit, with an id for this page only, and the menu works', async ({
    page,
    scenario,
  }) => {
    // Some private windows refuse local storage outright.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage is blocked')
        },
      })
    })
    const owner = await scenario({ categories: MENU })
    const events = `${owner.restaurant.public_url}/events`
    const sent = page.waitForRequest(
      (request) => request.url() === events && request.method() === 'POST',
    )

    await page.goto(owner.restaurant.public_url)
    await expect(page.getByText('Hummus').first()).toBeVisible()

    const body = (await sent).postDataJSON() as { visitor: string; visit?: { qr: boolean } }
    expect(body.visitor).toMatch(/^[a-f0-9]{32}$/)
    expect(body.visit).toBeDefined()
  })
})
