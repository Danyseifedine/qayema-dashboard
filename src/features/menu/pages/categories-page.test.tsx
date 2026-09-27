import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, resetFactories } from '@/test/mocks/factories/menu'
import { makeSessionUser } from '@/test/mocks/factories/session'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { CategoriesPage } from '@/features/menu/pages/categories-page'

let mock: MockAdapter

const categories = [
  makeCategory({ id: 1, name: { en: 'Starters', ar: 'المقبلات' }, dishes_count: 2 }),
  makeCategory({ id: 2, name: { en: 'Mains', ar: null }, dishes_count: 1 }),
]

describe('CategoriesPage', () => {
  beforeEach(() => {
    resetFactories()
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('lists categories as cards with their dish counts', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Edit Starters' })).toBeInTheDocument()
    expect(screen.getByText('2 dishes')).toBeInTheDocument()
    expect(screen.getByText('1 dish')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows plan usage and blocks adding at the limit', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 10, limit: 10 } })
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByText('10 / 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add category/ })).toBeDisabled()
  })

  it('creates a category through the API', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 9 }) })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Add your first category' }))

    // "Add category" is also the page header button, so scope to the dialog.
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Drinks')
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/categories')
      expect(post).toBeDefined()
      // The description goes up even when blank, so an edit can clear it.
      expect(JSON.parse(post!.data as string)).toEqual({
        name: { en: 'Drinks', ar: '' },
        description: { en: '', ar: '' },
      })
    })

    expect(await screen.findByText('Category added')).toBeInTheDocument()
  })

  it('gives a French menu an EN and FR tab and saves both', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en', 'fr'] }) })
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 9 }) })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Add your first category' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getAllByRole('tab', { name: 'FR' }).length).toBeGreaterThan(0),
    )
    expect(within(dialog).queryByRole('tab', { name: 'AR' })).not.toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/^Name/), 'Drinks')
    await user.click(within(dialog).getAllByRole('tab', { name: 'FR' })[0]!)
    await user.type(within(dialog).getByLabelText(/^Name/), 'Boissons')
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/categories')
      expect(JSON.parse(post!.data as string).name).toEqual({ en: 'Drinks', fr: 'Boissons' })
    })
  })

  it('asks for the name in English even when the other language is filled', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Add your first category' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getAllByRole('tab', { name: 'AR' }).length).toBeGreaterThan(0),
    )
    await user.click(within(dialog).getAllByRole('tab', { name: 'AR' })[0]!)
    await user.type(within(dialog).getByLabelText(/^Name/), 'مشروبات')
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }))

    expect(
      await within(dialog).findByText(/A category name is required in English/),
    ).toBeInTheDocument()
    expect(mock.history.post.filter((r) => r.url === '/api/categories')).toHaveLength(0)
  })

  it('tells the owner when a save fails', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onPost('/api/categories').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Add your first category' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Drinks')
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }))

    expect(await screen.findByText('Could not add that category')).toBeInTheDocument()
    // The server's wording shows both in the dialog and in the toast.
    await waitFor(() => expect(screen.getAllByText('Server error').length).toBeGreaterThan(1))
  })

  it('confirms a delete with a toast that explains what happened to the dishes', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onDelete('/api/categories/1').reply(204)

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Starters' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Category deleted')).toBeInTheDocument()
    expect(
      await screen.findByText('Its dishes were kept and now have no category.'),
    ).toBeInTheDocument()
  })

  it('warns that deleting a category keeps its dishes', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Starters' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/lose their category/)).toBeInTheDocument()
  })

  it('offers an empty state when there are none', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByText('No categories yet')).toBeInTheDocument()
  })
})
