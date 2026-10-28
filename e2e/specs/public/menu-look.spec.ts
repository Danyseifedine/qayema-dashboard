import type { Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * How the classic menu looks, whatever the owner wrote or chose: the
 * design's colours and the name beside the logo, the fonts of each writing
 * system, the category tabs lined up with or without icons, the header's
 * facts never running under the search on a narrow laptop, long words and
 * big prices kept inside a 360px phone, and the photo and map pop-ups.
 */

const allDay = { open: '00:00', close: '23:59' }
const WEEK = {
  mon: allDay,
  tue: allDay,
  wed: allDay,
  thu: allDay,
  fri: allDay,
  sat: allDay,
  sun: allDay,
}

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Starters', ar: 'المقبلات' },
    icon: 'salad',
    dishes: [
      {
        name: { en: 'Hummus', ar: 'حمص' },
        price: 6,
        image: true,
        ingredients: { en: 'Chickpeas, tahini' },
      },
      { name: { en: 'Fattoush', ar: 'فتوش' }, price: 7 },
    ],
  },
  {
    name: { en: 'Grills', ar: 'مشاوي' },
    icon: 'meat',
    dishes: [{ name: { en: 'Kafta', ar: 'كفتة' }, price: 12 }],
  },
  // No icon: its name must still sit on the same line as the others.
  {
    name: { en: 'Breakfast', ar: 'الفطور' },
    dishes: [{ name: { en: 'Manakish', ar: 'مناقيش' }, price: 2 }],
  },
]

async function cssVariable(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (variable) =>
      getComputedStyle(document.documentElement).getPropertyValue(variable).trim().toUpperCase(),
    name,
  )
}

/** Nothing on the page is wider than the screen: no sideways scrolling. */
async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0)
}

test.describe('the menu in the owner’s design', () => {
  test('the colours the owner picked and the name hidden beside the logo @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'pro',
      logo: true,
      name: { en: 'Night Owl' },
      settings: {
        primary_color: '#E4572E',
        background_color: '#121212',
        text_color: '#F2F2F2',
        show_name: false,
      },
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)

    expect(await cssVariable(page, '--accent')).toBe('#E4572E')
    expect(await cssVariable(page, '--bg')).toBe('#121212')
    expect(await cssVariable(page, '--text')).toBe('#F2F2F2')
    // A dark background keeps the browser's own controls dark too.
    expect(await cssVariable(page, 'color-scheme')).toBe('DARK')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#E4572E')
    // The chosen tab is drawn in the accent, its words in a colour that reads on it.
    await expect(page.locator('.tab-pill')).toHaveCSS('background-color', 'rgb(228, 87, 46)')

    // The logo stands alone in the bar; the link still says whose menu it is,
    // and the cover still shows the name.
    await expect(page.locator('.brand-name')).toHaveCount(0)
    await expect(page.locator('img.brand-mark')).toBeVisible()
    await expect(page.locator('a.brand')).toHaveAttribute('aria-label', 'Night Owl')
    await expect(page.getByRole('heading', { level: 1, name: 'Night Owl' })).toBeVisible()
  })

  test('without Appearance on the package the menu keeps the design’s own colours', async ({
    page,
    scenario,
  }) => {
    // Free has no Appearance: what the owner chose waits, unused.
    const owner = await scenario({
      package: 'free',
      settings: { primary_color: '#E4572E', show_name: false },
      categories: MENU,
    })
    await page.goto(owner.restaurant.public_url)

    expect(await cssVariable(page, '--accent')).toBe('#F8D38D')
    await expect(page.locator('.brand-name')).toHaveText('E2E Kitchen')
    // No logo: the name's first letter stands in for it.
    await expect(page.locator('span.brand-mark')).toHaveText('E')
  })

  test('each writing system gets its own font, the Latin one first for prices', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })
    const fontsLink = page.locator('link[rel="stylesheet"][href^="https://fonts.googleapis.com"]')

    await page.goto(owner.restaurant.public_url)
    await expect(fontsLink).toHaveAttribute('href', /family=Inter:/)
    expect(await cssVariable(page, '--font')).toMatch(/^'INTER'/)

    await page.goto(`${owner.restaurant.public_url}?lang=ar`)
    await expect(fontsLink).toHaveAttribute('href', /family=Inter:.*family=El\+Messiri:/)
    expect(await cssVariable(page, '--font')).toMatch(/^'INTER', 'EL MESSIRI'/)
  })
})

