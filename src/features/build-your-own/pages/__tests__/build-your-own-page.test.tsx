import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeBuild, makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import type { Dish } from '@/features/menu'
import { useUiStore } from '@/stores/ui.store'
import { BuildYourOwnPage } from '@/features/build-your-own/pages/build-your-own-page'

let mock: MockAdapter

const CATEGORIES = [
  makeCategory({ id: 1, name: { en: 'Burgers', ar: null } }),
  makeCategory({ id: 2, name: { en: 'Pizzas', ar: null } }),
]

const PIZZA = makeBuild({
  id: 3,
  name: { en: 'Your pizza', ar: null },
  shape: 'split',
  parts: [2, 1],
  category_id: 2,
  choices: [{ id: 30, dish_id: 10, name: null, price: null, part_prices: { '2': '7.00' } }],
})
const SCOOPS = makeBuild({ id: 5, name: { en: 'Your scoops', ar: null } })
const TOPPING = makeBuild({
  id: 6,
  name: { en: 'Topping', ar: null },
  parts: [1],
  choices: [
    { id: 60, dish_id: null, name: { en: 'Vanilla', ar: null }, price: '0.00', part_prices: {} },
    { id: 61, dish_id: null, name: { en: 'Pistachio', ar: null }, price: '1.00', part_prices: {} },
    // Saved without a price: never a choice guests meet.
    { id: 62, dish_id: null, name: { en: 'Caramel', ar: null }, price: null, part_prices: {} },
  ],
})
const DUO = makeBuild({
  id: 7,
  name: { en: 'Burger duo', ar: null },
  shape: 'split',
  parts: [2],
  category_id: 1,
  choices: [],
})

const DISHES: Dish[] = [
  makeDish({ id: 10, name: { en: 'Margherita' }, price: '12.00', category_id: 2 }),
  makeDish({ id: 11, name: { en: 'Pepperoni' }, price: '16.00', category_id: 2 }),
  makeDish({
    id: 13,
    name: { en: 'Build your pizza' },
    price: null,
    category_id: 2,
    image_url: 'https://qayema.test/pizza.webp',
    builds: [PIZZA],
  }),
  makeDish({
    id: 20,
    name: { en: 'Three scoops' },
    price: '4.00',
    category_id: 3,
    builds: [SCOOPS, TOPPING],
  }),
  makeDish({ id: 14, name: { en: 'Cheeseburger' }, price: '9.00', category_id: 1 }),
  makeDish({ id: 15, name: { en: 'Burger plate' }, price: '2.00', category_id: 1, builds: [DUO] }),
]

function stub(
  dishes: Dish[] = DISHES,
  { limit = 40, categories = CATEGORIES, builds = 10 as number | null } = {},
) {
  const session = makeSessionUser({ languages: ['en'] })
  session.restaurant!.limits.builds = { used: 0, limit: builds }
  mock.onGet('/api/user').reply(200, { data: session })
  mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
  mock
    .onGet('/api/dishes')
    .reply(200, { data: dishes, meta: { used: dishes.length, limit, currency: 'USD' } })
}

/** A build's card, by the title above its choices (the dish's name is its heading). */
function card(title: string): HTMLElement {
  return screen.getByText(title, { selector: 'p' }).closest('article')!
}

