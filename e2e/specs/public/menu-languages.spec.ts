import type { Page } from '@playwright/test'
import { expect, test, type ScenarioInput } from '../../support/fixtures'

/**
 * The menu in its languages (../qayema/docs/architecture/menu-languages.md):
 * each of the eleven a menu can be written in, with its own words for the
 * menu's labels and its direction; a second language the owner switched off;
 * a name not yet written in the second language shown in the main one; the
 * search tags for each language; and a search that finds Arabic the way
 * guests type it on a phone.
 */

/** What each menu language calls the search box, the All tab and the credit (lang/*.json). */
const LANGUAGES: { code: string; search: string; all: string; credit: string; rtl?: true }[] = [
  { code: 'en', search: 'Search the menu', all: 'All', credit: 'Menu by Qayema' },
  { code: 'ar', search: 'ابحث في القائمة', all: 'الكل', credit: 'منيو بواسطة Qayema', rtl: true },
  { code: 'fr', search: 'Rechercher dans le menu', all: 'Tout', credit: 'Menu créé avec Qayema' },
  { code: 'es', search: 'Buscar en el menú', all: 'Todo', credit: 'Menú creado con Qayema' },
  { code: 'tr', search: 'Menüde ara', all: 'Tümü', credit: 'Qayema ile hazırlandı' },
  {
    code: 'de',
    search: 'Speisekarte durchsuchen',
    all: 'Alle',
    credit: 'Speisekarte erstellt mit Qayema',
  },
  { code: 'it', search: 'Cerca nel menù', all: 'Tutto', credit: 'Menù creato con Qayema' },
  { code: 'ru', search: 'Поиск по меню', all: 'Все', credit: 'Меню создано в Qayema' },
  { code: 'zh', search: '搜索菜单', all: '全部', credit: '菜单由 Qayema 提供' },
  { code: 'hi', search: 'मेन्यू में खोजें', all: 'सभी', credit: 'मेन्यू Qayema द्वारा' },
  { code: 'pt', search: 'Pesquisar no menu', all: 'Tudo', credit: 'Menu criado com Qayema' },
]

const MENU: ScenarioInput['categories'] = [
  {
    name: { en: 'Starters', ar: 'المقبلات', fr: 'Entrées' },
    dishes: [
      { name: { en: 'Hummus', ar: 'حمص', fr: 'Houmous' }, price: 6 },
      // Not written in French yet.
      { name: { en: 'Fattoush', ar: 'فتوش' }, price: 7 },
    ],
  },
]

function dish(page: Page, name: string) {
  return page.locator('article.dish', { hasText: name })
}

function searchBox(page: Page) {
  return page.locator('[data-menu-search]:visible')
}

