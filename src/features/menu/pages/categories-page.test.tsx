import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, resetFactories } from '@/test/mocks/factories/menu'
import { makeSessionUser } from '@/test/mocks/factories/session'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { CategoriesPage } from '@/features/menu/pages/categories-page'

let mock: MockAdapter

const HANDLE = '[aria-roledescription="sortable"]'

/**
 * jsdom lays nothing out, so every rect is zero and dnd-kit's keyboard sensor
 * finds nothing "below" the picked-up card. Each sortable wrapper (the one
 * element holding exactly one handle inside a parent holding several) gets a
 * row of its own; everything else is one big box, so the parent-bound
 * modifier never clamps the move.
 */
function stubSortableRects() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element,
  ) {
    const parent = this.parentElement
    if (
      this.querySelectorAll(HANDLE).length === 1 &&
      parent !== null &&
      parent.querySelectorAll(HANDLE).length > 1
    ) {
      const index = Array.from(parent.children).indexOf(this)
      return DOMRect.fromRect({ x: 0, y: index * 100, width: 300, height: 80 })
    }
    return DOMRect.fromRect({ x: 0, y: 0, width: 1000, height: 5000 })
  })
}

/** Picks a card up by its grip, moves it one place down, and drops it. */
async function moveDown(user: UserEvent, handle: HTMLElement) {
  handle.focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** The categories in the order their edit buttons appear. */
function order(): string[] {
  return screen
    .getAllByRole('button', { name: /^Edit / })
    .map((button) => button.getAttribute('aria-label')!.replace('Edit ', ''))
}

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
    vi.restoreAllMocks()
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

  it('creates one category when Add is clicked twice in a row', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onPost('/api/categories').reply(201, { data: makeCategory({ id: 9 }) })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Add your first category' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Name/), 'Drinks')

    // A double click: both land before the button can re-render as busy.
    const add = within(dialog).getByRole('button', { name: 'Add category' })
    fireEvent.click(add)
    fireEvent.click(add)

    expect(await screen.findByText('Category added')).toBeInTheDocument()
    expect(mock.history.post.filter((r) => r.url === '/api/categories')).toHaveLength(1)
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
  it('renames a category through PATCH and says so', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onPatch('/api/categories/1').reply(200, {
      data: { ...categories[0]!, name: { en: 'Openers', ar: 'المقبلات' } },
    })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Starters' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Edit category' })).toBeInTheDocument()
    const name = within(dialog).getByLabelText(/^Name/)
    await waitFor(() => expect(name).toHaveValue('Starters'))

    await user.clear(name)
    await user.type(name, 'Openers')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/categories/1')
      expect(patch).toBeDefined()
      // The Arabic name rides along untouched; the blank description clears.
      expect(JSON.parse(patch!.data as string)).toEqual({
        name: { en: 'Openers', ar: 'المقبلات' },
        description: { en: '', ar: '' },
      })
    })
    expect(await screen.findByText('Category renamed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // The list is invalidated so the new name and usage come from the server.
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === '/api/categories')).toHaveLength(2),
    )
  })

  it('opens the edit dialog from the card body too', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /^Mains/ }))

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Mains'))
  })

  it('tells the owner when a rename fails and keeps the dialog open', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onPatch('/api/categories/2').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Mains' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Mains'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not rename that category')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the category dialog with Cancel, Escape or a click on the backdrop', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    const edit = await screen.findByRole('button', { name: 'Edit Starters' })

    await user.click(edit)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(edit)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(edit)
    const dialog = screen.getByRole('dialog')
    // A click inside the form is not a click on the backdrop.
    await user.click(within(dialog).getByLabelText(/^Name/))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('holds the dialog open while a rename is saving', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const response = deferred<[number, unknown]>()
    mock.onPatch('/api/categories/1').reply(() => response.promise)

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Starters' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Starters'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mock.history.patch).toHaveLength(1))

    // Neither Escape nor the backdrop may drop a save that is in flight.
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    response.resolve([200, { data: categories[0]! }])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('cancelling a delete sends nothing', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Mains' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.delete).toHaveLength(0)
  })

  it('keeps the confirm open and says so when a delete fails', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onDelete('/api/categories/2').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Mains' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete that category')).toBeInTheDocument()
    expect(mock.history.delete[0]!.url).toBe('/api/categories/2')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('invalidates the dishes too after a delete, since they lose their category', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onDelete('/api/categories/1').reply(204)

    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(
      <CategoriesPage locale="en" onOpenDishes={vi.fn()} />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(await screen.findByRole('button', { name: 'Delete Starters' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dishes'] }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens a blank dialog from the header button', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: null } })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    await screen.findByRole('button', { name: 'Edit Starters' })
    // A null limit is unlimited, so the button is live and no warning shows.
    const add = screen.getByRole('button', { name: /Add category/ })
    expect(add).toBeEnabled()
    expect(screen.queryByText(/every category your plan allows/)).not.toBeInTheDocument()

    await user.click(add)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'New category' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('')
  })

  it('warns at the limit', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 10, limit: 10 } })
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByText(/every category your plan allows/)).toBeInTheDocument()
  })

  it('sends the owner on to dishes', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    const onOpenDishes = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={onOpenDishes} />)

    await user.click(await screen.findByRole('button', { name: 'Go to dishes' }))
    expect(onOpenDishes).toHaveBeenCalledOnce()
  })

  it('shows a failed load with a retry that refetches', async () => {
    mock
      .onGet('/api/categories')
      .replyOnce(500, { message: 'Server error', code: 'server_error' })
      .onGet('/api/categories')
      .reply(200, { data: categories, meta: { used: 2, limit: 10 } })

    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Edit Starters' })).toBeInTheDocument()
  })

  describe('category card', () => {
    it('marks a name shown in another language and shows the description', async () => {
      mock.onGet('/api/categories').reply(200, {
        data: [
          makeCategory({
            id: 5,
            name: { en: 'Drinks', ar: null },
            description: { en: 'Cold and hot', ar: null },
            dishes_count: undefined,
          }),
        ],
        meta: { used: 1, limit: 10 },
      })
      renderWithProviders(<CategoriesPage locale="ar" onOpenDishes={vi.fn()} />)

      expect(await screen.findByText('Drinks')).toBeInTheDocument()
      // The dialog's language tabs also say EN, so the badge is found by its title.
      expect(screen.getByTitle(/^Not translated into /)).toHaveTextContent('EN')
      expect(screen.getByText('Cold and hot')).toBeInTheDocument()
      // A missing count reads as none rather than a blank.
      expect(screen.getByText('0 dishes')).toBeInTheDocument()
    })

    it('names an untitled category and labels its buttons without a name', async () => {
      mock.onGet('/api/categories').reply(200, {
        data: [makeCategory({ id: 6, name: { en: null, ar: null }, dishes_count: 1 })],
        meta: { used: 1, limit: 10 },
      })
      const user = userEvent.setup()
      renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

      expect(await screen.findByText('Untitled category')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit category' })).toBeInTheDocument()
      expect(screen.queryByTitle(/^Not translated into /)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Delete category' }))
      expect(screen.getByRole('heading', { name: 'Delete this category?' })).toBeInTheDocument()
    })
  })

  // A keyboard drag is a dozen sensor steps and re-renders; under a loaded
  // coverage run that outgrows the 5s default without anything being wrong.
  describe('reordering with the keyboard', { timeout: 20_000 }, () => {
    const three = [
      makeCategory({ id: 1, name: { en: 'Starters', ar: null } }),
      makeCategory({ id: 2, name: { en: 'Mains', ar: null } }),
      makeCategory({ id: 3, name: { en: 'Drinks', ar: null } }),
    ]

    beforeEach(() => {
      stubSortableRects()
      mock.onGet('/api/categories').reply(200, { data: three, meta: { used: 3, limit: 10 } })
    })

    it('moves the card at once and saves the new order', async () => {
      const response = deferred<[number, unknown]>()
      mock.onPost('/api/categories/reorder').reply(() => response.promise)

      const user = userEvent.setup()
      renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

      const handles = await screen.findAllByRole('button', { name: 'Reorder' })
      expect(order()).toEqual(['Starters', 'Mains', 'Drinks'])

      await moveDown(user, handles[0]!)

      // Optimistic: the list has moved while the request is still in flight.
      await waitFor(() => expect(order()).toEqual(['Mains', 'Starters', 'Drinks']))
      const post = mock.history.post.find((r) => r.url === '/api/categories/reorder')
      expect(JSON.parse(post!.data as string)).toEqual({ ids: [2, 1, 3] })

      // The server's renumbered list replaces the optimistic one, no refetch.
      response.resolve([
        200,
        {
          data: [
            { ...three[1]!, display_order: 1 },
            { ...three[0]!, display_order: 2 },
            { ...three[2]!, display_order: 3 },
          ],
        },
      ])
      await waitFor(() => expect(order()).toEqual(['Mains', 'Starters', 'Drinks']))
      expect(mock.history.get.filter((r) => r.url === '/api/categories')).toHaveLength(1)
      // An optimistic success says nothing: the order on screen is the answer.
      expect(screen.queryByText('Could not save the new order')).not.toBeInTheDocument()
    })

    it('snaps back and explains why when the server refuses', async () => {
      const response = deferred<[number, unknown]>()
      mock.onPost('/api/categories/reorder').reply(() => response.promise)

      const user = userEvent.setup()
      renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

      const handles = await screen.findAllByRole('button', { name: 'Reorder' })
      await moveDown(user, handles[1]!)
      await waitFor(() => expect(order()).toEqual(['Starters', 'Drinks', 'Mains']))

      response.resolve([500, { message: 'Server error', code: 'server_error' }])

      expect(await screen.findByText('Could not save the new order')).toBeInTheDocument()
      await waitFor(() => expect(order()).toEqual(['Starters', 'Mains', 'Drinks']))
      // The truth is fetched again after a refusal.
      await waitFor(() =>
        expect(mock.history.get.filter((r) => r.url === '/api/categories')).toHaveLength(2),
      )
    })

    it('saves nothing when the card is dropped where it started', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CategoriesPage locale="en" onOpenDishes={vi.fn()} />)

      const handles = await screen.findAllByRole('button', { name: 'Reorder' })
      handles[0]!.focus()
      await user.keyboard(' ')
      await user.keyboard(' ')

      expect(order()).toEqual(['Starters', 'Mains', 'Drinks'])
      expect(mock.history.post).toHaveLength(0)
    })
  })
})
