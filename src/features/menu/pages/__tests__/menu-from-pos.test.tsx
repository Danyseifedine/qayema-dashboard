import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeBuild, makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { CategoriesPage } from '@/features/menu/pages/categories-page'
import { DishesPage } from '@/features/menu/pages/dishes-page'

let mock: MockAdapter

const mezze = makeCategory({
  id: 1,
  name: { en: 'Mezze', ar: 'مقبلات' },
  description: { en: 'Small plates', ar: null },
  icon: null,
  from_pos: true,
})
const old = makeCategory({ id: 2, name: { en: 'Old specials', ar: null }, from_pos: false })
const gone = makeCategory({
  id: 3,
  name: { en: 'Winter', ar: null },
  from_pos: true,
  pos_removed: true,
})

const hummus = makeDish({
  id: 11,
  name: { en: 'Hummus', ar: 'حمص' },
  ingredients: { en: 'Chickpeas, Tahini', ar: 'حمص حب، طحينة' },
  price: '5.50',
  category_id: 1,
  from_pos: true,
  variants: [
    {
      id: 1,
      name: { en: 'Size', ar: null },
      options: [
        { id: 1, name: { en: 'Small', ar: null }, price: '0.00' },
        { id: 2, name: { en: 'Large', ar: null }, price: '2.00' },
      ],
    },
  ],
  addons: [{ id: 3, name: { en: 'Pine nuts', ar: null }, price: '1.00' }],
})
const mine = makeDish({
  id: 12,
  name: { en: 'Grandma soup', ar: null },
  category_id: 2,
  from_pos: false,
})
const soldOut = makeDish({
  id: 13,
  name: { en: 'Kibbeh', ar: null },
  category_id: 99,
  price: null,
  is_available: false,
  image_url: 'https://cdn.test/kibbeh.webp',
  from_pos: true,
  pos_removed: true,
})

function connected() {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ pos_connected: true }) })
}

describe('The menu while it comes from a POS', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/categories').reply(200, {
      data: [mezze, old, gone],
      meta: { used: 3, limit: 10 },
    })
    mock.onGet('/api/dishes').reply(200, {
      data: [hummus, mine, soldOut],
      meta: { used: 3, limit: 40, currency: 'USD' },
    })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('offers no adding or deleting of dishes, says where they come from, and marks hidden ones', async () => {
    connected()
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: 'View Hummus' })).toBeInTheDocument()
    expect(screen.getByText(/Your menu comes from your POS/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add dish' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    expect(screen.getByText('Hidden while connected')).toBeInTheDocument()
    expect(screen.getByText('Removed in your POS')).toBeInTheDocument()
    // Whether it is sold out is the POS's.
    for (const toggle of screen.getAllByRole('switch')) expect(toggle).toBeDisabled()
  })

  it('opens a dish to be looked at, with everything its POS sent', async () => {
    connected()
    const user = userEvent.setup()
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'View Hummus' }))
    const dialog = await screen.findByRole('dialog', { name: 'Dish from your POS' })

    expect(within(dialog).getByText('حمص')).toBeInTheDocument()
    expect(within(dialog).getByText('Mezze')).toBeInTheDocument()
    expect(within(dialog).getByText('Chickpeas, Tahini')).toBeInTheDocument()
    expect(within(dialog).getByText('حمص حب، طحينة')).toBeInTheDocument()
    expect(within(dialog).getByText('Large')).toBeInTheDocument()
    expect(within(dialog).getByText('Pine nuts')).toBeInTheDocument()
    expect(within(dialog).getByText('On the menu')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says a dish the owner made is hidden until they disconnect', async () => {
    connected()
    const user = userEvent.setup()
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'View Kibbeh' }))
    const dialog = await screen.findByRole('dialog', { name: 'Dish from your POS' })
    expect(within(dialog).getByText('Sold out')).toBeInTheDocument()
    expect(within(dialog).getByText('No category')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'View Grandma soup' }))
    expect(await screen.findByRole('dialog', { name: 'Your dish' })).toBeInTheDocument()
    expect(screen.getByText(/It comes back when you disconnect/)).toBeInTheDocument()
  })

  it('waits for the first sync instead of offering to add dishes', async () => {
    connected()
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    expect(await screen.findByText('Your dishes come from your POS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
  })

  it('offers no adding or deleting of categories, and marks hidden ones', async () => {
    connected()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Edit Mezze' })).toBeInTheDocument()
    expect(screen.getByText(/Your menu comes from your POS/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add category' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    expect(screen.getByText('Hidden while connected')).toBeInTheDocument()
    expect(screen.getByText('Removed in your POS')).toBeInTheDocument()
  })

  it('shows a category’s text from its POS and saves only its icon', async () => {
    connected()
    mock.onPatch('/api/categories/1').reply(200, { data: { ...mezze, icon: 'pizza' } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Mezze' }))
    const dialog = await screen.findByRole('dialog')

    expect(
      within(dialog).getByText(/Its name and description come from your POS/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('مقبلات')).toBeInTheDocument()
    expect(within(dialog).getByText('Small plates')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Save/ }))
    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    // Nothing went to the writing help: there is nothing to translate.
    expect(mock.history.post.filter((call) => call.url?.includes('writing'))).toHaveLength(0)
  })

  it('waits for the first sync instead of offering to add categories', async () => {
    connected()
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByText('Your categories come from your POS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
  })

  it('shows the server’s refusal when the icon cannot be saved', async () => {
    connected()
    mock.onPatch('/api/categories/1').reply(500, { message: 'Pick an icon from the list.' })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Mezze' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Save/ }))

    expect(await within(dialog).findByText('Pick an icon from the list.')).toBeInTheDocument()
  })

  it('offers no new dish in a category with none', async () => {
    connected()
    const user = userEvent.setup()
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('tab', { name: /Winter/ }))
    expect(await screen.findByText('Nothing in this category')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
  })

  it('shows a dish with builds, an ingredient line in one language and an unnamed category', async () => {
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ pos_connected: true, plan: { ...FULL_PLAN, build_your_own: false } }),
    })
    mock.onGet('/api/categories').reply(200, {
      data: [makeCategory({ id: 1, name: { en: null, ar: null }, from_pos: true })],
      meta: { used: 1, limit: 10 },
    })
    mock.onGet('/api/dishes').reply(200, {
      data: [
        makeDish({
          id: 21,
          name: { en: 'Pizza', ar: null },
          ingredients: { en: 'Dough', ar: null },
          category_id: 1,
          from_pos: true,
          builds: [makeBuild()],
        }),
      ],
      meta: { used: 1, limit: 40, currency: 'USD' },
    })
    const user = userEvent.setup()
    renderWithProviders(
      <DishesPage
        locale="en"
        onOpenCategories={vi.fn()}
        onOpenBuilds={vi.fn()}
        onOpenOffers={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'View Pizza' }))
    const dialog = await screen.findByRole('dialog', { name: 'Dish from your POS' })
    expect(within(dialog).getByText(/Build your own is off/)).toBeInTheDocument()
    expect(within(dialog).getByText('Dough')).toBeInTheDocument()
    expect(within(dialog).getByText('No category')).toBeInTheDocument()
  })
})