test.describe('the menu in every language', () => {
  test('each of the eleven menu languages has its own words and direction', async ({
    page,
    scenario,
  }) => {
    for (const language of LANGUAGES) {
      const owner = await scenario({
        main_locale: language.code,
        name: { [language.code]: `Kitchen ${language.code}` },
        categories: [
          {
            name: { [language.code]: `Section ${language.code}` },
            dishes: [{ name: { [language.code]: `Dish ${language.code}` }, price: 5 }],
          },
        ],
      })
      await page.goto(owner.restaurant.public_url)

      const html = page.locator('html')
      await expect(html).toHaveAttribute('lang', language.code)
      await expect(html).toHaveAttribute('dir', language.rtl ? 'rtl' : 'ltr')
      await expect(searchBox(page)).toHaveAttribute('placeholder', language.search)
      await expect(page.locator('.tab[data-tab="all"]')).toHaveText(language.all)
      await expect(page.locator('.menu-credit')).toHaveText(language.credit)
      await expect(dish(page, `Dish ${language.code}`)).toBeVisible()
      // A menu in one language has nothing to switch to.
      await expect(page.locator('#pop-lang')).toHaveCount(0)
    }
  })

  test('an Arabic-only menu opens right to left, and its credit leads to the Arabic site', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      main_locale: 'ar',
      name: { ar: 'مشاوي الأرز' },
      categories: [{ name: { ar: 'المقبلات' }, dishes: [{ name: { ar: 'حمص' }, price: 6 }] }],
    })
    await page.goto(owner.restaurant.public_url)

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.getByRole('heading', { level: 1, name: 'مشاوي الأرز' })).toBeVisible()
    await expect(page).toHaveTitle('مشاوي الأرز: المنيو والأسعار')
    await expect(page.locator('.menu-credit a')).toHaveAttribute('href', /\/ar$/)
  })

  test('a name not written in the second language shows in the main one', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'fr', categories: MENU })
    await page.goto(`${owner.restaurant.public_url}?lang=fr`)

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('heading', { level: 2, name: 'Entrées' })).toBeVisible()
    await expect(dish(page, 'Houmous')).toBeVisible()
    // Never blank: the English name stands in, in its own direction.
    await expect(dish(page, 'Fattoush').locator('.dish-name bdi')).toHaveText('Fattoush')
    // The language button names the language the page is in.
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.dock .is-lang')).toContainText('Français')
  })

  test('a second language the owner switched off is gone, and its address opens the main one', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      package: 'pro',
      second_locale: 'ar',
      switched_off: ['languages'],
      categories: MENU,
    })
    await page.goto(`${owner.restaurant.public_url}?lang=ar`)

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(dish(page, 'Hummus')).toBeVisible()
    await expect(page.getByText('حمص')).toHaveCount(0)
    await expect(page.locator('[data-pop-open="lang"]')).toHaveCount(0)
    await expect(page.locator('link[hreflang]')).toHaveCount(0)
  })

  test('a language the menu is not written in opens the main one', async ({ page, scenario }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })
    await page.goto(`${owner.restaurant.public_url}?lang=de`)

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(dish(page, 'Hummus')).toBeVisible()
  })

  test('each language has its own address for search engines', async ({ page, scenario }) => {
    const owner = await scenario({ package: 'pro', second_locale: 'ar', categories: MENU })
    const url = owner.restaurant.public_url

    await page.goto(url)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url)
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', url)
    await expect(page.locator('link[hreflang="ar"]')).toHaveAttribute('href', `${url}?lang=ar`)
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', url)
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')

    await page.goto(`${url}?lang=ar`)
    await expect(page).toHaveTitle('E2E Kitchen: المنيو والأسعار')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${url}?lang=ar`)
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'ar_AR')
    // The menu's data for search engines is in the page's language.
    const schema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    ) as { hasMenu: { inLanguage: string; hasMenuSection: { name: string }[] } }
    expect(schema.hasMenu.inLanguage).toBe('ar')
    expect(schema.hasMenu.hasMenuSection[0]?.name).toBe('المقبلات')
  })
})

test.describe('searching in Arabic and with accents', () => {
  test('a guest finds a dish the way they type it, without hamza, tashkeel or accents @matrix', async ({
    page,
    scenario,
  }) => {
    const owner = await scenario({
      main_locale: 'ar',
      second_locale: 'fr',
      package: 'pro',
      categories: [
        {
          name: { ar: 'الحلويات', fr: 'Desserts' },
          dishes: [
            { name: { ar: 'كنافة بالجبنة', fr: 'Knafeh' }, price: 4 },
            { name: { ar: 'أرز بحليب', fr: 'Riz au lait' }, price: 3 },
            { name: { ar: 'حلوى الجزر', fr: 'Crème brûlée' }, price: 5 },
            { name: { ar: 'مُهَلَّبِيَّة', fr: 'Mouhalabieh' }, price: 3 },
          ],
        },
      ],
    })
    await page.goto(owner.restaurant.public_url)
    const shown = page.locator('article.dish:visible')

    // ة typed as ه.
    await searchBox(page).fill('كنافه')
    await expect(shown).toHaveCount(1)
    await expect(dish(page, 'كنافة بالجبنة')).toBeVisible()

    // أ typed as a bare alef.
    await searchBox(page).fill('ارز')
    await expect(shown).toHaveCount(1)
    await expect(dish(page, 'أرز بحليب')).toBeVisible()

    // ى typed as ي.
    await searchBox(page).fill('حلوي')
    await expect(shown).toHaveCount(1)
    await expect(dish(page, 'حلوى الجزر')).toBeVisible()

    // Written with its short vowels, typed without.
    await searchBox(page).fill('مهلبية')
    await expect(shown).toHaveCount(1)
    await expect(dish(page, 'مُهَلَّبِيَّة')).toBeVisible()

    await searchBox(page).fill('')
    await expect(shown).toHaveCount(4)

    // In French, a phone keyboard's plain letters find the accented ones.
    await page.goto(`${owner.restaurant.public_url}?lang=fr`)
    await searchBox(page).fill('creme brulee')
    await expect(shown).toHaveCount(1)
    await expect(dish(page, 'Crème brûlée')).toBeVisible()
    await searchBox(page).fill('CRÈME')
    await expect(shown).toHaveCount(1)
  })
})
