import type { Locator, Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'
import { openMenuCart } from '../../support/helpers'

/**
 * The menu in Ember, the premium dark design (../qayema resources/views/menu/
 * templates/ember.blade.php): everything Classic does, reached its own way:
 * the search and the language in the pill on the cover, the categories as
 * tiles, and a floating bar at the foot of a phone (WhatsApp, Menu,
 * Location, Cart).
 */

/** The floating bar's items by the names screen readers hear: icons only, no words. */
function barNames(bar: Locator) {
  return expect.poll(() =>
    bar
      .locator('.dockface')
      .evaluateAll((items) => items.map((item) => item.getAttribute('aria-label'))),
  )
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const ALWAYS_OPEN = Object.fromEntries(DAYS.map((day) => [day, { open: '00:00', close: '23:59' }]))

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Mezze', ar: 'مقبلات' },
    description: { en: 'Small plates to share.', ar: 'أطباق صغيرة للمشاركة.' },
    icon: 'salad',
    dishes: [
      {
        name: { en: 'Hummus', ar: 'حمص' },
        price: 5.5,
        image: true,
        ingredients: { en: 'Chickpeas, tahini', ar: 'حمص، طحينة' },
      },
      { name: { en: 'Knafeh', ar: 'كنافة' }, price: 6 },
      { name: { en: 'Hidden plate', ar: 'طبق مخفي' }, price: 9, is_available: false },
    ],
  },
  {
    name: { en: 'Charcoal grills', ar: 'مشاوي' },
    icon: 'grill',
    dishes: [
      {
        name: { en: 'Mixed grill', ar: 'مشاوي مشكلة' },
        price: 14,
        variants: [
          {
            name: { en: 'Size', ar: 'الحجم' },
            options: [
              { name: { en: 'Regular', ar: 'عادي' }, price: 0 },
              { name: { en: 'Large', ar: 'كبير' }, price: 4 },
            ],
          },
        ],
        addons: [{ name: { en: 'Garlic sauce', ar: 'ثوم' }, price: 0.5 }],
      },
    ],
  },
  { name: { en: 'Desserts', ar: 'حلويات' }, dishes: [] },
]

const EMBER: ScenarioInput = {
  package: 'premium',
  template: 'ember',
  name: { en: 'Olive & Ember', ar: 'زيتون وجمر' },
  second_locale: 'ar',
  phone: '+96170123456',
  google_maps_url: 'https://www.google.com/maps/place/@33.8959,35.4784,17z',
  opening_hours: ALWAYS_OPEN,
  order_mode: 'menu',
  order_types: ['pickup'],
  categories: MENU,
}

function dish(page: Page, name: string): Locator {
  return page.locator('article.dish').filter({ has: page.locator('.dish-name', { hasText: name }) })
}

/** The search box, in the pill on the cover (a tap on the magnifier opens it on a phone). */
async function search(page: Page, term: string) {
  await page.locator('.pill-search').click()
  await page.locator('[data-menu-search]').fill(term)
}

