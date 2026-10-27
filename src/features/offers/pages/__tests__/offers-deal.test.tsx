import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { useUiStore } from '@/stores/ui.store'
import { makeCategory, makeDish } from '@/test/factories/menu'
import { makeDeal, makeOffer } from '@/test/factories/offers'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { OffersPage } from '@/features/offers/pages/offers-page'
import type { Offer } from '@/features/offers/schemas/offer.schema'

let mock: MockAdapter

const UPLOAD_KEY = '0b7e1c2a-5f3d-4e8b-9a6c-2d1f0e9b8a7c'

type User = ReturnType<typeof userEvent.setup>

const SLOTS = {
  banner: { used: 0, limit: 3 },
  popup: { used: 0, limit: 1 },
  ad: { used: 0, limit: 1 },
}

const deals = makeCategory({ id: 6, name: { en: 'Deals' } })
const pizzas = makeCategory({ id: 7, name: { en: 'Pizzas' } })
const margherita = makeDish({ id: 3, name: { en: 'Margherita' }, price: '12.00' })
/** The deal dish of the offer "Happy hour", on the dishes list like any dish. */
const familyMeal = makeDish({
  id: 40,
  name: { en: 'Family meal' },
  price: '25.00',
  offer: { id: 1, title: { en: 'Happy hour' }, status: 'live', next_start: null },
})
/** "Happy hour" with its deal dish, which a tap opens. */
const withDeal = makeOffer({ action: 'dishes', dish_ids: [40], deal: makeDeal() })

function stub(data: Offer[], meta: Record<string, unknown> = {}) {
  mock.onGet('/api/offers').reply(200, {
    data,
    meta: { limit: 30, slots: SLOTS, timezone: 'Asia/Beirut', currency: 'USD', stats: {}, ...meta },
  })
}

function categories(list = [deals]) {
  mock.onGet('/api/categories').reply(200, { data: list, meta: { used: list.length, limit: 10 } })
}

function sent(method: 'post' | 'patch'): Record<string, unknown> {
  const call = mock.history[method].find((request) => request.url?.startsWith('/api/offers'))
  return JSON.parse(call!.data as string) as Record<string, unknown>
}

function fetched(url: string): number {
  return mock.history.get.filter((request) => request.url === url).length
}

