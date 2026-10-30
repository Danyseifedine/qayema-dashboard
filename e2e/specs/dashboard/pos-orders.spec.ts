import type { Browser, Page } from '@playwright/test'
import { either, expect, test, type Owner, type ScenarioInput } from '../../support/fixtures'
import { guestMenu, openMenuCart } from '../../support/helpers'

/**
 * Orders to the POS (../qayema docs/architecture/pos-connection-plan.md,
 * phase 4): with sending switched on, an order a guest places in the menu
 * goes on to the e2e backend's fake POS (tests/E2e/FakePosController), which
 * takes it as W-0001; the owner's Orders page then shows it in the POS, with
 * no steps of its own. One the POS refuses (the fake refuses a note saying
 * REFUSE) stays here, "Not sent to your POS", with Try again.
 */
const POS_ADDRESS = 'http://127.0.0.1:8001/e2e/fake-pos'

const SCENARIO = {
  package: 'premium',
  order_mode: 'menu',
  order_types: ['pickup'],
  overrides: [{ feature: 'pos_connection', value: 1 }],
} satisfies ScenarioInput

/** Links the owner's menu to the fake POS and waits for the first pull. */
async function link(page: Page) {
  await page.goto('/features')
  const card = page.getByRole('region', { name: either('Connect to POS', 'الربط بنقطة البيع') })
  await card.getByLabel(/POS address|عنوان نقطة البيع/).fill(POS_ADDRESS)
  await card
    .getByLabel(/Connection key|مفتاح الربط/)
    .fill(`menu_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  await card.getByRole('button', { name: either('Connect', 'ربط'), exact: true }).click()
  await expect(card).toContainText(/Last synced|آخر مزامنة/, { timeout: 30_000 })
  return card
}

/** A guest orders the POS's hummus (its one required choice) for pickup, with a note. */
async function guestOrders(browser: Browser, owner: Owner, note: string): Promise<string> {
  const guest = await guestMenu(browser, owner)
  await guest.getByRole('button', { name: 'See options: Hummus' }).click()
  const sheet = guest.getByRole('dialog', { name: 'Hummus' })
  await sheet.getByText('Large').click()
  await sheet.locator('.dish-sheet-add').click()
  await expect(sheet).toBeHidden()

  const cart = await openMenuCart(guest)
  await cart.getByLabel('Your name').fill('Rami')
  await cart.getByLabel('Phone number').fill('70 123 456')
  await cart.getByLabel(/Note for the restaurant/).fill(note)
  const placed = guest.waitForResponse(
    (response) => response.url().endsWith('/order') && response.request().method() === 'POST',
  )
  await cart.getByRole('button', { name: /Place order/ }).click()
  const response = await placed
  expect(response.status()).toBe(201)
  const { data } = (await response.json()) as { data: { reference: string } }
  await guest.context().close()

  return data.reference
}

test.describe('orders to the POS', () => {
  test('a menu order goes to the POS and is handled there; a refused one waits with Try again @matrix', async ({
    page,
    owner,
    browser,
  }) => {
    const restaurant = await owner(SCENARIO)
    const card = await link(page)

    const sendOrders = card.getByRole('switch', {
      name: either(
        'Send orders placed in your menu to your POS',
        'أرسل الطلبات من قائمتك إلى نقطة البيع',
      ),
    })
    await expect(sendOrders).toHaveAttribute('aria-checked', 'false')
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' && response.url().endsWith('/api/pos-connection'),
    )
    await sendOrders.click()
    expect((await saved).status()).toBe(200)
    await expect(sendOrders).toHaveAttribute('aria-checked', 'true')

    const taken = await guestOrders(browser, restaurant, 'Extra lemon')
    const refused = await guestOrders(browser, restaurant, 'REFUSE please')

    await page.goto('/orders')
    const inPos = page.getByRole('article', { name: taken })
    await expect(inPos).toContainText(/In your POS · W-0001|في نقطة البيع · W-0001/)
    await expect(inPos).toContainText(/Handled in your POS|يُدار من نقطة البيع/)
    await expect(inPos.getByRole('button', { name: either('Accept', 'اقبل') })).toHaveCount(0)

    const notSent = page.getByRole('article', { name: refused })
    await expect(notSent).toContainText(/Not sent to your POS|لم يُرسل إلى نقطة البيع/)
    await expect(notSent).toContainText('"Hummus" is no longer sold.')
    await expect(
      notSent.getByRole('button', { name: either('Try again', 'حاول مجدداً') }),
    ).toBeVisible()
  })
})