test.describe('the Ember design', () => {
  test('a guest browses, searches, picks a size and sends an order, tracked in its sheet @matrix', async ({
    page,
    scenario,
    expectAccessible,
  }) => {
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('link[href*="css/menu-ember.css"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1, name: 'Olive & Ember' })).toBeVisible()
    await expect(page.locator('[data-hours-label]')).toHaveText('Open now')
    await expect(page.locator('[data-hours-value]')).toHaveText('00:00 - 23:59')
    await expectAccessible()

    // The tiles: All, then each category with something in it.
    const tiles = page.getByRole('navigation', { name: 'Categories' })
    await expect(tiles.getByRole('button')).toHaveText(['All', 'Mezze', 'Charcoal grills'])
    // Every tile one size, whatever its name.
    const sizes = await tiles.getByRole('button').evaluateAll((all) =>
      all.map((tile) => {
        const box = tile.getBoundingClientRect()
        return `${box.width}x${box.height}`
      }),
    )
    expect(new Set(sizes).size).toBe(1)
    await expect(page.getByText('Hidden plate')).toHaveCount(0)
    await tiles.getByRole('button', { name: 'Charcoal grills' }).click()
    await expect(tiles.getByRole('button', { name: 'Charcoal grills' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(dish(page, 'Hummus')).toBeHidden()
    await expect(dish(page, 'Mixed grill')).toBeVisible()
    await tiles.getByRole('button', { name: 'All' }).click()
    await expect(dish(page, 'Hummus')).toBeVisible()

    // The search, from the magnifier in the pill.
    await search(page, 'tahini')
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(dish(page, 'Knafeh')).toBeHidden()
    await page.locator('[data-menu-search]').fill('nothing like this')
    await expect(page.getByText('Nothing on the menu matches that.')).toBeVisible()
    // The bar is the search while it is open; its close button brings the menu back.
    await expect(page.getByRole('heading', { level: 1 })).toBeHidden()
    await page.locator('[data-search-close]').click()
    await expect(page.locator('[data-menu-search]')).toHaveValue('')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(dish(page, 'Knafeh')).toBeVisible()

    // The dish sheet: a size and an add-on.
    await dish(page, 'Mixed grill').click()
    const sheet = page.getByRole('dialog', { name: 'Mixed grill' })
    await expect(sheet).toBeVisible()
    await sheet.getByText('Large').click()
    await sheet.getByText('Garlic sauce').click()
    await expect(sheet.locator('.dish-sheet-add')).toHaveText('Add$18.50')
    await sheet.locator('.dish-sheet-add').click()
    await expect(sheet).toBeHidden()
    await dish(page, 'Hummus').getByRole('button', { name: 'Add Hummus' }).click()
    await expect(page.locator('[data-cart-count]')).toHaveText('2')

    const cart = await openMenuCart(page)
    await expect(cart.locator('.cart-total')).toHaveText('Total$24')
    await cart.getByLabel('Your name').fill('Rami')
    await cart.getByLabel('Phone number').fill('70 123 456')
    await cart.getByRole('button', { name: /Place order/ }).click()

    const toast = page.getByRole('status').filter({ hasText: 'Order sent' })
    await toast.getByRole('link', { name: 'Track your order' }).click()
    const tracking = page.getByRole('dialog', { name: 'Order tracking' })
    await expect(tracking.locator('.track-title')).toHaveText('Order sent')
    await expect(tracking).toContainText('Large, + Garlic sauce')
    await expect(tracking).toContainText('$24')
  })

  test('on a phone the floating bar reaches WhatsApp, the categories, the language, the map and the cart', async ({
    page,
    scenario,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    const bar = page.getByRole('navigation', { name: 'Menu actions' })
    await barNames(bar).toEqual(['WhatsApp', 'Menu', 'Language', 'Location', 'Cart'])
    await expect(bar.locator('.dock-label')).toHaveCount(0)
    // The pill on the cover holds only the search on a phone.
    await expect(page.locator('.hero-pill [data-open-cart]')).toHaveCount(0)
    await expect(page.locator('.hero-pill [data-pop-open="lang"]')).toBeHidden()

    await bar.getByRole('button', { name: 'Language' }).click()
    await expect(page.locator('#pop-lang').getByRole('link', { name: 'العربية' })).toBeVisible()
    await page.locator('#pop-lang').getByRole('button', { name: 'Close' }).click()

    await bar.getByRole('link', { name: 'Menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Categories' })).toBeInViewport()

    // WhatsApp opens the same pop-up as the cover's round button.
    await bar.getByRole('button', { name: 'WhatsApp' }).click()
    const contact = page.locator('#pop-contact')
    await expect(contact.getByRole('link', { name: 'Open WhatsApp' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/\d+$/,
    )
    await contact.getByRole('button', { name: 'Close' }).click()

    await bar.getByRole('button', { name: 'Location' }).click()
    const map = page.locator('#pop-map')
    await expect(map).toBeVisible()
    await expect(map.getByRole('link', { name: 'Open in Maps' })).toBeVisible()
    await map.getByRole('button', { name: 'Close' }).click()

    // The count shows once something is in the cart.
    await expect(bar.locator('[data-cart-count]')).toBeHidden()
    await dish(page, 'Knafeh').getByRole('button', { name: 'Add Knafeh' }).click()
    await expect(bar.locator('[data-cart-count]')).toHaveText('1')
    await bar.getByRole('button', { name: 'Cart' }).click()
    await expect(page.locator('#cart-sheet')).toBeVisible()
    await expect(page.locator('#cart-sheet .cart-line')).toContainText('Knafeh')
    await page.locator('#cart-sheet [data-close-cart]').click()

    // The rest of Classic's dock is on the cover: the phone, the QR and the language.
    await expect(page.getByRole('link', { name: 'Call the restaurant' })).toHaveAttribute(
      'href',
      'tel:+96170123456',
    )
    await page.getByRole('button', { name: 'Share menu' }).click()
    await expect(page.locator('#pop-qr [data-qr-canvas] svg')).toBeVisible()
    await page.locator('#pop-qr').getByRole('button', { name: 'Close' }).click()

    // A dish's photo opens big.
    await dish(page, 'Hummus').getByRole('button', { name: 'View photo' }).click()
    await expect(page.locator('#pop-photo')).toBeVisible()
    await page.locator('#pop-photo').getByRole('button', { name: 'Close' }).click()

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })

  test('without WhatsApp, a map or orders the bar keeps only Menu', async ({ page, scenario }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const owner = await scenario({
      package: 'pro',
      phone: null,
      categories: MENU,
      overrides: [{ feature: 'premium_designs', value: 1 }],
      template: 'ember',
    })
    await page.goto(owner.restaurant.public_url)

    const bar = page.getByRole('navigation', { name: 'Menu actions' })
    await barNames(bar).toEqual(['Menu'])
    await expect(page.locator('[data-open-cart]')).toHaveCount(0)
    await expect(dish(page, 'Hummus').locator('.dish-action')).toHaveCount(0)
  })

  test('an Arabic menu reads right to left, in its own words, and its search folds the letters', async ({
    page,
    scenario,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    await page.getByRole('button', { name: 'Language' }).click()
    await page.locator('#pop-lang').getByRole('link', { name: 'العربية' }).click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1, name: 'زيتون وجمر' })).toBeVisible()
    await expect(page.locator('[data-hours-label]')).toHaveText('مفتوح الآن')
    await barNames(page.locator('.dock')).toEqual(['واتساب', 'القائمة', 'اللغة', 'الموقع', 'السلة'])

    // "كنافه" finds "كنافة", as guests type on a phone.
    await search(page, 'كنافه')
    await expect(dish(page, 'كنافة')).toBeVisible()
    await expect(dish(page, 'حمص')).toBeHidden()

    // The photo fades in from the end, which is the left here.
    const photo = await dish(page, 'كنافة').locator('.dish-photo-slot').boundingBox()
    const card = await dish(page, 'كنافة').boundingBox()
    expect(Math.round(photo!.x)).toBe(Math.round(card!.x + 1))
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })

  test('long Lebanese pounds and long names fit a 360px phone, offer prices struck through', async ({
    page,
    scenario,
  }) => {
    await page.setViewportSize({ width: 360, height: 760 })
    const owner = await scenario({
      package: 'premium',
      template: 'ember',
      currency: 'LBP',
      name: { en: 'Gaststätte zum Goldenen Hirschen am Marktplatz' },
      order_mode: 'menu',
      order_types: ['pickup'],
      categories: [
        {
          name: { en: 'Hauptgerichte vom Holzkohlegrill' },
          icon: 'grill',
          dishes: [
            {
              name: { en: 'Schweinebraten mit Kartoffelknödeln und Rotkohl' },
              price: 12500000,
              image: true,
            },
            { name: { en: 'Kafta' }, price: 1250000 },
          ],
        },
      ],
      offers: [
        {
          title: { en: 'Grill week' },
          placements: ['banner'],
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Kafta'],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const kafta = dish(page, 'Kafta')
    await expect(kafta.locator('.price')).toHaveText('L.L 1,000,000')
    await expect(kafta.locator('.price-was')).toHaveText('L.L 1,250,000')
    await expect(kafta.locator('.dish-badge')).toHaveText('-20%')
    await dish(page, 'Schweinebraten')
      .getByRole('button', { name: /Add Schweinebraten/ })
      .click()
    await expect(dish(page, 'Schweinebraten').locator('.qty output')).toHaveText('1')

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    // Nothing on a card runs past it.
    for (const card of await page.locator('article.dish').all()) {
      const box = (await card.boundingBox())!
      for (const part of await card.locator('.dish-name, .price-group, .qty, .add').all()) {
        const inner = (await part.boundingBox())!
        expect(inner.x + inner.width).toBeLessThanOrEqual(box.x + box.width + 0.5)
      }
    }
  })

  test('offers: the banner, the pop-up, then the ad that counts down', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...EMBER,
      second_locale: null,
      offers: [
        {
          title: { en: 'Grill week' },
          description: { en: 'Every evening.' },
          image: true,
          placements: ['banner', 'popup', 'ad'],
          action: 'dishes',
          dishes: ['Mixed grill'],
          show_again: 'once',
          delay_seconds: 0,
          ad_delay_seconds: 0,
          ad_seconds: 3,
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const popup = page.locator('dialog.offer-pop')
    await expect(popup.getByRole('heading', { name: 'Grill week' })).toBeVisible()
    await popup.getByRole('button', { name: 'Close' }).click()
    await expect(popup).toBeHidden()

    const ad = page.locator('.offer-ad-wrap')
    await expect(ad.getByRole('heading', { name: 'Grill week' })).toBeVisible()
    await expect(ad.locator('[data-offer-count]')).toBeVisible()
    await ad.getByRole('button', { name: 'Close' }).click({ timeout: 6000 })
    await expect(ad).toBeHidden()

    await page.locator('.offers-banner').getByRole('button', { name: 'See the dishes' }).click()
    const tiles = page.getByRole('navigation', { name: 'Categories' })
    await expect(tiles.getByRole('button', { name: 'Offers', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(dish(page, 'Mixed grill')).toBeVisible()
    await expect(dish(page, 'Hummus')).toBeHidden()
  })

  test('an offer outside its hours says when it runs', async ({ page, scenario }) => {
    const today = new Date().getUTCDay()
    const away = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].filter(
      (_, index) => ![6, 0, 1].includes((index - today + 7) % 7),
    )
    const owner = await scenario({
      ...EMBER,
      second_locale: null,
      offers: [
        {
          title: { en: 'Grill days' },
          placements: ['banner'],
          action: 'dishes',
          discount_type: 'percent',
          discount_value: 20,
          dishes: ['Mixed grill'],
          repeat: 'weekly',
          weekdays: away,
          time_windows: [{ from: '17:00', to: '19:00' }],
          shows_outside_hours: true,
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    await page.locator('.offers-banner .offer', { hasText: 'Grill days' }).click()
    await expect(page.locator('.menu-toast')).toContainText('Not available right now')
    await expect(dish(page, 'Mixed grill').locator('.price')).toHaveText('$14')
  })

  test('the dishes guests build sit in a row above the tiles and open their sheet', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      ...EMBER,
      second_locale: null,
      overrides: [{ feature: 'build_your_own', value: 1 }],
      categories: [
        ...MENU!,
        {
          name: { en: 'Juices' },
          dishes: [
            {
              name: { en: 'Build your juice' },
              price: 4,
              builds: [
                {
                  name: { en: 'Your juice' },
                  shape: 'pieces',
                  parts: [2],
                  choices: [
                    { name: { en: 'Orange' }, price: 0 },
                    { name: { en: 'Carrot' }, price: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)

    const builds = page.locator('.builds')
    await expect(builds.getByRole('heading', { name: 'Make it your way' })).toBeVisible()
    // Above the tiles.
    const row = (await builds.boundingBox())!
    const tiles = (await page.getByRole('navigation', { name: 'Categories' }).boundingBox())!
    expect(row.y).toBeLessThan(tiles.y)
    await builds.getByRole('button', { name: 'Build yours' }).click()
    const sheet = page.getByRole('dialog', { name: 'Build your juice' })
    await expect(sheet).toBeVisible()
    // A picker for each of its two pieces.
    await expect(sheet.locator('.build-pick-button')).toHaveCount(2)
  })

  test('a closed restaurant says so on the cover and in the cart', async ({ page, scenario }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const owner = await scenario({
      ...EMBER,
      second_locale: null,
      opening_hours: Object.fromEntries(
        DAYS.map((day) => [day, { open: '00:00', close: '00:01' }]),
      ),
    })
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('[data-hours-label]')).toHaveText('Closed now')
    await dish(page, 'Knafeh').getByRole('button', { name: 'Add Knafeh' }).click()
    const cart = await openMenuCart(page)
    await expect(cart.locator('.cart-closed')).toBeVisible()
  })

  test('without the premium designs the menu is drawn in Classic', async ({ page, scenario }) => {
    const owner = await scenario({ package: 'pro', template: 'ember', categories: MENU })
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('link[href*="css/menu-classic.css"]')).toHaveCount(1)
    await expect(page.locator('link[href*="css/menu-ember.css"]')).toHaveCount(0)
  })
  for (const width of [320, 390]) {
    test(`every dish card is one height at ${width}px, with long, short or no ingredients`, async ({
      page,
      scenario,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      const owner = await scenario({
        package: 'premium',
        template: 'ember',
        order_mode: 'menu',
        order_types: ['pickup'],
        categories: [
          {
            name: { en: 'Mezze' },
            dishes: [
              {
                name: { en: 'Hummus with a name far too long for one line on a phone' },
                price: 5.5,
                image: true,
                ingredients: {
                  en: 'Chickpeas, tahini, lemon juice, garlic, extra virgin olive oil, paprika, parsley, cumin, sumac and warm bread on the side',
                },
              },
              { name: { en: 'Tabbouleh' }, price: 6.5, ingredients: { en: 'Parsley, bulgur' } },
              { name: { en: 'Falafel' }, price: 6 },
            ],
          },
        ],
        offers: [
          {
            title: { en: 'Grill week' },
            placements: ['banner'],
            discount_type: 'percent',
            discount_value: 20,
            dishes: ['Falafel'],
          },
        ],
      })
      await page.goto(owner.restaurant.public_url)

      const heights = await page
        .locator('.dishes article.dish')
        .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height))
      expect(heights).toHaveLength(3)
      expect(new Set(heights).size).toBe(1)
      // Long ingredients take two lines, cut after the second.
      const lines = await dish(page, 'Hummus')
        .locator('.ingredients')
        .evaluate((text) =>
          Math.round(
            text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight),
          ),
        )
      expect(lines).toBe(2)
      // A step in the cart keeps the height too.
      await dish(page, 'Falafel').getByRole('button', { name: 'Add Falafel' }).click()
      expect((await dish(page, 'Falafel').boundingBox())!.height).toBe(heights[0])
    })
  }

  test('the page behind stays put while the dish sheet is open, and scrolls again once it closes', async ({
    page,
    scenario,
  }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    await page.evaluate(() => window.scrollTo(0, 300))
    await dish(page, 'Mixed grill').click()
    const sheet = page.getByRole('dialog', { name: 'Mixed grill' })
    await expect(sheet).toBeVisible()
    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.move(195, 80)
    await page.mouse.wheel(0, 600)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    )
    expect(await page.evaluate(() => window.scrollY)).toBe(before)

    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
    await page.mouse.wheel(0, 300)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  })

  test('Escape in the search empties it and brings the menu back', async ({ page, scenario }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    await search(page, 'zzz')
    await expect(page.getByText('Nothing on the menu matches that.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menu actions' })).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-menu-search]')).toHaveValue('')
    await expect(page.getByText('Nothing on the menu matches that.')).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Menu actions' })).toBeVisible()
    await expect(dish(page, 'Hummus')).toBeVisible()
  })
  test('on a wide screen the language is in the pill, and closing the search goes back to where the guest was', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario(EMBER)
    await page.goto(owner.restaurant.public_url)

    await expect(page.getByRole('navigation', { name: 'Menu actions' })).toBeHidden()
    await page.locator('.hero-pill').getByRole('button', { name: 'Language' }).click()
    await expect(page.locator('#pop-lang')).toBeVisible()
    await page.locator('#pop-lang').getByRole('button', { name: 'Close' }).click()

    // A little down the page, the box still in sight.
    await page.evaluate(() => window.scrollTo(0, 20))
    await page.locator('[data-menu-search]').focus()
    await expect(page.locator('body')).toHaveClass(/is-searching/)
    await page.locator('[data-menu-search]').fill('knafeh')
    await expect(dish(page, 'Knafeh')).toBeVisible()
    await page.locator('[data-search-close]').click()
    await expect(page.locator('body')).not.toHaveClass(/is-searching/)
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(20)
  })

  test('every category tile is one size, its icon on one line with the others, a name alone centred', async ({
    browser,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      template: 'ember',
      categories: [
        { name: { en: 'Mezze' }, icon: 'burger', dishes: [{ name: { en: 'Hummus' }, price: 5 }] },
        {
          name: { en: 'Charcoal grills' },
          icon: 'egg-fried',
          dishes: [{ name: { en: 'Kafta' }, price: 9 }],
        },
        {
          name: { en: 'Shawarma & burgers' },
          icon: 'chef-hat',
          dishes: [{ name: { en: 'Burger' }, price: 8 }],
        },
        // No icon picked: no stand-in, the name alone in the middle of its tile.
        { name: { en: 'Drinks' }, dishes: [{ name: { en: 'Lemonade' }, price: 3 }] },
      ],
    })
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } })
      const page = await context.newPage()
      await page.goto(owner.restaurant.public_url)
      const tiles = page.locator('.tab')
      await expect(tiles).toHaveCount(5)
      await expect(page.locator('.tab', { hasText: 'Drinks' }).locator('.tab-icon')).toHaveCount(0)
      const boxes = await tiles.evaluateAll((items) =>
        items.map((item) => {
          const tile = item.getBoundingClientRect()
          const icon = item.querySelector('.tab-icon')?.getBoundingClientRect()
          const name = item.querySelector('.tab-name')!.getBoundingClientRect()
          return {
            width: Math.round(tile.width),
            height: Math.round(tile.height),
            icon: icon ? Math.round(icon.top) : null,
            // How far the name's middle is from the tile's.
            offCentre: Math.abs(name.top + name.height / 2 - (tile.top + tile.height / 2)),
          }
        }),
      )
      // Two-line names ("Charcoal grills") leave every icon where the others are.
      const icons = boxes.flatMap((box) => (box.icon === null ? [] : [box.icon]))
      expect(icons, `icons at ${width}px`).toHaveLength(4)
      expect(new Set(icons).size, `icons at ${width}px`).toBe(1)
      expect(boxes[4]!.offCentre, `the name alone at ${width}px`).toBeLessThanOrEqual(1)
      expect(
        new Set(boxes.map((box) => `${box.width}x${box.height}`)).size,
        `sizes at ${width}px`,
      ).toBe(1)
      await context.close()
    }
  })
})
