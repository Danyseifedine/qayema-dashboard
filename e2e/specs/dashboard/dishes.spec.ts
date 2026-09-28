import type { Locator, Page } from '@playwright/test'
import { either, expect, test } from '../../support/fixtures'
import { callApi, fixtureFile } from '../../support/helpers'

const PHOTO = fixtureFile('dish.jpg')
const NOT_AN_IMAGE = fixtureFile('not-an-image.txt')

/** One dish card, by the dish's name. */
const card = (page: Page, name: string) =>
  page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })

/** The dish names on the grid, in order. */
const names = (page: Page) => page.getByRole('article').getByRole('heading', { level: 3 })

const chips = (page: Page) =>
  page.getByRole('tablist', {
    name: either('Filter dishes by category', 'تصفية الأطباق حسب القسم'),
  })

const saved = (page: Page, path: RegExp, method = 'PATCH') =>
  page.waitForResponse(
    (response) =>
      path.test(new URL(response.url()).pathname) &&
      response.request().method() === method &&
      response.ok(),
  )

async function dragWithMouse(page: Page, from: Locator, to: Locator) {
  const start = await from.boundingBox()
  const end = await to.boundingBox()
  if (!start || !end) throw new Error('Nothing to drag between')

  const x = start.x + start.width / 2
  const y = start.y + start.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  // Past the sensor's 8px, so it reads as a drag rather than a tap.
  await page.mouse.move(x - 12, y, { steps: 4 })
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 20 })
  await page.mouse.up()
}

