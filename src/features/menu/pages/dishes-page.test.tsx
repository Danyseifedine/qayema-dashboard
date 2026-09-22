import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/mocks/factories/menu'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { DishesPage } from './dishes-page'

let mock: MockAdapter

const categories = [
  makeCategory({ id: 1, name: { en: 'Starters', ar: null }, dishes_count: 2 }),
  makeCategory({ id: 2, name: { en: 'Mains', ar: null }, dishes_count: 1 }),
]

const dishes = [
  makeDish({ id: 10, name: { en: 'Hummus', ar: null }, price: '8.50', category_id: 1 }),
  makeDish({ id: 11, name: { en: 'Fattoush', ar: null }, price: '7.00', category_id: 1 }),
  makeDish({
    id: 12,
    name: { en: 'Lamb shank', ar: null },
    price: '24.50',
    category_id: 2,
    is_available: false,
  }),
]

function stub() {
  mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
  mock
    .onGet('/api/dishes')
    .reply(200, { data: dishes, meta: { used: 3, limit: 40, currency: 'USD' } })
}

describe('DishesPage', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('shows dishes as cards with prices, never a table', async () => {
    stub()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('$8.50')).toBeInTheDocument()
    expect(screen.getByText('$24.50')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('marks an unavailable dish as sold out', async () => {
    stub()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Sold out')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Lamb shank is available/ })).not.toBeChecked()
  })

  it('filters by category chip', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findAllByRole('article')).toHaveLength(3)

    await user.click(screen.getByRole('tab', { name: /Mains/ }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByText('Lamb shank')).toBeInTheDocument()
  })

  it('toggles availability through the API', async () => {
    stub()
    mock
      .onPatch('/api/dishes/10/availability')
      .reply(200, { data: { ...dishes[0]!, is_available: false } })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('switch', { name: /Hummus is available/ }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/dishes/10/availability')
      expect(patch).toBeDefined()
      expect(JSON.parse(patch!.data as string)).toEqual({ is_available: false })
    })
  })

  it('still shows dishes whose category was deleted', async () => {
    // Deleting a category orphans its dishes: they stay on the menu and keep
    // counting against the limit, so hiding them strands the owner.
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onGet('/api/dishes').reply(200, {
      data: [
        makeDish({ id: 20, name: { en: 'Orphan', ar: null }, category_id: null, category: null }),
      ],
      meta: { used: 1, limit: 40, currency: 'USD' },
    })

    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Orphan')).toBeInTheDocument()
    expect(screen.getByText('These dishes have no category')).toBeInTheDocument()
    // The count and the grid must agree.
    expect(screen.getByText('1 / 40')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('falls back to All when the filtered category is deleted', async () => {
    stub()
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(
      <DishesPage locale="en" onOpenCategories={vi.fn()} />,
    )

    await user.click(await screen.findByRole('tab', { name: /Mains/ }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    // The category disappears underneath the filter.
    mock.resetHandlers()
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock
      .onGet('/api/categories')
      .reply(200, { data: [categories[0]!], meta: { used: 1, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: dishes, meta: { used: 3, limit: 40, currency: 'USD' } })
    await queryClient.invalidateQueries()

    // Everything is shown again rather than an empty grid for a gone category.
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
  })

  it('sends the owner to categories when there are none', async () => {
    // No categories and no dishes at all.
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })
    const onOpenCategories = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={onOpenCategories} />)

    expect(await screen.findByText('Add a category first')).toBeInTheDocument()
    // The header button disables on the same signal; wait for the commit
    // rather than reading the DOM the instant the text appears.
    await waitFor(() => expect(screen.getByRole('button', { name: /^Add dish$/ })).toBeDisabled())

    await user.click(screen.getByRole('button', { name: 'Go to categories' }))
    expect(onOpenCategories).toHaveBeenCalledOnce()
  })

  it('blocks adding at the dish limit', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: dishes, meta: { used: 40, limit: 40, currency: 'USD' } })

    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /Add dish/ })).toBeDisabled())
    expect(screen.getByText('40 / 40')).toBeInTheDocument()
  })

  it('surfaces a failed load with a retry', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onGet('/api/dishes').reply(500, { message: 'Server error', code: 'server_error' })

    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
