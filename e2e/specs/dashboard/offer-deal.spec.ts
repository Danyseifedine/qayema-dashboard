import type { Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { guestMenu, isPhone, openSidebar } from '../../support/helpers'

/**
 * An offer's own deal dish: made in the offer editor, on the Dishes page
 * as the offer's deal, and on the guest menu (orderable) only while the
 * offer runs.
 */

async function openOffers(page: Page) {
  const sections = await openSidebar(page)
  await sections.getByRole('button', { name: either('Offers', 'العروض') }).click()
}

/** On a phone Dishes is the Menu tab. */
async function openDishes(page: Page) {
  const sections = await openSidebar(page)
  const name = isPhone(page) ? either('Menu', 'القائمة') : either('Dishes', 'الأطباق')
  await sections.getByRole('button', { name }).first().click()
}

test.describe('offer deal dish', () => {
  test('an owner makes a deal dish that is on the menu only while its offer runs @matrix', async ({
    page,
    browser,
    owner,
  }) => {
    const restaurant = await owner({
      package: 'premium',
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [
        { name: { en: 'Deals' }, dishes: [] },
        { name: { en: 'Pizzas' }, dishes: [{ name: { en: 'Margherita' }, price: 12 }] },
      ],
    })
    await page.goto('/')
    await openOffers(page)
    await page
      .getByRole('button', { name: either('Create your first offer', 'أنشئ أول عرض') })
      .click()
    const next = page.getByRole('button', { name: either('Next', 'التالي'), exact: true })

    // 1 Picture and text: a title, no picture. 2 Where and shape: the banner.
    await page
      .getByRole('textbox', { name: /^(Title|العنوان)/ })
      .first()
      .fill('Pizza night')
    await next.click()
    await next.click()

    // 3 The offer gives a deal dish, named after the offer until renamed.
    await page.getByRole('tab', { name: either('A deal', 'صفقة') }).click()
    const dishName = page.getByRole('textbox', { name: /^(Deal name|اسم الصفقة)/ }).first()
    await expect(dishName).toHaveValue('Pizza night')
    await dishName.fill('Family meal')
    await page.getByRole('spinbutton', { name: either('Price', 'السعر') }).fill('25')
    await page.getByRole('combobox', { name: /^(Category|القسم)/ }).click()
    await page.getByRole('option', { name: 'Deals' }).click()
    await expect(
      page.getByText(
        either(
          'This dish shows on your menu only while the offer is running, and guests can order it only then.',
          'يظهر هذا الطبق على قائمتك فقط أثناء سريان العرض، ولا يمكن للزبائن طلبه إلا حينها.',
        ),
      ),
    ).toBeVisible()
    await next.click()

    // 4 When: always. 5 Review, then add it.
    await next.click()
    const deal = either('Deal: Family meal, $25.00', 'طبق العرض: Family meal، $25.00')
    await expect(page.getByText(deal)).toBeVisible()
    await page.getByRole('button', { name: either('Add offer', 'إضافة العرض') }).click()

    // Saved: its card shows the deal.
    await expect(page.getByRole('heading', { name: either('Review', 'مراجعة') })).toBeHidden()
    await expect(page.getByText(deal)).toBeVisible()
    await expect(page.getByText(either('Live now', 'يظهر الآن'))).toBeVisible()

    // The Dishes page says the dish is the offer's, on the menu while it runs.
    await openDishes(page)
    const card = page.locator('article', { hasText: 'Family meal' })
    await expect(card.getByText(either('Offer deal', 'طبق عرض'))).toBeVisible()
    await expect(
      card.getByText(
        either('On your menu while “Pizza night” runs', 'على قائمتك ما دام «Pizza night» ساريًا'),
      ),
    ).toBeVisible()

    // Guests see it at its price and can order it.
    const guest = await guestMenu(browser, restaurant)
    const meal = guest.locator('article.dish', { hasText: 'Family meal' })
    await expect(meal.locator('.price')).toHaveText('$25')
    await meal.getByRole('button', { name: 'Add Family meal' }).click()
    await expect(guest.locator('.col-aside')).toContainText('Family meal')
    await guest.context().close()

    // Paused, the offer takes its deal dish off the menu.
    await openOffers(page)
    await page
      .getByRole('switch', {
        name: either('Show Pizza night on the menu', 'إظهار Pizza night على القائمة'),
      })
      .click()
    await expect(page.getByText(either('Paused', 'موقوف'))).toBeVisible()

    const later = await guestMenu(browser, restaurant)
    await expect(later.locator('article.dish', { hasText: 'Margherita' })).toBeVisible()
    await expect(later.locator('article.dish', { hasText: 'Family meal' })).toHaveCount(0)
    await later.context().close()

    await openDishes(page)
    await expect(
      page
        .locator('article', { hasText: 'Family meal' })
        .getByText(either('Hidden: “Pizza night” is paused', 'مخفي: «Pizza night» موقوف')),
    ).toBeVisible()
  })
})
