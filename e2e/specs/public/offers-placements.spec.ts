import type { Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { callApi } from '../../support/helpers'

/**
 * Every place an offer shows on the menu and every state it is in
 * (../qayema docs/architecture/offers.md), as guests meet them: the banner,
 * the pop-up and the short ad in the guest's language and screen, each tap
 * (the dishes, a link, nothing, a picture alone), how often a pop-up comes
 * back and how long it and the ad wait, the schedule judged on the guest's
 * own clock (a cached page keeps up by itself), a deal dish that comes and
 * goes with its offer, a tap outside an offer's hours, the owner's preview,
 * what the analytics are told, and the places a package leaves out.
 *
 * Times are pinned on the guest's clock in the restaurant's timezone
 * (Asia/Beirut, two hours ahead of UTC in winter): 15 January 2027 is a
 * Friday.
 */

const PIZZAS = {
  name: { en: 'Pizzas', ar: 'بيتزا' },
  dishes: [
    { name: { en: 'Margherita', ar: 'مارغريتا' }, price: 11 },
    { name: { en: 'Pepperoni', ar: 'بيبروني' }, price: 13 },
  ],
}
const DRINKS = {
  name: { en: 'Drinks', ar: 'مشروبات' },
  dishes: [{ name: { en: 'Lemonade', ar: 'ليموناضة' }, price: 3 }],
}

/** A Beirut wall-clock time in winter ("2027-01-15T18:00") as an instant. */
function beirut(local: string): Date {
  return new Date(`${local}:00+02:00`)
}

/** As the scenario takes dates: UTC, "2027-01-10 10:00:00". */
function utc(at: Date): string {
  return at.toISOString().replace('T', ' ').slice(0, 19)
}

function dish(page: Page, name: string) {
  return page.locator('article.dish', { hasText: name })
}

/** The guest's clock stopped at `at` before the menu opens: nothing waits unless runFor() says so. */
async function freezeAt(page: Page, at: Date = new Date()) {
  await page.clock.install({ time: new Date(at.getTime() - 1000) })
  await page.clock.pauseAt(at)
}

/** Records what the menu tells the analytics (menu-track.js listens for the same). */
async function recordTracking(page: Page) {
  await page.addInitScript(() => {
    const seen: { type: string; value?: string }[] = []
    ;(window as unknown as { tracked: typeof seen }).tracked = seen
    document.addEventListener('qayema:track', (event) => {
      seen.push((event as CustomEvent<{ type: string; value?: string }>).detail)
    })
  })
}

async function tracked(page: Page, type: string): Promise<string[]> {
  return page.evaluate(
    (wanted) =>
      (window as unknown as { tracked: { type: string; value?: string }[] }).tracked
        .filter((event) => event.type === wanted)
        .map((event) => String(event.value)),
    type,
  )
}

test.describe('offers on the menu, every place and state', () => {
  test("a pop-up, then its ad, then the banner, in the guest's language and screen @matrix", async ({
    page,
    scenario,
    uiLanguage,
  }) => {
    const ar = uiLanguage === 'ar'
    const owner = await scenario({
      package: 'premium',
      second_locale: 'ar',
      categories: [PIZZAS, DRINKS],
      offers: [
        {
          title: { en: 'Pizza night', ar: 'ليلة البيتزا' },
          description: { en: 'Two pizzas, one price.', ar: 'بيتزا اثنتان بسعر واحد.' },
          image: true,
          placements: ['banner', 'popup', 'ad'],
          popup_shape: 'tall',
          action: 'dishes',
          dishes: ['Margherita'],
          show_again: 'once',
          delay_seconds: 0,
          ad_delay_seconds: 0,
          ad_seconds: 3,
        },
      ],
    })
    await page.goto(`${owner.restaurant.public_url}${ar ? '?lang=ar' : ''}`)
    const title = ar ? 'ليلة البيتزا' : 'Pizza night'
    const close = ar ? 'إغلاق' : 'Close'

    // The pop-up first, tall, in the menu's language.
    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await expect(popup.getByRole('heading', { name: title })).toBeVisible()
    await expect(popup).toContainText(ar ? 'بيتزا اثنتان بسعر واحد.' : 'Two pizzas, one price.')
    const card = await popup.locator('.offer-popup').boundingBox()
    expect(card!.width / card!.height).toBeCloseTo(0.75, 1)
    // Never taller than the screen.
    expect(card!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
    await popup.getByRole('button', { name: close }).click()
    await expect(popup).toBeHidden()

    // Then its ad, inside the screen and clear of the dock, until its seconds are up.
    const ad = page.locator('.offer-ad-wrap')
    await expect(ad).toBeVisible()
    await expect(ad.getByRole('heading', { name: title })).toBeVisible()
    // Where it rests, once it has slid in.
    await ad.evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    )
    const box = await ad.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
    const dock = page.locator('.dock')
    if (await dock.isVisible()) {
      expect(box!.y + box!.height).toBeLessThanOrEqual((await dock.boundingBox())!.y)
    }
    await ad.getByRole('button', { name: close }).click({ timeout: 6000 })
    await expect(ad).toBeHidden()

    // The banner stays under the cover; its "See the dishes" shows the offer's dish alone.
    const banner = page.locator('.offers-banner .offer-banner')
    await expect(banner.getByRole('heading', { name: title })).toBeVisible()
    await banner.getByRole('button', { name: ar ? 'شاهد الأطباق' : 'See the dishes' }).click()
    const tabs = page.getByRole('navigation', { name: ar ? 'الأقسام' : 'Categories' })
    await expect(
      tabs.getByRole('button', { name: ar ? 'العروض' : 'Offers', exact: true }),
    ).toHaveAttribute('aria-current', 'true')
    await expect(dish(page, ar ? 'مارغريتا' : 'Margherita')).toBeVisible()
    await expect(dish(page, ar ? 'بيبروني' : 'Pepperoni')).toBeHidden()
    await expect(dish(page, ar ? 'ليموناضة' : 'Lemonade')).toBeHidden()

    // Seen once: back again, only the banner.
    await page.reload()
    await expect(banner).toBeVisible()
    await expect(popup).toBeHidden()
    await expect(ad).toBeHidden()
  })

  test('"See the dishes" in a pop-up closes it, and in an ad takes the ad away', async ({
    page,
    scenario,
  }) => {
    const offer = (placement: 'popup' | 'ad', title: string, dishName: string) => ({
      title: { en: title },
      placements: [placement] as ('popup' | 'ad')[],
      action: 'dishes' as const,
      dishes: [dishName],
      show_again: 'once' as const,
      delay_seconds: 0,
      ad_delay_seconds: 0,
      ad_seconds: 30,
    })
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS, DRINKS],
      offers: [offer('popup', 'Thirsty?', 'Lemonade'), offer('ad', 'Pizza time', 'Pepperoni')],
    })
    await page.goto(owner.restaurant.public_url)

    // One offer over the menu a visit: the first in the owner's order.
    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'See the dishes' }).click()
    await expect(popup).toBeHidden()
    await expect(page.getByRole('button', { name: 'Offers', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(dish(page, 'Lemonade')).toBeVisible()
    await expect(dish(page, 'Margherita')).toBeHidden()

    // The pop-up seen, the next visit's is the ad, even before its 30 seconds are up.
    await page.reload()
    const ad = page.locator('.offer-ad-wrap')
    await expect(ad).toBeVisible()
    await expect(popup).toBeHidden()
    await ad.getByRole('button', { name: 'See the dishes' }).click()
    await expect(ad).toBeHidden()
    await expect(dish(page, 'Pepperoni')).toBeVisible()
    await expect(dish(page, 'Lemonade')).toBeHidden()
  })

  test('a link offer opens its page in a new tab from the banner, the pop-up and the ad', async ({
    page,
    scenario,
  }) => {
    await page
      .context()
      .route('https://example.com/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>Our page</title>' }),
      )
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Follow us' },
          placements: ['banner', 'popup', 'ad'],
          action: 'link',
          action_url: 'https://example.com/news',
          delay_seconds: 0,
          ad_delay_seconds: 0,
          ad_seconds: 3,
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    // The ad's waits in the page, hidden until the pop-up is closed.
    for (const place of [popup, page.locator('.offer-ad-wrap'), page.locator('.offers-banner')]) {
      const link = place.locator('a.offer-go')
      await expect(link).toHaveText('Learn more')
      await expect(link).toHaveAttribute('href', 'https://example.com/news')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }

    const opened = page.waitForEvent('popup')
    await popup.getByRole('link', { name: 'Learn more' }).click()
    await expect(await opened).toHaveTitle('Our page')
    // The menu stays where it was, with no offer tab.
    await expect(page.getByRole('button', { name: 'Offers', exact: true })).toHaveCount(0)
  })

  test('an offer with nothing to tap promises nothing, and a tap on it does nothing', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Welcome' },
          description: { en: 'Glad you came.' },
          placements: ['banner'],
          action: 'none',
        },
        // Its dishes to show, none of them on the menu: no promise either.
        {
          title: { en: 'Gone soon' },
          placements: ['banner'],
          action: 'dishes',
          dishes: ['Lost dish'],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const banner = page.locator('.offers-banner')
    const card = banner.locator('.offer', { hasText: 'Welcome' })
    await expect(card).toContainText('Glad you came.')
    await expect(banner.getByRole('button', { name: 'See the dishes' })).toHaveCount(0)
    await expect(banner.getByRole('link')).toHaveCount(0)
    await card.click()
    await expect(page.getByRole('button', { name: 'Offers', exact: true })).toHaveCount(0)
    await expect(page.locator('.menu-toast')).toHaveCount(0)
    await expect(dish(page, 'Pepperoni')).toBeVisible()
  })

  test('a picture alone is the whole pop-up and its tap, and the whole ad', async ({
    page,
    scenario,
  }) => {
    const alone = (placement: 'popup' | 'ad', title: string, dishName: string) => ({
      title: { en: title },
      show_text: false,
      image: true,
      placements: [placement] as ('popup' | 'ad')[],
      popup_shape: 'square' as const,
      action: 'dishes' as const,
      dishes: [dishName],
      show_again: 'once' as const,
      delay_seconds: 0,
      ad_delay_seconds: 0,
      ad_seconds: 30,
    })
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS, DRINKS],
      offers: [alone('popup', 'Thirsty?', 'Lemonade'), alone('ad', 'Pizza time', 'Pepperoni')],
    })
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await expect(popup.locator('img.offer-photo')).toBeVisible()
    await expect(popup.getByRole('heading')).toHaveCount(0)
    // A square picture alone: as wide as tall.
    const card = await popup.locator('.offer-popup').boundingBox()
    expect(card!.width / card!.height).toBeCloseTo(1, 1)
    await popup.getByRole('button', { name: 'Thirsty?' }).click()
    await expect(popup).toBeHidden()
    await expect(dish(page, 'Lemonade')).toBeVisible()
    await expect(dish(page, 'Margherita')).toBeHidden()

    await page.reload()
    const ad = page.locator('.offer-ad-wrap')
    await expect(ad.locator('img.offer-photo')).toBeVisible()
    await expect(ad.getByRole('heading')).toHaveCount(0)
    // The ad is always a rectangle, twice as wide as tall.
    const adCard = await ad.locator('.offer-ad').boundingBox()
    expect(Math.round(adCard!.width / adCard!.height)).toBe(2)
    await ad.getByRole('button', { name: 'Pizza time' }).click()
    await expect(ad).toBeHidden()
    await expect(dish(page, 'Pepperoni')).toBeVisible()
  })

  test('a pop-up waits its delay, and the ad counts its seconds down one by one before its X', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Free dessert' },
          placements: ['popup', 'ad'],
          delay_seconds: 3,
          ad_delay_seconds: 2,
          ad_seconds: 3,
          show_again: 'every_visit',
        },
      ],
    })
    await freezeAt(page)
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await page.clock.runFor(2500)
    await expect(popup).toBeHidden()
    await page.clock.runFor(1000)
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()

    // Its own wait after the pop-up is closed.
    const ad = page.locator('.offer-ad-wrap')
    await page.clock.runFor(1500)
    await expect(ad).toBeHidden()
    await page.clock.runFor(600)
    await expect(ad).toBeVisible()

    const count = ad.locator('[data-offer-count]')
    const closeButton = ad.getByRole('button', { name: 'Close' })
    await expect(count).toHaveText('3')
    await expect(closeButton).toBeHidden()
    await page.clock.runFor(1000)
    await expect(count).toHaveText('2')
    await page.clock.runFor(1000)
    await expect(count).toHaveText('1')
    await expect(closeButton).toBeHidden()
    await page.clock.runFor(1000)
    await expect(closeButton).toBeVisible()
    await expect(count).toBeHidden()

    // The X does not close it by itself: it stays until the guest does.
    await page.clock.runFor(60_000)
    await expect(ad).toBeVisible()
    await closeButton.click()
    await page.clock.runFor(500)
    await expect(ad).toBeHidden()
  })

  test('an ad alone waits its own delay from the menu opening', async ({ page, scenario }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        { title: { en: 'Free dessert' }, placements: ['ad'], ad_delay_seconds: 5, ad_seconds: 3 },
      ],
    })
    await freezeAt(page)
    await page.goto(owner.restaurant.public_url)

    const ad = page.locator('.offer-ad-wrap')
    await page.clock.runFor(4500)
    await expect(ad).toBeHidden()
    await page.clock.runFor(1000)
    await expect(ad).toBeVisible()
  })

  test('a pop-up shown "once a day" comes back the next day, not the same day', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Daily special' },
          placements: ['popup'],
          show_again: 'daily',
          delay_seconds: 0,
        },
      ],
    })
    const popup = page.locator('dialog.offer-pop')

    await page.clock.setFixedTime(beirut('2027-01-15T12:00'))
    await page.goto(owner.restaurant.public_url)
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()

    // Later that day, past its delay: still closed.
    await page.clock.setFixedTime(beirut('2027-01-15T23:30'))
    await page.reload()
    await page.waitForFunction(() => document.readyState === 'complete')
    await expect(dish(page, 'Margherita')).toBeVisible()
    await expect(popup).toBeHidden({ timeout: 2000 })

    // The restaurant's next day.
    await page.clock.setFixedTime(beirut('2027-01-16T00:30'))
    await page.reload()
    await expect(popup).toBeVisible()
  })

  test("the banner follows its days and hours on the guest's clock, a night past midnight belonging to the day it began", async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        { title: { en: 'Always on' }, placements: ['banner'] },
        {
          title: { en: 'Happy hour' },
          placements: ['banner'],
          repeat: 'weekly',
          weekdays: ['fri'],
          time_windows: [
            { from: '17:00', to: '19:00' },
            { from: '22:00', to: '02:00' },
          ],
        },
      ],
    })
    const happy = page.locator('.offers-banner .offer', { hasText: 'Happy hour' })
    const at = async (local: string) => {
      await page.clock.setFixedTime(beirut(local))
      await page.goto(owner.restaurant.public_url)
      await expect(page.locator('.offers-banner .offer', { hasText: 'Always on' })).toBeVisible()
    }

    await at('2027-01-15T18:00') // Friday, in its first hours
    await expect(happy).toBeVisible()
    await expect(page.locator('.offers-dots').getByRole('button')).toHaveCount(2)
    await at('2027-01-15T20:00') // Friday, between them
    await expect(happy).toBeHidden()
    // A dot only for the cards shown.
    await expect(page.locator('.offers-dots').getByRole('button')).toHaveCount(0)
    await at('2027-01-16T01:00') // Saturday night: Friday's late hours
    await expect(happy).toBeVisible()
    await at('2027-01-15T01:00') // Friday night: Thursday's, which has none
    await expect(happy).toBeHidden()
    await at('2027-01-16T18:00') // Saturday
    await expect(happy).toBeHidden()
  })

  test('a 31st runs on the last day of a shorter month, and dates start and end it', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        { title: { en: 'Month end' }, placements: ['banner'], repeat: 'monthly', month_days: [31] },
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          starts_at: utc(beirut('2027-01-10T10:00')),
          ends_at: utc(beirut('2027-01-17T00:00')),
        },
      ],
    })
    const card = (title: string) => page.locator('.offers-banner .offer', { hasText: title })
    const at = async (local: string) => {
      await page.clock.setFixedTime(beirut(local))
      await page.goto(owner.restaurant.public_url)
      await expect(dish(page, 'Margherita')).toBeVisible()
    }

    await at('2027-02-28T12:00')
    await expect(card('Month end')).toBeVisible()
    await at('2027-02-27T12:00')
    await expect(card('Month end')).toBeHidden()
    // The carousel goes when no card is left to show.
    await expect(page.locator('.offers-banner')).toBeHidden()

    await at('2027-01-10T09:59')
    await expect(card('Grill week')).toBeHidden()
    await at('2027-01-10T10:00')
    await expect(card('Grill week')).toBeVisible()
    await at('2027-01-16T23:59')
    await expect(card('Grill week')).toBeVisible()
    await at('2027-01-17T00:00')
    await expect(card('Grill week')).toBeHidden()
  })

  test('a page left open shows a banner when its time comes and takes it away when it ends', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Lunch deal' },
          placements: ['banner'],
          repeat: 'weekly',
          weekdays: ['fri'],
          time_windows: [{ from: '12:00', to: '12:30' }],
        },
      ],
    })
    await freezeAt(page, beirut('2027-01-15T11:59'))
    await page.goto(owner.restaurant.public_url)

    const card = page.locator('.offers-banner .offer', { hasText: 'Lunch deal' })
    await expect(dish(page, 'Margherita')).toBeVisible()
    await expect(card).toBeHidden()
    // Judged again every minute.
    await page.clock.runFor(61_000)
    await expect(card).toBeVisible()
    await page.clock.runFor(30 * 60_000)
    await expect(card).toBeHidden()
  })

  test('a deal dish and its category are on the menu only while the offer is live', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      order_mode: 'menu',
      categories: [PIZZAS, { name: { en: 'Deals' }, dishes: [] }],
      offers: [
        {
          title: { en: 'Friday feast' },
          placements: ['banner'],
          action: 'dishes',
          repeat: 'weekly',
          weekdays: ['fri'],
          time_windows: [{ from: '17:00', to: '23:00' }],
          deal: { name: { en: 'Family meal' }, price: 25, category: 'Deals' },
        },
      ],
    })
    const tabs = page.getByRole('navigation', { name: 'Categories' })
    const meal = dish(page, 'Family meal')

    await page.clock.setFixedTime(beirut('2027-01-15T18:00'))
    await page.goto(owner.restaurant.public_url)
    await expect(meal).toBeVisible()
    await expect(meal).toContainText('$25')
    await expect(tabs.getByRole('button', { name: 'Deals' })).toBeVisible()
    // "See the dishes" opens the deal.
    await page.locator('.offers-banner').getByRole('button', { name: 'See the dishes' }).click()
    await expect(meal).toBeVisible()
    await expect(dish(page, 'Margherita')).toBeHidden()

    await page.clock.setFixedTime(beirut('2027-01-16T18:00'))
    await page.reload()
    await expect(dish(page, 'Margherita')).toBeVisible()
    await expect(meal).toBeHidden()
    await expect(tabs.getByRole('button', { name: 'Deals' })).toBeHidden()
    await expect(page.locator('.category', { hasText: 'Deals' })).toBeHidden()
    // Nor does a search find it.
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('Family')
    await expect(meal).toBeHidden()
  })

  test("outside its hours a pop-up's tap closes it and says when it runs; an ad's says so too", async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Happy hour' },
          placements: ['popup', 'ad'],
          action: 'dishes',
          dishes: ['Margherita'],
          repeat: 'weekly',
          weekdays: ['wed', 'fri'],
          time_windows: [{ from: '17:00', to: '19:00' }],
          shows_outside_hours: true,
          delay_seconds: 0,
          ad_delay_seconds: 0,
          ad_seconds: 3,
          show_again: 'every_visit',
        },
      ],
    })
    // A Saturday noon: shown, its deal not running.
    await page.clock.setFixedTime(beirut('2027-01-16T12:00'))
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    const toast = page.locator('.menu-toast')
    await popup.getByRole('button', { name: 'See the dishes' }).click()
    // Closed, so its backdrop no longer covers the note.
    await expect(popup).toBeHidden()
    await expect(toast).toBeVisible()
    await expect(toast).toContainText('Not available right now')
    await expect(toast).toContainText('Available Wednesday and Friday, 5:00 PM to 7:00 PM.')
    await expect(page.getByRole('button', { name: 'Offers', exact: true })).toHaveCount(0)
    await toast.click()
    await expect(toast).toHaveCount(0)

    // The ad comes after; its tap says the same and leaves it open.
    const ad = page.locator('.offer-ad-wrap')
    await expect(ad).toBeVisible()
    await ad.getByRole('button', { name: 'See the dishes' }).click()
    await expect(toast).toContainText('Not available right now')
    await expect(ad).toBeVisible()
    await expect(dish(page, 'Pepperoni')).toBeVisible()
  })

  test("the owner previews a paused offer's pop-up at once; the same link shows a guest nothing", async ({
    browser,
    page,
    scenario,
    signIn,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      offers: [
        {
          title: { en: 'Coming soon' },
          placements: ['banner', 'popup'],
          is_active: false,
          delay_seconds: 10,
          show_again: 'once',
        },
      ],
    })
    const link = `${owner.restaurant.public_url}?offer=${owner.offers[0]!.id}`

    await signIn(owner.user.email)
    await page.goto(link)
    // At once, not after its 10 seconds, and every time it is previewed.
    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible({ timeout: 3000 })
    await expect(page.locator('.offers-banner .offer', { hasText: 'Coming soon' })).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()
    await page.reload()
    await expect(popup).toBeVisible({ timeout: 3000 })

    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    await guest.goto(link)
    await expect(dish(guest, 'Margherita')).toBeVisible()
    await expect(guest.getByText('Coming soon')).toHaveCount(0)
    await guestContext.close()

    // Switched on, guests meet it as it is set: its pop-up after its delay.
    const switched = await callApi(page, 'PATCH', `/api/offers/${owner.offers[0]!.id}/active`, {
      is_active: true,
    })
    expect(switched.ok()).toBe(true)
    const second = await browser.newContext()
    const later = await second.newPage()
    await later.goto(owner.restaurant.public_url)
    await expect(later.locator('.offers-banner .offer', { hasText: 'Coming soon' })).toBeVisible()
    await second.close()
  })

  test('the analytics hear each offer shown once a visit, and each tap', async ({
    page,
    scenario,
  }) => {
    await recordTracking(page)
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS, DRINKS],
      offers: [
        {
          title: { en: 'Pizza night' },
          placements: ['banner'],
          action: 'dishes',
          dishes: ['Margherita'],
        },
        {
          title: { en: 'Thirsty?' },
          placements: ['banner', 'popup'],
          action: 'dishes',
          dishes: ['Lemonade'],
          delay_seconds: 0,
        },
      ],
    })
    const [pizza, thirsty] = owner.offers.map((offer) => String(offer.id))
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()
    await expect
      .poll(() => tracked(page, 'offer_shown'))
      .toEqual(expect.arrayContaining([pizza, thirsty]))

    // The second banner slid into view and back: still once each.
    const dots = page.locator('.offers-dots').getByRole('button')
    await dots.nth(1).click()
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')
    await dots.first().click()
    await expect(dots.first()).toHaveAttribute('aria-current', 'true')
    expect((await tracked(page, 'offer_shown')).sort()).toEqual([pizza, thirsty].sort())

    await page
      .locator('.offers-banner .offer', { hasText: 'Pizza night' })
      .getByRole('button', { name: 'See the dishes' })
      .click()
    await expect.poll(() => tracked(page, 'offer_tap')).toEqual([pizza])
  })

  test("on a wide screen a picture far from its banner's shape fills the strip at its own proportions", async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      // A 3:2 picture in a square banner: too far apart to crop, so shown whole.
      offers: [
        {
          title: { en: 'Pizza night' },
          image: true,
          placements: ['banner'],
          banner_shape: 'square',
        },
      ],
    })
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const guest = await context.newPage()
    await guest.goto(owner.restaurant.public_url)

    const card = guest.locator('.offers-banner .offer-banner')
    await expect(card).toHaveClass(/offer-fit-whole/)
    const photo = card.locator('img.offer-photo')
    await expect(photo).toBeVisible()
    const strip = (await card.boundingBox())!
    const box = (await photo.boundingBox())!
    // As tall as the strip, not boxed small inside a square of it.
    expect(Math.abs(box.height - strip.height)).toBeLessThan(2)
    expect(box.width / box.height).toBeCloseTo(1.5, 1)
    await context.close()
  })

  test('a place the package leaves out is never drawn, the offer showing only in the others', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      categories: [PIZZAS],
      overrides: [
        { feature: 'offer_banner_limit', value: 0 },
        { feature: 'offer_ad_limit', value: 0 },
      ],
      offers: [
        { title: { en: 'Everywhere' }, placements: ['banner', 'popup', 'ad'], delay_seconds: 0 },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('.offers-banner')).toHaveCount(0)
    await expect(page.locator('.offer-ad-wrap')).toHaveCount(0)
  })

  test('more banners than dots show a count, and the carousel never slides for a guest asking for less motion', async ({
    page,
    scenario,
  }) => {
    const banners: ScenarioInput['offers'] = Array.from({ length: 10 }, (_, index) => ({
      title: { en: `Deal ${index + 1}` },
      placements: ['banner'],
    }))
    const owner = await scenario({ package: 'premium', categories: [PIZZAS], offers: banners })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await freezeAt(page)
    await page.goto(owner.restaurant.public_url)

    const count = page.locator('.offers-dots .offers-count')
    await expect(count).toHaveText('1 / 10')
    await expect(page.locator('.offers-dot')).toHaveCount(0)
    // Long past its five seconds: still the first.
    await page.clock.runFor(20_000)
    await expect(count).toHaveText('1 / 10')

    // A swipe moves the count with it.
    await page.locator('[data-offers-track]').evaluate((track) => {
      const second = track.children[1]!.getBoundingClientRect().left
      track.scrollBy({
        left: second - track.getBoundingClientRect().left - 16,
        behavior: 'instant',
      })
    })
    await page.clock.runFor(100)
    await expect(count).toHaveText('2 / 10')
  })
})