test.describe('the menu’s layout holds', () => {
  test('a category tab without an icon lines up with the tabs that have one', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })

    for (const query of ['', '?lang=ar']) {
      await page.goto(`${owner.restaurant.public_url}${query}`)
      const middles = await page.locator('.tab .tab-name').evaluateAll((names) =>
        names.map((name) => {
          const box = name.getBoundingClientRect()
          return Math.round((box.top + box.height / 2) * 2) / 2
        }),
      )
      // All, Starters, Grills, Breakfast.
      expect(middles).toHaveLength(4)
      expect(new Set(middles).size, `names at ${middles.join(', ')}`).toBe(1)
    }
  })

  test('on a narrow laptop the header drops a fact rather than hide it under the search', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'premium',
      second_locale: 'ar',
      logo: true,
      name: { en: 'Beit Beirut Kitchen & Grill House', ar: 'بيت بيروت للمشاوي والمازة البيتية' },
      phone: '+961 71 234 567',
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      opening_hours: WEEK,
      categories: MENU,
    })

    /** Each fact's place: on the bar's one line and clear of the search, or wrapped out of sight. */
    const facts = () =>
      page.evaluate(() => {
        const row = document.querySelector('.facts-row')!.getBoundingClientRect()
        const search = document.querySelector('.topbar-search')!.getBoundingClientRect()
        const rtl = document.documentElement.dir === 'rtl'
        return Array.from(document.querySelectorAll('.facts-row .fact')).map((fact) => {
          const box = fact.getBoundingClientRect()
          return {
            text: (fact.textContent ?? '').replace(/\s+/g, ' ').trim(),
            shown: box.top < row.bottom,
            clear: rtl ? box.left >= search.right : box.right <= search.left,
          }
        })
      })

    for (const query of ['', '?lang=ar']) {
      // An iPad on its side: the name gives way first, then the phone drops out.
      await page.setViewportSize({ width: 1024, height: 768 })
      await page.goto(`${owner.restaurant.public_url}${query}`)
      const narrow = await facts()
      expect(narrow.filter((fact) => fact.shown && !fact.clear)).toEqual([])
      expect(narrow.map((fact) => fact.shown)).toEqual([true, true, false])

      // A wide screen has room for all three.
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${owner.restaurant.public_url}${query}`)
      const wide = await facts()
      expect(wide.every((fact) => fact.shown && fact.clear)).toBe(true)
    }
    await expect(page.locator('.brand-name')).toHaveText('بيت بيروت للمشاوي والمازة البيتية')
  })

  test('long words and big prices stay inside a small phone, in every direction', async ({
    page,
    scenario,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    const german = await scenario({
      main_locale: 'de',
      currency: 'LBP',
      name: { de: 'Donaudampfschifffahrtsgesellschaftskapitänsrestaurant' },
      description: {
        en: '',
        de: 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz.',
      },
      categories: [
        {
          name: { de: 'Hauptspeisenauswahlkategorienbezeichnung' },
          dishes: [
            {
              name: { de: 'Schweinekrustenbratenmitsemmelknödelundsauerkraut' },
              price: 1250000,
              ingredients: { de: 'Kartoffelsalatdressingzubereitungsanleitung' },
            },
          ],
        },
      ],
    })
    await page.goto(german.restaurant.public_url)
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.locator('article.dish')).toContainText('L.L 1,250,000')
    await expectNoSideScroll(page)

    const russian = await scenario({
      main_locale: 'ru',
      name: { ru: 'Достопримечательностьресторанвысококачественный' },
      categories: [
        {
          name: { ru: 'Высококачественныепродукты' },
          dishes: [{ name: { ru: 'Человеконенавистничествосалат' }, price: 12 }],
        },
      ],
    })
    await page.goto(russian.restaurant.public_url)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Достопримечательность')
    await expectNoSideScroll(page)

    const arabic = await scenario({
      package: 'premium',
      main_locale: 'ar',
      currency: 'LBP',
      name: { ar: 'مطعم بيت بيروت للمشاوي والمازة اللبنانية الأصيلة' },
      opening_hours: WEEK,
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      categories: [
        {
          name: { ar: 'المشاوي على الفحم مع الخبز المحمص' },
          dishes: [
            {
              name: { ar: 'مشاوي مشكلة مع البطاطا المقلية وصلصة الثوم والمخللات' },
              price: 2750000,
            },
          ],
        },
      ],
    })
    await page.goto(arabic.restaurant.public_url)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('article.dish')).toContainText('L.L 2,750,000')
    await expectNoSideScroll(page)
  })
})

test.describe('the menu’s pop-ups', () => {
  test('a dish photo opens big, its full size, and a tap anywhere closes it @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ categories: MENU })
    await page.goto(owner.restaurant.public_url)

    const hummus = page.locator('article.dish', { hasText: 'Hummus' })
    const card = hummus.locator('img.dish-photo')
    await expect(card).toHaveAttribute('alt', 'Hummus')
    // The card draws the small version; the big one is fetched on a tap.
    const small = await card.getAttribute('src')
    const full = await hummus.getAttribute('data-photo')
    expect(small).not.toBe(full)

    await hummus.getByRole('button', { name: 'View photo' }).click()
    const pop = page.locator('#pop-photo')
    await expect(pop).toBeVisible()
    await expect(pop).toHaveAttribute('aria-label', 'Hummus')
    await expect(pop.locator('img')).toHaveAttribute('src', full ?? '')
    await expect(pop.locator('img')).toHaveAttribute('alt', 'Hummus')

    await pop.locator('img').click()
    await expect(pop).toBeHidden()

    // A dish without a photo has nothing to open.
    await expect(
      page
        .locator('article.dish', { hasText: 'Fattoush' })
        .getByRole('button', { name: 'View photo' }),
    ).toHaveCount(0)
  })

  test('the map pop-up shows the place on OpenStreetMap, opens it in Maps, and closes with Escape', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      google_maps_url: 'https://maps.google.com/?q=33.8938,35.5018',
      categories: MENU,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(owner.restaurant.public_url)

    await page.locator('.dock').getByRole('button', { name: 'Find us' }).click()
    const pop = page.locator('#pop-map')
    await expect(pop).toBeVisible()
    // Keyless, and sandboxed so the frame can send its Referer but not reach the page.
    const frame = pop.locator('iframe')
    await expect(frame).toHaveAttribute('src', /openstreetmap\.org\/export\/embed\.html\?.*33\.89/)
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin')
    await expect(pop.getByRole('link', { name: 'Open in Maps' })).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=33.8938,35.5018',
    )
    // The link takes the focus, not the map frame, so Escape closes it.
    await expect(pop.getByRole('link', { name: 'Open in Maps' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(pop).toBeHidden()

    await page.locator('.dock').getByRole('button', { name: 'Find us' }).click()
    await expect(pop).toBeVisible()
    await expect(page.locator('.dock .is-map')).toHaveClass(/is-on/)
    await pop.getByRole('button', { name: 'Close' }).click()
    await expect(pop).toBeHidden()
    await expect(page.locator('.dock .is-map')).not.toHaveClass(/is-on/)
  })
})
