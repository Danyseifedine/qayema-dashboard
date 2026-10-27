import { either, expect, test } from '../../support/fixtures'
import { guestMenu, openSidebar } from '../../support/helpers'

/**
 * The owner's Offers page (Premium): making an offer, step by step, that
 * guests see on the menu, pausing it, and the locked page for a package
 * without offers.
 */

const GRILLS = {
  name: { en: 'Grills' },
  dishes: [
    { name: { en: 'Kafta' }, price: 12.5 },
    { name: { en: 'Shish Taouk' }, price: 9 },
  ],
}

test.describe('offers', () => {
  test('an owner makes a discount offer and guests see it @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({ package: 'premium', categories: [GRILLS] })
    await page.goto('/')
    const sections = await openSidebar(page)
    await sections.getByRole('button', { name: either('Offers', 'العروض') }).click()

    await page
      .getByRole('button', { name: either('Create your first offer', 'أنشئ أول عرض') })
      .click()
    const next = page.getByRole('button', { name: either('Next', 'التالي'), exact: true })

    // 1 Picture and text.
    await page
      .getByRole('textbox', { name: /^(Title|العنوان)/ })
      .first()
      .fill('Grill week')
    await next.click()

    // 2 Where and shape: a square banner.
    const bannerShape = page.getByRole('group', {
      name: either('Banner shape', 'شكل الإعلان أعلى القائمة'),
    })
    await bannerShape.getByRole('button', { name: /^(Square|مربع)/ }).click()
    await next.click()

    // 3 Tap and discount: a discount on the owner's dishes.
    await page
      .getByRole('tab', { name: either('A discount on your dishes', 'خصم على أطباقك') })
      .click()
    await page.getByRole('tab', { name: either('Percent off', 'نسبة مئوية') }).click()
    await page.getByRole('textbox', { name: either('Percent off', 'نسبة الخصم') }).fill('20')
    await page.getByRole('checkbox', { name: /Kafta/ }).click()
    await expect(page.getByText('$12.50').first()).toBeVisible()
    await next.click()

    // 4 When: always. 5 Review, then add it.
    await next.click()
    await expect(page.getByRole('heading', { name: either('Review', 'مراجعة') })).toBeVisible()
    await page.getByRole('button', { name: either('Add offer', 'إضافة العرض') }).click()

    // Saved: back on the list.
    await expect(page.getByRole('heading', { name: either('Review', 'مراجعة') })).toBeHidden()
    await expect(page.getByText('Grill week')).toBeVisible()
    await expect(page.getByText(either('Live now', 'يظهر الآن'))).toBeVisible()
    // It takes one of the package's three banners.
    await expect(page.getByText(/Banners 1 of 3|إعلانات أعلى القائمة 1 من 3/)).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('.offers-banner .offer', { hasText: 'Grill week' })).toBeVisible()
    await expect(guest.locator('article.dish', { hasText: 'Kafta' }).locator('.price')).toHaveText(
      '$10',
    )
    await guest.context().close()
  })

  test('pausing an offer takes it off the menu', async ({ page, browser, owner }) => {
    const restaurant = await owner({
      package: 'premium',
      categories: [GRILLS],
      offers: [{ title: { en: 'Happy hour' }, placements: ['banner'] }],
    })
    await page.goto('/offers')

    await page.getByRole('switch', { name: 'Show Happy hour on the menu' }).click()
    await expect(page.getByText('Paused')).toBeVisible()

    const guest = await guestMenu(browser, restaurant)
    await expect(guest.locator('article.dish', { hasText: 'Kafta' })).toBeVisible()
    await expect(guest.getByText('Happy hour')).toHaveCount(0)
    await guest.context().close()
  })

  test('a Pro owner sees what offers would give', async ({ page, owner }) => {
    await owner({ package: 'pro' })
    await page.goto('/offers')

    await expect(page.getByText('Put your offers on the menu')).toBeVisible()
    await expect(page.getByText(/Comes with the Premium package/)).toBeVisible()
  })

  test('a package with banners only keeps the pop-up, schedules and discounts closed', async ({
    page,
    owner,
  }) => {
    await owner({
      package: 'premium',
      categories: [GRILLS],
      overrides: [
        { feature: 'offer_popup_limit', value: 0 },
        { feature: 'offer_schedules', value: 0 },
        { feature: 'offer_discounts', value: 0 },
      ],
    })
    await page.goto('/offers')
    await page
      .getByRole('button', { name: either('Create your first offer', 'أنشئ أول عرض') })
      .click()
    const next = page.getByRole('button', { name: either('Next', 'التالي'), exact: true })
    await page
      .getByRole('textbox', { name: /^(Title|العنوان)/ })
      .first()
      .fill('Lunch')
    await next.click()
    await expect(
      page.getByRole('button', { name: /^(Pop-up|إعلان عند فتح القائمة)/ }),
    ).toBeDisabled()
    await next.click()
    await page
      .getByRole('tab', { name: either('A discount on your dishes', 'خصم على أطباقك') })
      .click()
    await expect(
      page.getByRole('tab', { name: either('Percent off', 'نسبة مئوية') }),
    ).toBeDisabled()
    // Without discounts, it is a tap showing the dishes: one is needed to go on.
    await page.getByRole('checkbox', { name: /Kafta/ }).click()
    await next.click()
    await expect(
      page.getByRole('tab', { name: either('On a schedule', 'في أوقات محددة') }),
    ).toBeDisabled()
  })
})
