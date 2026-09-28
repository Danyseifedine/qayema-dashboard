import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/mocks/factories/menu'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { DishesPage } from '@/features/menu/pages/dishes-page'

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

/** The dish names in the order the grid shows them. */
function order(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '')
}

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
    vi.restoreAllMocks()
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

  it('dims only the photo of a sold-out dish, never its text', async () => {
    stub()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    const card = (await screen.findByText('Lamb shank')).closest('article')!
    // Dimming the card dimmed the name, price and switch below 4.5:1.
    expect(card.className).not.toMatch(/opacity/)
    expect(within(card).getByText('Sold out').parentElement?.parentElement).toHaveClass(
      '[&>:first-child]:opacity-60',
    )
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

    // The server hands the saved dish back, so the card is patched in place.
    // Refetching the whole menu to learn one boolean would be the heaviest
    // call in the app, on the action an owner repeats most.
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /Hummus is available/ })).not.toBeChecked(),
    )
    expect(mock.history.get.filter((r) => r.url === '/api/dishes')).toHaveLength(1)
  })

  it('does not refetch the menu when a toggle fails, until it has to', async () => {
    stub()
    mock.onPatch('/api/dishes/10/availability').reply(500, { message: 'Something went wrong.' })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('switch', { name: /Hummus is available/ }))

    // A failure is the one case that needs the truth from the server, so the
    // optimistic flip rolls back and the list is refetched.
    await waitFor(() => {
      expect(mock.history.get.filter((r) => r.url === '/api/dishes')).toHaveLength(2)
    })
    expect(screen.getByRole('switch', { name: /Hummus is available/ })).toBeChecked()
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

  it('keeps the filter while the categories load again from scratch', async () => {
    stub()
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(
      <DishesPage locale="en" onOpenCategories={vi.fn()} />,
    )

    await user.click(await screen.findByRole('tab', { name: /Mains/ }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))

    // The categories cache is dropped and refilled. While it is empty the
    // filter cannot be checked against it, so it must not be thrown away.
    const reload = deferred<[number, unknown]>()
    mock.onGet('/api/categories').reply(() => reload.promise)
    act(() => {
      void queryClient.resetQueries({ queryKey: ['categories'] })
    })
    await waitFor(() => expect(screen.queryByRole('tablist')).not.toBeInTheDocument())
    expect(screen.getAllByRole('article')).toHaveLength(1)

    reload.resolve([200, { data: categories, meta: { used: 2, limit: 10 } }])
    expect(await screen.findByRole('tab', { name: /Mains/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByRole('article')).toHaveLength(1)
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
  it('edits a dish through PATCH and says so', async () => {
    stub()
    mock.onPatch('/api/dishes/10').reply(200, {
      data: { ...dishes[0]!, name: { en: 'Hummus bi tahini', ar: null } },
    })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Hummus' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Edit dish' })).toBeInTheDocument()
    const name = within(dialog).getByLabelText(/^Name/)
    await waitFor(() => expect(name).toHaveValue('Hummus'))

    await user.clear(name)
    await user.type(name, 'Hummus bi tahini')
    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/dishes/10')
      expect(patch).toBeDefined()
      // No image was touched, so neither the key nor the delete flag is sent.
      expect(JSON.parse(patch!.data as string)).toEqual({
        name: { en: 'Hummus bi tahini' },
        ingredients: { en: '' },
        price: 8.5,
        category_id: 1,
        is_available: true,
      })
    })
    expect(await screen.findByText('Dish saved')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('tells the owner when an edit fails', async () => {
    stub()
    mock.onPatch('/api/dishes/12').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit Lamb shank' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Lamb shank'))
    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }))

    expect(await screen.findByText('Could not save that dish')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('deletes a dish after confirming', async () => {
    stub()
    mock.onDelete('/api/dishes/11').reply(204)

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Fattoush' }))
    const confirm = screen.getByRole('dialog')
    expect(within(confirm).getByText(/cannot be undone/)).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Dish deleted')).toBeInTheDocument()
    expect(mock.history.delete[0]!.url).toBe('/api/dishes/11')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Both lists are invalidated: the dish count on the category moved too.
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === '/api/categories')).toHaveLength(2),
    )
  })

  it('keeps the confirm open when a delete fails', async () => {
    stub()
    mock.onDelete('/api/dishes/11').reply(500, { message: 'Server error', code: 'server_error' })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Fattoush' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete that dish')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('cancelling a delete sends nothing', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Delete Fattoush' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.delete).toHaveLength(0)
  })

  it('opens a new dish in the filtered category', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('tab', { name: /Mains/ }))
    await user.click(screen.getByRole('button', { name: /^Add dish$/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'New dish' })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /Category/ })).toHaveValue('Mains'),
    )
  })

  it('offers to add a dish to a category that has none', async () => {
    mock.onGet('/api/categories').reply(200, {
      data: [...categories, makeCategory({ id: 3, name: { en: 'Desserts', ar: null } })],
      meta: { used: 3, limit: null },
    })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: dishes, meta: { used: 3, limit: null, currency: 'USD' } })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('tab', { name: /Desserts/ }))

    expect(await screen.findByText('Nothing in this category')).toBeInTheDocument()
    expect(screen.getByText(/pick another category above/)).toBeInTheDocument()
    // A null limit is unlimited, so nothing is blocked.
    expect(screen.queryByText(/every dish your plan allows/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add a dish' }))
    const dialog = screen.getByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /Category/ })).toHaveValue('Desserts'),
    )
  })

  it('invites the first dish when the menu has categories but no dishes', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })

    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText('No dishes yet')).toBeInTheDocument()
    expect(screen.getByText(/a name, a price and a photo/)).toBeInTheDocument()
  })

  it('filters to the dishes that lost their category', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock.onGet('/api/dishes').reply(200, {
      data: [
        ...dishes,
        makeDish({ id: 20, name: { en: 'Orphan', ar: null }, category_id: null, category: null }),
      ],
      meta: { used: 4, limit: 40, currency: 'USD' },
    })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    const chip = await screen.findByRole('tab', { name: /No category/ })
    expect(chip).toHaveAttribute('title', 'Dishes whose category was deleted')
    expect(chip).toHaveAttribute('aria-selected', 'false')

    await user.click(chip)

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByText('Orphan')).toBeInTheDocument()
    expect(chip).toHaveAttribute('aria-selected', 'true')

    // "All" brings everything back.
    await user.click(screen.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4))
  })

  it('warns at the dish limit', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: dishes, meta: { used: 40, limit: 40, currency: 'USD' } })

    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    expect(await screen.findByText(/every dish your plan allows/)).toBeInTheDocument()
  })

  it('retries a failed load', async () => {
    mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
    mock
      .onGet('/api/dishes')
      .replyOnce(500, { message: 'Server error', code: 'server_error' })
      .onGet('/api/dishes')
      .reply(200, { data: dishes, meta: { used: 3, limit: 40, currency: 'USD' } })

    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findAllByRole('article')).toHaveLength(3)
  })

  it('sends the owner to categories from the orphans warning', async () => {
    mock.onGet('/api/categories').reply(200, { data: [], meta: { used: 0, limit: 10 } })
    mock.onGet('/api/dishes').reply(200, {
      data: [makeDish({ id: 20, category_id: null, category: null })],
      meta: { used: 1, limit: 40, currency: 'USD' },
    })
    const onOpenCategories = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<DishesPage locale="en" onOpenCategories={onOpenCategories} />)

    await screen.findByText('These dishes have no category')
    await user.click(screen.getByRole('button', { name: 'Go to categories' }))
    expect(onOpenCategories).toHaveBeenCalledOnce()
  })

  describe('dish card', () => {
    it('shows a photo, ingredients, a hidden price and an untitled name', async () => {
      mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 2, limit: 10 } })
      mock.onGet('/api/dishes').reply(200, {
        data: [
          makeDish({
            id: 30,
            name: { en: 'Kibbeh', ar: null },
            ingredients: { en: 'Bulgur, lamb, pine nuts', ar: null },
            price: null,
            image_url: 'https://cdn.qayema.test/kibbeh.webp',
          }),
          makeDish({ id: 31, name: { en: null, ar: null }, is_available: false }),
        ],
        meta: { used: 2, limit: 40, currency: 'USD' },
      })

      renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

      const [kibbeh, untitled] = await screen.findAllByRole('article')
      expect(kibbeh!.querySelector('img')).toHaveAttribute(
        'src',
        'https://cdn.qayema.test/kibbeh.webp',
      )
      expect(within(kibbeh!).getByText('Bulgur, lamb, pine nuts')).toBeInTheDocument()
      // A null price is left off rather than shown as $0.00.
      expect(within(kibbeh!).queryByText(/\$/)).not.toBeInTheDocument()
      expect(within(kibbeh!).getByText('Available')).toBeInTheDocument()

      expect(within(untitled!).getByText('Untitled dish')).toBeInTheDocument()
      expect(within(untitled!).queryByRole('img')).not.toBeInTheDocument()
      expect(within(untitled!).getByText('Hidden')).toBeInTheDocument()
      expect(within(untitled!).getByRole('switch', { name: 'Dish is available' })).not.toBeChecked()
      expect(within(untitled!).getByRole('button', { name: 'Edit dish' })).toBeInTheDocument()
      expect(within(untitled!).getByRole('button', { name: 'Delete dish' })).toBeInTheDocument()
    })

    it('labels a category chip with no name in this language', async () => {
      mock.onGet('/api/categories').reply(200, {
        data: [makeCategory({ id: 1, name: { en: null, ar: null }, dishes_count: undefined })],
        meta: { used: 1, limit: 10 },
      })
      mock
        .onGet('/api/dishes')
        .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })

      renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

      expect(await screen.findByRole('tab', { name: 'Untitled0' })).toBeInTheDocument()
    })
  })

  // A keyboard drag is a dozen sensor steps and re-renders; under a loaded
  // coverage run that outgrows the 5s default without anything being wrong.
  describe('reordering with the keyboard', { timeout: 20_000 }, () => {
    beforeEach(() => {
      stubSortableRects()
      stub()
    })

    it('moves the card at once and saves the new order', async () => {
      const response = deferred<[number, unknown]>()
      mock.onPost('/api/dishes/reorder').reply(() => response.promise)

      const user = userEvent.setup()
      renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

      const handles = await screen.findAllByRole('button', { name: 'Reorder' })
      expect(order()).toEqual(['Hummus', 'Fattoush', 'Lamb shank'])

      await moveDown(user, handles[0]!)

      await waitFor(() => expect(order()).toEqual(['Fattoush', 'Hummus', 'Lamb shank']))
      const post = mock.history.post.find((r) => r.url === '/api/dishes/reorder')
      expect(JSON.parse(post!.data as string)).toEqual({ ids: [11, 10, 12] })

      response.resolve([200, { data: [dishes[1]!, dishes[0]!, dishes[2]!] }])
      await waitFor(() => expect(mock.history.post).toHaveLength(1))
      expect(order()).toEqual(['Fattoush', 'Hummus', 'Lamb shank'])
      expect(mock.history.get.filter((r) => r.url === '/api/dishes')).toHaveLength(1)
    })

    it('snaps back and explains why when the server refuses', async () => {
      const response = deferred<[number, unknown]>()
      mock.onPost('/api/dishes/reorder').reply(() => response.promise)

      const user = userEvent.setup()
      renderWithProviders(<DishesPage locale="en" onOpenCategories={vi.fn()} />)

      const handles = await screen.findAllByRole('button', { name: 'Reorder' })
      await moveDown(user, handles[1]!)
      await waitFor(() => expect(order()).toEqual(['Hummus', 'Lamb shank', 'Fattoush']))

      response.resolve([500, { message: 'Server error', code: 'server_error' }])

      expect(await screen.findByText('Could not save the new order')).toBeInTheDocument()
      await waitFor(() => expect(order()).toEqual(['Hummus', 'Fattoush', 'Lamb shank']))
      await waitFor(() =>
        expect(mock.history.get.filter((r) => r.url === '/api/dishes')).toHaveLength(2),
      )
    })

    it('reorders only the dishes in view when filtered', async () => {
      const response = deferred<[number, unknown]>()
      mock.onPost('/api/dishes/reorder').reply(() => response.promise)

      const user = userEvent.setup()
      const { queryClient } = renderWithProviders(
        <DishesPage locale="en" onOpenCategories={vi.fn()} />,
      )

      await user.click(await screen.findByRole('tab', { name: /Starters/ }))
      await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))

      await moveDown(user, screen.getAllByRole('button', { name: 'Reorder' })[0]!)

      await waitFor(() => expect(order()).toEqual(['Fattoush', 'Hummus']))
      const post = mock.history.post.find((r) => r.url === '/api/dishes/reorder')
      // Only the ids in view are sent; the server renumbers the rest.
      expect(JSON.parse(post!.data as string)).toEqual({ ids: [11, 10] })

      // The dish out of view keeps its place in the cached full list.
      const cached = queryClient.getQueryData<{ data: { id: number }[] }>(['dishes', 'list'])
      expect(cached!.data.map((dish) => dish.id)).toEqual([11, 10, 12])

      response.resolve([200, { data: [dishes[1]!, dishes[0]!, dishes[2]!] }])
      await waitFor(() => expect(mock.history.post).toHaveLength(1))
    })
  })
})