describe('BuildYourOwnPage', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useUiStore.setState({ buildsDishId: null })
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('shows a card per build, in the dishes’ order, with what it is and its least price', async () => {
    stub()
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    const pizza = await screen.findByRole('heading', { name: 'Build your pizza' })
    const names = screen.getAllByRole('heading', { level: 3 }).map((each) => each.textContent)
    expect(names).toEqual(['Build your pizza', 'Three scoops', 'Three scoops', 'Burger plate'])
    // The dishes guests build the restaurant may have: three dishes here.
    expect(await screen.findByText('3 / 10')).toBeInTheDocument()

    const pizzaCard = pizza.closest('article')!
    expect(pizzaCard).toHaveTextContent('Your pizza')
    expect(pizzaCard).toHaveTextContent('Whole and halves, from Pizzas')
    // A whole Margherita is the least it costs.
    expect(pizzaCard).toHaveTextContent('From $12.00')
    expect(within(pizzaCard).queryByText('Guests can’t see it yet')).not.toBeInTheDocument()

    // The dish's price and three of the free scoop.
    expect(card('Your scoops')).toHaveTextContent('3 pieces, your own list of 2')
    expect(card('Your scoops')).toHaveTextContent('From $4.00')
    expect(card('Topping')).toHaveTextContent('1 piece, your own list of 3')
    expect(card('Topping')).toHaveTextContent('From $4.00')

    // One burger to pick from: guests do not see it.
    const duo = card('Burger duo')
    expect(duo).toHaveTextContent('Halves, from Burgers')
    expect(within(duo).getByText("Guests can't see it yet")).toHaveAttribute(
      'title',
      'Guests see it once at least 2 choices can be picked.',
    )
    expect(duo).not.toHaveTextContent('From')
  })

  it('counts a pizza priced only by size at its cheapest size, by its share', async () => {
    stub([
      ...DISHES.filter((dish) => dish.id !== 10 && dish.id !== 11),
      makeDish({ id: 10, name: { en: 'Margherita' }, price: '12.00', category_id: 2 }),
      makeDish({
        id: 11,
        name: { en: 'Pepperoni' },
        price: null,
        category_id: 2,
        variants: [
          {
            id: 110,
            name: { en: 'Size' },
            options: [
              { id: 111, name: { en: 'Small' }, price: '9.00' },
              { id: 112, name: { en: 'Large' }, price: '16.00' },
            ],
          },
        ],
      }),
    ])
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    // A whole small Pepperoni is less than a whole Margherita.
    const pizza = await screen.findByRole('heading', { name: 'Build your pizza' })
    expect(pizza.closest('article')).toHaveTextContent('From $9.00')
  })

  it('says when a build offers only some of its category’s dishes', async () => {
    stub([
      ...DISHES.filter((dish) => dish.id !== 13),
      makeDish({
        id: 13,
        name: { en: 'Build your pizza' },
        price: null,
        category_id: 2,
        builds: [{ ...PIZZA, dish_ids: [11] }],
      }),
    ])
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    const pizza = (await screen.findByRole('heading', { name: 'Build your pizza' })).closest(
      'article',
    )!
    expect(pizza).toHaveTextContent('Whole and halves, 1 of 2 from Pizzas')
    // Pepperoni alone: guests do not see it.
    expect(within(pizza).getByText("Guests can't see it yet")).toBeInTheDocument()
  })

  it('names a build titled with its dish once', async () => {
    stub([
      makeDish({ id: 10, name: { en: 'Margherita' }, price: '12.00', category_id: 2 }),
      makeDish({ id: 11, name: { en: 'Pepperoni' }, price: '16.00', category_id: 2 }),
      makeDish({
        id: 13,
        name: { en: 'Build your pizza' },
        price: null,
        category_id: null,
        builds: [{ ...PIZZA, name: { en: 'Build your pizza', ar: null } }],
      }),
    ])
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    const tile = (await screen.findByRole('heading', { name: 'Build your pizza' })).closest(
      'article',
    )!
    expect(within(tile).getAllByText('Build your pizza')).toHaveLength(1)
  })

  it('shows a picture and a short example before the first build', async () => {
    const user = userEvent.setup()
    stub([makeDish({ id: 1, name: { en: 'Margherita' } })])
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    expect(await screen.findByText('Let guests build a dish')).toBeInTheDocument()
    expect(
      document.querySelector('img[src="/assets/images/dashboard/empty-build.webp"]'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Like a half and half pizza, or three scoops of ice cream.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Make your first build' }))
    expect(await screen.findByRole('heading', { name: 'New build' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Build steps' })).toBeInTheDocument()
  })

  it('says when the dishes did not load, and tries again', async () => {
    const user = userEvent.setup()
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
    mock.onGet('/api/categories').reply(200, { data: CATEGORIES, meta: { used: 2, limit: 10 } })
    mock.onGet('/api/dishes').replyOnce(500, { message: 'Server error' })
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    expect(await screen.findByText('That did not load')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New build' })).toBeDisabled()

    mock
      .onGet('/api/dishes')
      .reply(200, { data: DISHES, meta: { used: 6, limit: 40, currency: 'USD' } })
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Build your pizza' })).toBeInTheDocument()
  })

  it('makes no build past the restaurant’s builds, or with no room among the package’s dishes', async () => {
    // Three dishes guests build, as many as an admin allows.
    stub(DISHES, { builds: 3 })
    const { unmount } = renderWithProviders(<BuildYourOwnPage locale="en" />)
    expect(
      await screen.findByText(
        'You have 3 builds, as many as your restaurant may have. Delete one to make another.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New build' })).toBeDisabled()
    unmount()

    // No cap set: no count to reach.
    stub(DISHES, { builds: null })
    renderWithProviders(<BuildYourOwnPage locale="en" />)
    expect(await screen.findByRole('heading', { name: 'Build your pizza' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New build' })).toBeEnabled())
  })

  it('makes no build past the package’s dishes, or without a category for its dish', async () => {
    stub(DISHES, { limit: 6 })
    const { unmount } = renderWithProviders(<BuildYourOwnPage locale="en" />)
    expect(await screen.findByText(/each build is a dish/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New build' })).toBeDisabled()
    unmount()

    stub([], { categories: [] })
    renderWithProviders(<BuildYourOwnPage locale="en" />)
    expect(await screen.findByText(/so it needs a category/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New build' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Make your first build' })).toBeDisabled()
  })

  it('says when the categories did not load', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
    mock.onGet('/api/categories').reply(500, { message: 'Server error' })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: DISHES, meta: { used: 6, limit: 40, currency: 'USD' } })
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    expect(await screen.findByText('That did not load')).toBeInTheDocument()
  })

  it('deletes a build by saving its dish’s others as they are', async () => {
    const user = userEvent.setup()
    stub()
    mock.onPatch('/api/dishes/20').reply(200, { data: makeDish({ id: 20 }) })
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    await user.click(
      await screen.findByRole('button', { name: 'Delete Your scoops on Three scoops' }),
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Guests will no longer build Three scoops this way.')
    await user.click(within(dialog).getByRole('button', { name: 'Delete build' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({
      builds: [
        {
          id: 6,
          name: { en: 'Topping' },
          shape: 'pieces',
          parts: [1],
          category_id: null,
          dish_ids: null,
          choices: [
            { id: 60, name: { en: 'Vanilla' }, price: 0 },
            { id: 61, name: { en: 'Pistachio' }, price: 1 },
            { id: 62, name: { en: 'Caramel' }, price: null },
          ],
        },
      ],
    })
    expect(await screen.findByText('Build deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('deletes a dish with its only build, saying it leaves the menu', async () => {
    const user = userEvent.setup()
    stub()
    mock.onDelete('/api/dishes/13').reply(204)
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    await user.click(
      await screen.findByRole('button', { name: 'Delete Your pizza on Build your pizza' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Delete Build your pizza?' })
    expect(dialog).toHaveTextContent('It leaves your menu.')
    await user.click(within(dialog).getByRole('button', { name: 'Delete dish' }))

    await waitFor(() => expect(mock.history.delete).toHaveLength(1))
    expect(mock.history.delete[0]!.url).toBe('/api/dishes/13')
    expect(mock.history.patch).toHaveLength(0)
    expect(await screen.findByText('Dish deleted')).toBeInTheDocument()
  })

  it('keeps the build when the delete is called off, or refused', async () => {
    const user = userEvent.setup()
    stub()
    mock.onPatch('/api/dishes/20').reply(500, { message: 'Server error' })
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    await user.click(await screen.findByRole('button', { name: 'Delete Topping on Three scoops' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(mock.history.patch).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Delete Topping on Three scoops' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete build' }),
    )
    expect(await screen.findByText('Could not delete the build')).toBeInTheDocument()
  })

  it('brings the builds of the dish the owner came from into view', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    useUiStore.setState({ buildsDishId: 15 })
    stub()
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    await screen.findByRole('heading', { name: 'Burger plate' })
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'center' }))
    expect(scroll.mock.contexts[0]).toBe(card('Burger duo'))
    expect(useUiStore.getState().buildsDishId).toBeNull()
  })

  it('opens a build in the editor, and comes back to the list', async () => {
    const user = userEvent.setup()
    stub()
    renderWithProviders(<BuildYourOwnPage locale="en" />)

    await user.click(await screen.findByRole('button', { name: 'Edit Topping on Three scoops' }))
    expect(screen.getByRole('heading', { name: 'Edit build' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to your builds' }))
    expect(await screen.findByText('Topping', { selector: 'p' })).toBeInTheDocument()
  })
})