async function next(user: User) {
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

/** A new offer titled `title`, on its third step, giving a deal dish. */
async function newDeal(user: User, title = 'Family night') {
  await user.click(await screen.findByRole('button', { name: 'Create your first offer' }))
  await user.type(screen.getByLabelText(/^Title/), title)
  await next(user)
  await next(user)
  await user.click(await screen.findByRole('tab', { name: 'A deal' }))
}

function dishName() {
  return screen.getByRole('textbox', { name: /^Deal name/ })
}

describe('OffersPage: a deal dish', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
    mock.onGet('/api/dishes').reply(200, {
      data: [margherita, familyMeal],
      meta: { used: 2, limit: null, currency: 'USD' },
    })
    categories()
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    useUiStore.setState({ offerToEdit: null })
    vi.restoreAllMocks()
  })

  it('makes an offer whose deal dish a tap opens, in the only category', async () => {
    stub([])
    mock.onPost('/api/offers').reply(201, { data: withDeal })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await newDeal(user)
    // Named after the offer, in the menu's only category, with the offer's picture.
    expect(dishName()).toHaveValue('Family night')
    expect(await screen.findByRole('combobox', { name: /Category/ })).toHaveValue('Deals')
    expect(screen.getByRole('switch', { name: "Use the offer's picture" })).toBeChecked()
    expect(
      screen.getByText(
        'This dish shows on your menu only while the offer is running, and guests can order it only then.',
      ),
    ).toBeInTheDocument()
    // No discount and no tap to choose: the deal is what a tap opens.
    expect(screen.queryByRole('tab', { name: 'Percent off' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Open a link' })).toBeNull()

    await user.clear(dishName())
    await user.type(dishName(), 'Family meal')
    await user.type(
      screen.getByRole('textbox', { name: /^What it includes/ }),
      '2 pizzas, 4 drinks',
    )
    await next(user)
    expect(await screen.findByText("Set the deal dish's price.")).toBeInTheDocument()
    await user.type(screen.getByLabelText('Price'), '25')
    await next(user)
    await next(user)

    expect(screen.getByText('Deal: Family meal, $25.00')).toBeInTheDocument()
    expect(screen.getByText('A tap opens the deal dish')).toBeInTheDocument()
    const sessions = fetched('/api/user')
    const dishes = fetched('/api/dishes')
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(true))
    expect(sent('post')).toMatchObject({
      action: 'dishes',
      discount_type: 'none',
      dish_ids: [],
      deal: {
        name: { en: 'Family meal' },
        ingredients: { en: '2 pizzas, 4 drinks' },
        price: 25,
        currency: null,
        category_id: 6,
        use_offer_image: true,
      },
    })
    // The new dish counts against the package and shows on the Dishes page.
    await waitFor(() => expect(fetched('/api/user')).toBeGreaterThan(sessions))
    expect(fetched('/api/dishes')).toBeGreaterThan(dishes)
  })

  it('goes back to nothing to order from a deal not saved yet, without asking', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await newDeal(user)
    // Picking the open choice again changes nothing.
    await user.click(screen.getByRole('tab', { name: 'A deal' }))
    expect(dishName()).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Nothing to order' }))
    expect(screen.queryByRole('dialog', { name: 'Remove the deal dish?' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Nothing' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('textbox', { name: /^Deal name/ })).toBeNull()

    // A discount, then nothing again, keeps a tap doing nothing.
    await user.click(screen.getByRole('tab', { name: 'A discount on your dishes' }))
    expect(screen.getByRole('tab', { name: 'Percent off' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(screen.getByRole('tab', { name: 'Nothing to order' }))
    expect(screen.queryByRole('tab', { name: 'Percent off' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Nothing' })).toHaveAttribute('aria-selected', 'true')
  })

  it('names the deal dish after the offer until the owner writes its name', async () => {
    stub([])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await newDeal(user, 'Brunch')
    expect(dishName()).toHaveValue('Brunch')

    await user.click(screen.getByRole('button', { name: /^Step 1: Picture and text/ }))
    await user.type(screen.getByLabelText(/^Title/), ' box')
    await user.click(screen.getByRole('button', { name: /^Step 3: Tap and discount/ }))
    expect(dishName()).toHaveValue('Brunch box')

    await user.clear(dishName())
    await user.type(dishName(), 'Big brunch')
    await user.click(screen.getByRole('button', { name: /^Step 1: Picture and text/ }))
    await user.type(screen.getByLabelText(/^Title/), ' for two')
    await user.click(screen.getByRole('button', { name: /^Step 3: Tap and discount/ }))
    expect(dishName()).toHaveValue('Big brunch')
  })

  it('prices it in the second currency, in a chosen category, with a photo of its own', async () => {
    stub([], { second_currency: 'LBP', exchange_rate: '89000' })
    categories([deals, pizzas])
    mock.onPost('/api/offers').reply(201, { data: withDeal })
    mock
      .onPost('/api/uploads/temp')
      .reply(200, { key: UPLOAD_KEY, optimized_size: '40 KB', saved_percent: 0 })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:meal')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await newDeal(user)
    await user.type(screen.getByLabelText('Price'), '2000000')
    const currencies = screen.getByRole('tablist', { name: 'Currency' })
    await user.click(within(currencies).getByRole('tab', { name: 'LBP' }))
    await user.click(within(currencies).getByRole('tab', { name: 'USD' }))
    await user.click(within(currencies).getByRole('tab', { name: 'LBP' }))

    // Two categories: none is picked for the owner.
    await next(user)
    expect(await screen.findByText('Choose a category for the deal dish.')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: /Category/ }))
    await user.click(await screen.findByRole('option', { name: 'Pizzas' }))

    await user.click(screen.getByRole('switch', { name: "Use the offer's picture" }))
    await user.upload(
      document.querySelector<HTMLInputElement>('input[type="file"]')!,
      new File([new Uint8Array(64)], 'meal.jpg', { type: 'image/jpeg' }),
    )
    expect(await screen.findByText('meal.jpg')).toBeInTheDocument()
    // The offer replaces the dish's photo but never removes it.
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
    await next(user)
    await next(user)
    expect(screen.getByText(/^Deal: Family night, LBP\s?2,000,000/)).toBeInTheDocument()
    expect(document.querySelector('img[src="blob:meal"]')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    await waitFor(() => expect(mock.history.post.some((r) => r.url === '/api/offers')).toBe(true))
    expect(sent('post')).toMatchObject({
      deal: {
        price: 2000000,
        currency: 'LBP',
        category_id: 7,
        use_offer_image: false,
        image_key: UPLOAD_KEY,
      },
    })
  })

  it('cannot be saved without a category, and points to Categories', async () => {
    stub([])
    categories([])
    const onOpenCategories = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={onOpenCategories} />)

    await newDeal(user)
    expect(
      await screen.findByText('The deal dish shows on your menu in one of your categories.'),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText('Price'), '25')
    await next(user)
    expect(await screen.findByText('Choose a category for the deal dish.')).toBeInTheDocument()

    // The offer typed so far is asked about before leaving for Categories.
    await user.click(screen.getByRole('button', { name: 'Go to Categories' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Leave without saving?' })).getByRole('button', {
        name: 'Leave',
      }),
    )
    expect(onOpenCategories).toHaveBeenCalled()
  })

  it("closes the deal dish once the package's dishes are all used", async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({
        languages: ['en'],
        limits: {
          dishes: { used: 40, limit: 40 },
          categories: { used: 1, limit: 10 },
          social_links: { used: 0, limit: 2 },
          builds: { used: 0, limit: 3 },
        },
      }),
    })
    stub([withDeal])
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'New offer' }))
    await user.type(screen.getByLabelText(/^Title/), 'Lunch')
    await next(user)
    await next(user)
    expect(await screen.findByRole('tab', { name: 'A deal' })).toBeDisabled()
    expect(
      screen.getByText(
        "Your package's dishes are all used, so a deal dish cannot be added. Delete a dish to make room.",
      ),
    ).toBeInTheDocument()

    // An offer that has its deal dish keeps it.
    await user.click(screen.getByRole('button', { name: 'Back to your offers' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Leave without saving?' })).getByRole('button', {
        name: 'Leave',
      }),
    )
    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 3: Tap and discount/ }))
    expect(screen.getByRole('tab', { name: 'A deal' })).toBeEnabled()
  })

  it('shows the deal on its card, and removes it only once the owner agrees', async () => {
    stub([withDeal])
    mock.onPatch('/api/offers/1').reply(200, { data: makeOffer() })
    const user = userEvent.setup()
    const { container } = renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Deal: Family meal, $25.00')).toBeInTheDocument()
    expect(container.querySelector('img[src="https://cdn.test/deal-thumb.webp"]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 3: Tap and discount/ }))
    expect(screen.getByRole('tab', { name: 'A deal' })).toHaveAttribute('aria-selected', 'true')
    expect(dishName()).toHaveValue('Family meal')
    expect(screen.getByLabelText('Price')).toHaveValue(25)
    // Its saved photo is its own until the owner picks the offer's picture.
    expect(screen.getByRole('switch', { name: "Use the offer's picture" })).not.toBeChecked()

    await user.click(screen.getByRole('tab', { name: 'Nothing to order' }))
    const ask = screen.getByRole('dialog', { name: 'Remove the deal dish?' })
    expect(
      within(ask).getByText('It leaves your menu when you save the offer.'),
    ).toBeInTheDocument()
    await user.click(within(ask).getByRole('button', { name: 'Cancel' }))
    expect(dishName()).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Nothing to order' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Remove the deal dish?' })).getByRole('button', {
        name: 'Remove it',
      }),
    )
    expect(screen.queryByRole('textbox', { name: /^Deal name/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Show its dishes' })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Step 5: Review/ }))
    expect(screen.getByText('Nothing to order')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save offer' }))

    await waitFor(() => expect(mock.history.patch.length).toBe(1))
    expect(sent('patch')).toMatchObject({ deal: null, action: 'none', dish_ids: [] })
  })

  it('turns a deal into a discount on other dishes, which never lists a deal dish', async () => {
    stub([withDeal])
    mock.onPatch('/api/offers/1').reply(200, { data: makeOffer() })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Happy hour' }))
    await user.click(screen.getByRole('button', { name: /^Step 3: Tap and discount/ }))
    await user.click(screen.getByRole('tab', { name: 'A discount on your dishes' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Remove the deal dish?' })).getByRole('button', {
        name: 'Remove it',
      }),
    )
    expect(screen.getByRole('tab', { name: 'Percent off' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByRole('checkbox', { name: /Margherita/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Family meal/ })).toBeNull()
    await user.type(screen.getByLabelText('Percent off'), '10')
    await user.click(screen.getByRole('checkbox', { name: /Margherita/ }))
    await user.click(screen.getByRole('button', { name: 'Save offer' }))

    await waitFor(() => expect(mock.history.patch.length).toBe(1))
    expect(sent('patch')).toMatchObject({
      deal: null,
      action: 'dishes',
      discount_type: 'percent',
      discount_value: 10,
      dish_ids: [3],
    })
  })

  it('puts what the server refused under the deal dish, on its step', async () => {
    stub([])
    mock.onPost('/api/offers').reply(422, {
      message: 'Your package holds 40 dishes.',
      code: 'validation_failed',
      errors: {
        'deal.name': ['Your package holds 40 dishes.'],
        'deal.price': ['The price must be more than 0.'],
        deal: ['An offer with a deal dish takes no discount.'],
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await newDeal(user)
    await user.type(await screen.findByLabelText('Price'), '25')
    await screen.findByDisplayValue('Deals')
    await next(user)
    await next(user)
    await user.click(screen.getByRole('button', { name: 'Add offer' }))

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Tap and discount' }),
    ).toBeInTheDocument()
    expect(dishName()).toHaveAccessibleDescription('Your package holds 40 dishes.')
    expect(screen.getByText('The price must be more than 0.')).toBeInTheDocument()
    expect(screen.getByText('An offer with a deal dish takes no discount.')).toBeInTheDocument()
  })

  it("brings the Dishes page up to date when a deal's offer is paused or deleted", async () => {
    stub([withDeal])
    mock
      .onPatch('/api/offers/1/active')
      .reply(200, { data: { ...withDeal, is_active: false, status: 'paused' } })
    mock.onDelete('/api/offers/1').reply(204)
    const user = userEvent.setup()
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    await screen.findByText('Deal: Family meal, $25.00')
    await waitFor(() => expect(fetched('/api/dishes')).toBe(1))
    await user.click(screen.getByRole('switch', { name: 'Show Happy hour on the menu' }))
    await waitFor(() => expect(fetched('/api/dishes')).toBe(2))

    const sessions = fetched('/api/user')
    await user.click(screen.getByRole('button', { name: 'Delete Happy hour' }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete this offer?' })).getByRole('button', {
        name: 'Delete offer',
      }),
    )
    await waitFor(() => expect(fetched('/api/dishes')).toBe(3))
    expect(fetched('/api/user')).toBeGreaterThan(sessions)
  })

  it("opens the offer a deal dish's window asked for, once", async () => {
    stub([withDeal])
    useUiStore.setState({ offerToEdit: 1 })
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Edit offer' })).toBeInTheDocument()
    expect(useUiStore.getState().offerToEdit).toBeNull()
  })

  it('forgets an offer asked for that is gone', async () => {
    stub([withDeal])
    useUiStore.setState({ offerToEdit: 99 })
    renderWithProviders(<OffersPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Deal: Family meal, $25.00')).toBeInTheDocument()
    await waitFor(() => expect(useUiStore.getState().offerToEdit).toBeNull())
    expect(screen.queryByRole('heading', { level: 2, name: 'Edit offer' })).toBeNull()
  })
})