test.describe('dishes', () => {
  test('an owner adds a dish with a price, ingredients, a category and a photo @matrix', async ({
    page,
    owner,
  }) => {
    const { restaurant } = await owner({
      package: 'free',
      categories: [{ name: { en: 'Starters' } }, { name: { en: 'Grills' } }],
    })
    await page.goto('/dishes')

    await expect(page.getByText(either('No dishes yet', 'لا توجد أطباق بعد'))).toBeVisible()
    await page
      .getByRole('button', { name: either('Add dish', 'إضافة طبق') })
      .first()
      .click()

    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: either('New dish', 'طبق جديد') }),
    ).toBeVisible()
    await dialog.getByLabel(/^(Name|الاسم)/).fill('Mixed grill')
    await dialog.getByLabel(/^(Ingredients|المكوّنات)/).fill('Kafta, taouk and lamb')
    await dialog.getByLabel(/^(Price|السعر)/).fill('18.5')
    await dialog.getByRole('combobox', { name: /^(Category|القسم)/ }).click()
    await dialog.getByRole('option', { name: 'Grills' }).click()
    await expect(dialog.getByRole('combobox', { name: /^(Category|القسم)/ })).toHaveValue('Grills')

    await dialog.locator('input[type="file"]').setInputFiles(PHOTO)
    // The upload is optimised and previewed before anything is saved.
    await expect(dialog.getByText('dish.jpg')).toBeVisible()
    await expect(dialog.locator('img')).toHaveAttribute('src', /^blob:/)

    await dialog.getByRole('button', { name: either('Add dish', 'إضافة الطبق') }).click()
    await expect(dialog).toBeHidden()

    const dish = card(page, 'Mixed grill')
    await expect(dish).toContainText('Kafta, taouk and lamb')
    await expect(dish).toContainText('18.50')
    await expect(dish.locator('img')).toHaveAttribute('src', /^http.*\.webp/)
    await expect(chips(page).getByRole('tab', { name: /^Grills/ })).toHaveText('Grills1')

    // Guests see it, photo and all.
    await page.goto(restaurant.public_url)
    await expect(page.getByRole('img', { name: 'Mixed grill' })).toBeVisible()
    await expect(page.getByText('Kafta, taouk and lamb')).toBeVisible()
  })

  test('an owner edits a dish and removes its photo', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Mains' },
          dishes: [
            { name: { en: 'Moghrabieh' }, price: 14, ingredients: { en: 'Pearl couscous' } },
          ],
        },
      ],
    })
    await page.goto('/dishes')

    await page.getByRole('button', { name: 'Edit Moghrabieh', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Edit dish' })).toBeVisible()
    await expect(dialog.getByLabel(/^Name/)).toHaveValue('Moghrabieh')
    await expect(dialog.getByLabel(/^Price/)).toHaveValue('14')
    await dialog.getByLabel(/^Name/).fill('Chicken moghrabieh')
    await dialog.getByLabel(/^Price/).fill('16')
    await dialog.getByLabel(/^Ingredients/).fill('Pearl couscous, chicken, chickpeas')
    await dialog.locator('input[type="file"]').setInputFiles(PHOTO)
    await expect(dialog.getByText('dish.jpg')).toBeVisible()
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Dish saved')).toBeVisible()

    const dish = card(page, 'Chicken moghrabieh')
    await expect(dish).toContainText('16.00')
    await expect(dish).toContainText('chickpeas')
    await expect(dish.locator('img')).toBeVisible()

    // Remove the photo again.
    await page.getByRole('button', { name: 'Edit Chicken moghrabieh', exact: true }).click()
    await expect(dialog.getByText('Current image')).toBeVisible()
    await dialog.getByRole('button', { name: 'Remove' }).click()
    await expect(dialog.getByText('Current image')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(dish.locator('img')).toHaveCount(0)

    await page.reload()
    await expect(card(page, 'Chicken moghrabieh').locator('img')).toHaveCount(0)

    await page.goto(restaurant.public_url)
    await expect(page.getByText('Chicken moghrabieh')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Chicken moghrabieh' })).toHaveCount(0)
  })

  test('a file that is not an image is refused with a reason', async ({ page, owner }) => {
    await owner({ package: 'free', categories: [{ name: { en: 'Mains' } }] })
    await page.goto('/dishes')

    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]').setInputFiles(NOT_AN_IMAGE)
    await expect(dialog.getByText('Images must be JPEG, PNG, or WebP.')).toBeVisible()
    await expect(dialog.getByText('not-an-image.txt')).toHaveCount(0)

    // The form still saves, without a photo.
    await dialog.getByLabel(/^Name/).fill('Plain rice')
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(card(page, 'Plain rice').locator('img')).toHaveCount(0)
  })

  test('a dish needs an English name and a sensible price', async ({ page, owner }) => {
    await owner({ package: 'free', categories: [{ name: { en: 'Mains' } }] })
    await page.goto('/dishes')

    await page.getByRole('button', { name: 'Add dish' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^Price/).fill('-3')
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog.getByText('A dish name is required in English.')).toBeVisible()
    await expect(dialog.getByText('A price cannot be negative.')).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  test('switching a dish off hides it from guests at once', async ({ page, owner }) => {
    const { restaurant } = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Mezze' },
          dishes: [{ name: { en: 'Hummus' } }, { name: { en: 'Moutabal' } }],
        },
      ],
    })
    await page.goto('/dishes')

    const hummus = card(page, 'Hummus')
    const toggle = hummus.getByRole('switch', { name: 'Hummus is available' })
    await expect(toggle).toBeChecked()

    const off = saved(page, /\/api\/dishes\/\d+\/availability$/)
    await toggle.click()
    // Optimistic: the card changes before the server answers.
    await expect(toggle).not.toBeChecked()
    await expect(hummus).toContainText('Sold out')
    await expect(hummus).toContainText('Hidden')
    await off

    await page.reload()
    await expect(card(page, 'Hummus').getByRole('switch')).not.toBeChecked()

    await page.goto(restaurant.public_url)
    await expect(page.getByText('Moutabal')).toBeVisible()
    await expect(page.getByText('Hummus')).toHaveCount(0)

    await page.goto('/dishes')
    const on = saved(page, /\/api\/dishes\/\d+\/availability$/)
    await card(page, 'Hummus').getByRole('switch').click()
    await on
    await expect(card(page, 'Hummus')).not.toContainText('Sold out')

    await page.goto(restaurant.public_url)
    await expect(page.getByText('Hummus')).toBeVisible()
  })

  test('the category chips filter the grid, including dishes without one', async ({
    page,
    owner,
  }) => {
    const { categories } = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Salads' },
          dishes: [{ name: { en: 'Tabbouleh' } }, { name: { en: 'Fattoush' } }],
        },
        { name: { en: 'Sweets' }, dishes: [{ name: { en: 'Knefeh' } }] },
        { name: { en: 'Retired' }, dishes: [{ name: { en: 'Old special' } }] },
      ],
    })
    // Deleting a category keeps its dishes, without one.
    const deleted = await callApi(page, 'DELETE', `/api/categories/${categories[2]!.id}`)
    expect(deleted.status()).toBe(204)

    await page.goto('/dishes')
    const filter = chips(page)
    await expect(filter.getByRole('tab')).toHaveText(['All', 'Salads2', 'Sweets1', 'No category1'])
    await expect(filter.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    await expect(names(page)).toHaveCount(4)

    await filter.getByRole('tab', { name: /^Salads/ }).click()
    await expect(filter.getByRole('tab', { name: /^Salads/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(names(page)).toHaveText(['Tabbouleh', 'Fattoush'])

    await filter.getByRole('tab', { name: /^Sweets/ }).click()
    await expect(names(page)).toHaveText(['Knefeh'])

    await filter.getByRole('tab', { name: /^No category/ }).click()
    await expect(names(page)).toHaveText(['Old special'])

    // A dish added from a filtered view lands in that category.
    await filter.getByRole('tab', { name: /^Sweets/ }).click()
    await page.getByRole('button', { name: 'Add dish' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('combobox', { name: /^Category/ })).toHaveValue('Sweets')
    await dialog.getByLabel(/^Name/).fill('Maamoul')
    await dialog.getByRole('button', { name: 'Add dish' }).click()
    await expect(dialog).toBeHidden()
    await expect(names(page)).toHaveText(['Knefeh', 'Maamoul'])

    await filter.getByRole('tab', { name: 'All' }).click()
    await expect(names(page)).toHaveCount(5)
  })

  test('dragging a dish changes the order for good', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Breakfast' },
          dishes: [
            { name: { en: 'Manakish' } },
            { name: { en: 'Foul' } },
            { name: { en: 'Balila' } },
          ],
        },
      ],
    })
    await page.goto('/dishes')
    await expect(names(page)).toHaveText(['Manakish', 'Foul', 'Balila'])

    const reordered = saved(page, /\/api\/dishes\/reorder$/, 'POST')
    await dragWithMouse(
      page,
      card(page, 'Balila').getByRole('button', { name: 'Reorder' }),
      card(page, 'Manakish').getByRole('button', { name: 'Reorder' }),
    )
    await reordered
    await expect(names(page)).toHaveText(['Balila', 'Manakish', 'Foul'])

    await page.reload()
    await expect(names(page)).toHaveText(['Balila', 'Manakish', 'Foul'])
  })

  test('the keyboard reorders dishes too', async ({ page, owner }) => {
    const { categories } = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Breakfast' },
          dishes: [
            { name: { en: 'Manakish' } },
            { name: { en: 'Foul' } },
            { name: { en: 'Balila' } },
          ],
        },
      ],
    })
    await page.goto('/dishes')
    await expect(names(page)).toHaveText(['Manakish', 'Foul', 'Balila'])
    const foul = categories[0]!.dishes[1]!.id

    const grip = card(page, 'Manakish').getByRole('button', { name: 'Reorder' })
    await grip.focus()
    await page.keyboard.press('Space')
    await expect(grip).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(`was moved over droppable area ${foul}.`)).toBeAttached()
    const reordered = saved(page, /\/api\/dishes\/reorder$/, 'POST')
    await page.keyboard.press('Space')
    await reordered
    await expect(names(page)).toHaveText(['Foul', 'Manakish', 'Balila'])

    await page.reload()
    await expect(names(page)).toHaveText(['Foul', 'Manakish', 'Balila'])
  })

  test('changing a dish’s category moves it there', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Hot drinks' },
          dishes: [{ name: { en: 'Mint tea' } }, { name: { en: 'Lemonade' } }],
        },
        { name: { en: 'Cold drinks' }, dishes: [{ name: { en: 'Jallab' } }] },
      ],
    })
    await page.goto('/dishes')

    await page.getByRole('button', { name: 'Edit Lemonade', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('combobox', { name: /^Category/ })).toHaveValue('Hot drinks')
    await dialog.getByRole('combobox', { name: /^Category/ }).click()
    await dialog.getByRole('option', { name: 'Cold drinks' }).click()
    await dialog.getByRole('button', { name: 'Save dish' }).click()
    await expect(dialog).toBeHidden()

    const filter = chips(page)
    await expect(filter.getByRole('tab')).toHaveText(['All', 'Hot drinks1', 'Cold drinks2'])
    await filter.getByRole('tab', { name: /^Cold drinks/ }).click()
    await expect(names(page)).toContainText(['Jallab', 'Lemonade'])
    await filter.getByRole('tab', { name: /^Hot drinks/ }).click()
    await expect(names(page)).toHaveText(['Mint tea'])

    // The categories page counts it in its new place too.
    await page.goto('/categories')
    await expect(page.getByRole('button', { name: /^Cold drinks/ })).toContainText('2 dishes')
  })

  test('deleting a dish asks first', async ({ page, owner }) => {
    await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Specials' },
          dishes: [{ name: { en: 'Kibbeh nayyeh' } }, { name: { en: 'Sfeeha' } }],
        },
      ],
    })
    await page.goto('/dishes')
    await expect(page.getByText('2 / 40')).toBeVisible()

    await page.getByRole('button', { name: 'Delete Kibbeh nayyeh', exact: true }).click()
    const confirm = page.getByRole('dialog').filter({ hasText: 'Delete this dish?' })
    await expect(confirm).toContainText('It cannot be undone.')
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toBeHidden()
    await expect(card(page, 'Kibbeh nayyeh')).toBeVisible()

    await page.getByRole('button', { name: 'Delete Kibbeh nayyeh', exact: true }).click()
    await confirm.getByRole('button', { name: 'Delete' }).click()
    await expect(confirm).toBeHidden()
    await expect(page.getByText('Dish deleted')).toBeVisible()
    await expect(card(page, 'Kibbeh nayyeh')).toHaveCount(0)
    await expect(page.getByText('1 / 40')).toBeVisible()

    await page.reload()
    await expect(names(page)).toHaveText(['Sfeeha'])
  })

  test('without a category there is nowhere to put a dish', async ({ page, owner }) => {
    await owner({ package: 'free' })
    await page.goto('/dishes')

    await expect(page.getByText('Add a category first').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add dish' })).toBeDisabled()
    await page.getByRole('button', { name: 'Go to categories' }).click()
    await expect(page).toHaveURL(/\/categories$/)
    await expect(page.getByRole('heading', { name: 'Categories', level: 2 })).toBeVisible()
  })

  test('the free package stops at forty dishes', async ({ page, owner }) => {
    const { categories } = await owner({
      package: 'free',
      categories: [
        {
          name: { en: 'Everything' },
          dishes: Array.from({ length: 40 }, (_, index) => ({ name: { en: `Dish ${index + 1}` } })),
        },
      ],
    })
    await page.goto('/dishes')

    await expect(page.getByText('40 / 40')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add dish' })).toBeDisabled()
    await expect(
      page.getByText('You have used every dish your plan allows. Delete one to add another.'),
    ).toBeVisible()

    // The server refuses a forty-first whatever the page shows.
    const response = await callApi(page, 'POST', '/api/dishes', {
      name: { en: 'One too many' },
      category_id: categories[0]!.id,
      price: 5,
    })
    expect(response.status()).toBe(422)
    const body = (await response.json()) as { errors: Record<string, string[]> }
    expect(body.errors.name?.[0]).toBe('You have reached your plan limit of 40 dishes.')

    await page.getByRole('button', { name: 'Delete Dish 40', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('39 / 40')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add dish' })).toBeEnabled()
  })
})
