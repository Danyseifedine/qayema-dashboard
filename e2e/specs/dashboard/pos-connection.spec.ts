import { either, expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * Connect to POS (../qayema docs/architecture/pos-connection-plan.md): an
 * owner an admin switched it on for links the menu to the e2e backend's
 * fake POS (tests/E2e/FakePosController, answering the committed contract
 * samples), and the menu's dishes then come from it: the Dishes page shows
 * them to be looked at, with no adding or deleting, the owner's own dish
 * hidden, and Offers off. Disconnecting hands the menu back.
 */
const POS_ADDRESS = 'http://127.0.0.1:8001/e2e/fake-pos'

const SCENARIO = {
  package: 'premium',
  overrides: [{ feature: 'pos_connection', value: 1 }],
  categories: [
    { name: { en: 'Old specials' }, dishes: [{ name: { en: 'Grandma soup' }, price: 7 }] },
  ],
} satisfies ScenarioInput

test.describe('connect to POS', () => {
  test('an owner links the menu to a POS, its dishes arrive read-only, and disconnecting hands it back @matrix', async ({
    page,
    owner,
  }) => {
    await owner(SCENARIO)
    await page.goto('/features')

    const card = page.getByRole('region', { name: either('Connect to POS', 'الربط بنقطة البيع') })
    await card.getByLabel(/POS address|عنوان نقطة البيع/).fill(POS_ADDRESS)
    await card
      .getByLabel(/Connection key|مفتاح الربط/)
      .fill(`menu_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    const linked = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/pos-connection'),
    )
    await card.getByRole('button', { name: either('Connect', 'ربط'), exact: true }).click()
    expect((await linked).status()).toBe(201)

    await expect(card).toContainText(/Connected to Hamra Bites|مرتبط بـ Hamra Bites/)
    // The first pull runs on the server just after linking; the card asks until it is done.
    await expect(card).toContainText(/Last synced|آخر مزامنة/, { timeout: 30_000 })

    await page.goto('/dishes')
    await expect(
      page.getByText(/Your menu comes from your POS|قائمتك تأتي من نقطة البيع/),
    ).toBeVisible()
    const hummus = page.getByRole('button', { name: /^(View|عرض) (Hummus|حمص)$/ })
    await expect(hummus).toBeVisible()
    await expect(page.getByRole('button', { name: either('Add dish', 'إضافة طبق') })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^(Delete|حذف) / })).toHaveCount(0)
    await expect(page.getByText(/Hidden while connected|مخفي أثناء الربط/)).toBeVisible()

    await hummus.click()
    const dish = page.getByRole('dialog', {
      name: either('Dish from your POS', 'طبق من نقطة البيع'),
    })
    await expect(dish).toContainText('Hummus')
    await expect(dish).toContainText('Mezze')
    await expect(dish.getByRole('textbox')).toHaveCount(0)
    await dish.getByRole('button', { name: either('Close', 'إغلاق') }).click()

    await page.goto('/offers')
    await expect(
      page.getByText(
        /Off while your menu is connected to a POS|متوقفة أثناء ربط قائمتك بنقطة البيع/,
      ),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: either('New offer', 'عرض جديد') })).toHaveCount(0)

    await page.goto('/features')
    await card.getByRole('button', { name: either('Disconnect', 'فك الربط') }).click()
    const confirm = page.getByRole('dialog', {
      name: either('Disconnect your POS?', 'فك الربط بنقطة البيع؟'),
    })
    await confirm.getByRole('button', { name: either('Disconnect', 'فك الربط') }).click()
    await expect(
      card.getByRole('button', { name: either('Connect', 'ربط'), exact: true }),
    ).toBeVisible()

    await page.goto('/dishes')
    await expect(page.getByRole('button', { name: either('Add dish', 'إضافة طبق') })).toBeVisible()
  })
})
