import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { moveDown, stubSortableRects } from '@/test/sortable'
import type { AuthRestaurant } from '@/features/auth'
import { DishDialog } from '@/features/menu/dishes/components/dialogs/dish-dialog'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

let mock: MockAdapter

const CATEGORIES = [makeCategory({ id: 1, name: { en: 'Burgers', ar: null } })]

const BURGER = {
  variants: [
    {
      id: 7,
      name: { en: 'Size' },
      options: [
        { id: 70, name: { en: 'Small' }, price: '0.00' },
        { id: 71, name: { en: 'Large' }, price: '3.00' },
      ],
    },
  ],
  addons: [{ id: 9, name: { en: 'Extra cheese' }, price: '1.00' }],
}

function open(
  session: Partial<AuthRestaurant> = {},
  { dish = null, dishes = [] }: { dish?: Dish | null; dishes?: Dish[] } = {},
) {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'], ...session }) })
  mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
  mock.onPatch(/\/api\/dishes\/\d+/).reply(200, { data: makeDish({ id: dish?.id ?? 99 }) })

  return renderWithProviders(
    <DishDialog
      open
      dish={dish}
      dishes={dishes}
      categories={CATEGORIES}
      defaultCategoryId={null}
      currency="USD"
      locale="en"
      onClose={vi.fn()}
      onOpenCategories={vi.fn()}
    />,
  )
}

/** The section, once the session has said the switches are on. */
async function section() {
  return screen.findByRole('region', { name: 'Variants and add-ons' })
}

function sent(method: 'post' | 'patch' = 'post'): Record<string, unknown> {
  return JSON.parse(mock.history[method][0]!.data as string) as Record<string, unknown>
}

describe('dish variants and add-ons in the dish form', () => {
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

  it('builds a size from the ready-made one and an add-on, and sends both in order', async () => {
    const user = userEvent.setup()
    open()
    const region = await section()

    await user.type(screen.getByLabelText(/^Name/), 'Burger')
    await user.type(screen.getByLabelText('Price'), '8')
    await user.click(within(region).getByRole('button', { name: 'Size' }))

    expect(within(region).getByLabelText('Size, option 1')).toHaveValue('Small')
    expect(within(region).getByLabelText('Size, option 3')).toHaveValue('Large')
    await user.type(within(region).getByLabelText('Size, option 3, extra price'), '3')

    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'Extra cheese')
    await user.type(within(region).getByLabelText('Add-on 1, price'), '1.5')

    expect(region).toHaveTextContent('Guests pay $8.00 to $12.50')

    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent()).toMatchObject({
      variants: [
        {
          name: { en: 'Size' },
          options: [
            { name: { en: 'Small' }, price: 0 },
            { name: { en: 'Medium' }, price: 0 },
            { name: { en: 'Large' }, price: 3 },
          ],
        },
      ],
      addons: [{ name: { en: 'Extra cheese' }, price: 1.5 }],
    })
    // Nothing new carries an id.
    expect(JSON.stringify(sent())).not.toContain('"id"')
  })

  it('keeps the saved rows by id on an edit, and drops one the owner removed', async () => {
    const user = userEvent.setup()
    const dish = makeDish({ id: 5, price: '8.00', ...BURGER })
    open({}, { dish })
    const region = await section()

    await waitFor(() => expect(within(region).getByLabelText('Variant name')).toHaveValue('Size'))
    await user.click(within(region).getByRole('button', { name: 'Remove add-on 1' }))
    await user.click(screen.getByRole('button', { name: 'Save dish' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(sent('patch')).toMatchObject({
      variants: [
        {
          id: 7,
          options: [
            { id: 70, price: 0 },
            { id: 71, price: 3 },
          ],
        },
      ],
      addons: [],
    })
  })

  it('says what is missing before anything is sent', async () => {
    const user = userEvent.setup()
    open()
    const region = await section()

    await user.type(screen.getByLabelText(/^Name/), 'Burger')
    await user.click(within(region).getByRole('button', { name: 'Add variant' }))
    await user.click(within(region).getByRole('button', { name: 'Remove option 2 of Variant 1' }))
    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    expect(
      await within(region).findByText('Give every variant a name in English.'),
    ).toBeInTheDocument()
    expect(within(region).getByText('Give every add-on a name in English.')).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
  })

  it('prices a dish by its sizes when it has no price of its own, and says so', async () => {
    const user = userEvent.setup()
    open()
    const region = await section()

    await user.type(screen.getByLabelText(/^Name/), 'Sandwich')
    await user.click(within(region).getByRole('button', { name: 'Size' }))

    // No dish price: Size's options are the prices, not extras.
    expect(screen.getByText('No dish price: each Size sets the full price.')).toBeInTheDocument()
    const small = within(region).getByLabelText('Size, option 1, price')
    expect(within(small.parentElement!).queryByText('+ USD')).not.toBeInTheDocument()
    expect(within(small.parentElement!).getByText('USD')).toBeInTheDocument()
    // An empty full price is asked for, never taken as free.
    await user.click(screen.getByRole('button', { name: 'Add dish' }))
    expect(
      await within(region).findAllByText('Give it a price, or give the dish one.'),
    ).toHaveLength(3)
    expect(mock.history.post).toHaveLength(0)

    await user.type(small, '7')
    await user.type(within(region).getByLabelText('Size, option 2, price'), '9')
    await user.type(within(region).getByLabelText('Size, option 3, price'), '12')
    expect(region).toHaveTextContent('Guests pay $7.00 to $12.00')

    // With a dish price, the same boxes are extras on top of it.
    await user.type(screen.getByLabelText('Price'), '5')
    expect(
      screen.getByText('Variant prices are added to this. Leave it empty to price by Size alone.'),
    ).toBeInTheDocument()
    expect(within(region).getByLabelText('Size, option 1, extra price')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Price'))

    await user.click(screen.getByRole('button', { name: 'Add dish' }))
    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent()).toMatchObject({
      price: null,
      variants: [{ options: [{ price: 7 }, { price: 9 }, { price: 12 }] }],
    })
  })

  it('asks for two options per variant', async () => {
    const user = userEvent.setup()
    open()
    const region = await section()

    await user.type(screen.getByLabelText(/^Name/), 'Burger')
    await user.type(screen.getByLabelText('Price'), '8')
    await user.click(within(region).getByRole('button', { name: 'Add variant' }))
    await user.type(within(region).getByLabelText('Variant name'), 'Size')
    await user.type(within(region).getByLabelText('Size, option 1'), 'Small')
    await user.click(within(region).getByRole('button', { name: 'Remove option 2 of Size' }))
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    expect(
      await within(region).findByText('A variant needs at least 2 options.'),
    ).toBeInTheDocument()
    expect(mock.history.post).toHaveLength(0)
  })

  it('shows a mistake the server found on the row it belongs to', async () => {
    const user = userEvent.setup()
    open()
    mock.onPost('/api/dishes').reply(422, {
      message: 'That price is too high.',
      errors: { 'addons.0.price': ['That price is too high.'] },
    })
    const region = await section()

    await user.type(screen.getByLabelText(/^Name/), 'Burger')
    await user.type(screen.getByLabelText('Price'), '8')
    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'Gold leaf')
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    expect(await within(region).findByText('That price is too high.')).toBeInTheDocument()
  })

  it('copies another dish’s variants and add-ons as new rows', async () => {
    const user = userEvent.setup()
    const other = makeDish({ id: 3, name: { en: 'Cheeseburger' }, ...BURGER })
    open({}, { dishes: [other, makeDish({ id: 4, name: { en: 'Water' } })] })
    const region = await section()

    await user.click(within(region).getByRole('combobox', { name: 'Copy from another dish' }))
    // A dish with nothing to copy is not offered.
    expect(screen.queryByRole('option', { name: 'Water' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Cheeseburger' }))

    expect(within(region).getByLabelText('Variant name')).toHaveValue('Size')
    expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Extra cheese')

    await user.type(screen.getByLabelText(/^Name/), 'Double burger')
    await user.type(screen.getByLabelText('Price'), '10')
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(JSON.stringify(sent())).not.toContain('"id"')
    expect(sent()).toMatchObject({ addons: [{ name: { en: 'Extra cheese' }, price: 1 }] })
  })

  it('writes the names in each menu language behind one set of tabs', async () => {
    const user = userEvent.setup()
    open({ languages: ['en', 'ar'] })
    const region = await section()

    await user.type(screen.getAllByLabelText(/^Name/)[0]!, 'Burger')
    await user.type(screen.getByLabelText('Price'), '8')
    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'Cheese')
    await user.click(within(region).getByRole('tab', { name: 'AR' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'جبنة')
    expect(within(region).getByLabelText('Add-on 1')).toHaveAttribute('dir', 'rtl')

    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent()).toMatchObject({ addons: [{ name: { en: 'Cheese', ar: 'جبنة' } }] })
  })

  it('drags an add-on into a new place, and saves that order', { timeout: 20_000 }, async () => {
    stubSortableRects()
    const user = userEvent.setup()
    const dish = makeDish({
      id: 5,
      variants: [],
      addons: [
        { id: 1, name: { en: 'Cheese' }, price: '1.00' },
        { id: 2, name: { en: 'Bacon' }, price: '2.00' },
      ],
    })
    open({}, { dish })
    const region = await section()
    await waitFor(() => expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Cheese'))

    await moveDown(user, within(region).getAllByRole('button', { name: 'Reorder' })[0]!)

    await waitFor(() => expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Bacon'))
    await user.click(screen.getByRole('button', { name: 'Save dish' }))
    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(sent('patch')).toMatchObject({ addons: [{ id: 2 }, { id: 1 }] })
  })

  it('reorders a variant’s options and the variants themselves', { timeout: 20_000 }, async () => {
    stubSortableRects()
    const user = userEvent.setup()
    const dish = makeDish({
      id: 5,
      variants: [
        BURGER.variants[0]!,
        {
          id: 8,
          name: { en: 'Spice level' },
          options: [
            { id: 80, name: { en: 'Mild' }, price: '0.00' },
            { id: 81, name: { en: 'Hot' }, price: '0.00' },
          ],
        },
      ],
      addons: [],
    })
    open({}, { dish })
    const region = await section()
    await waitFor(() =>
      expect(within(region).getByLabelText('Size, option 1')).toHaveValue('Small'),
    )

    // The first variant's handle, then the first option's inside it.
    const handles = () => within(region).getAllByRole('button', { name: 'Reorder' })
    await moveDown(user, handles()[1]!)
    await waitFor(() =>
      expect(within(region).getByLabelText('Size, option 1')).toHaveValue('Large'),
    )
    await moveDown(user, handles()[0]!)
    await waitFor(() =>
      expect(within(region).getAllByLabelText('Variant name')[0]).toHaveValue('Spice level'),
    )

    await user.click(screen.getByRole('button', { name: 'Save dish' }))
    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(sent('patch')).toMatchObject({
      variants: [{ id: 8 }, { id: 7, options: [{ id: 71 }, { id: 70 }] }],
    })
  })

  // Five variants of three rows each is a lot of form to render under coverage.
  it(
    'adds and removes options and variants, up to what a dish holds',
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup()
      open()
      const region = await section()

      const addQuantity = () => user.click(within(region).getByRole('button', { name: 'Quantity' }))
      await addQuantity()
      await addQuantity()
      await addQuantity()
      await addQuantity()
      await addQuantity()
      // Five is the most a dish holds.
      expect(within(region).queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument()
      await user.click(within(region).getAllByRole('button', { name: 'Remove Quantity' })[4]!)
      expect(within(region).getAllByLabelText('Variant name')).toHaveLength(4)
      expect(within(region).getByRole('button', { name: 'Add variant' })).toBeInTheDocument()

      await user.click(within(region).getAllByRole('button', { name: 'Add option' })[0]!)
      expect(within(region).getByLabelText('Quantity, option 3')).toHaveValue('')
    },
  )

  it('reads an empty price as nothing more, and a hidden language’s mistake by its name', async () => {
    const user = userEvent.setup()
    open({ languages: ['en', 'ar'] })
    const region = await section()

    await user.type(screen.getAllByLabelText(/^Name/)[0]!, 'Burger')
    await user.type(screen.getByLabelText('Price'), '8')
    await user.click(within(region).getByRole('button', { name: 'Add add-on' }))
    const price = within(region).getByLabelText('Add-on 1, price')
    await user.type(price, '2')
    await user.clear(price)
    expect(price).toHaveValue(null)

    // Empty says free, with no "+ USD" until there is a price to add.
    expect(price).toHaveAttribute('placeholder', 'Free')
    expect(within(region).queryByText('+ USD')).not.toBeInTheDocument()

    // Written in Arabic only: the English tab is the one to open.
    await user.click(within(region).getByRole('tab', { name: 'AR' }))
    await user.type(within(region).getByLabelText('Add-on 1'), 'جبنة')
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    expect(
      await within(region).findByText('English: Give every add-on a name in English.'),
    ).toBeInTheDocument()
    expect(within(region).getByRole('tab', { name: /EN/ })).toHaveTextContent('•')
  })

  it('copies only the lists that are on, and names an untitled dish', async () => {
    const user = userEvent.setup()
    const other = makeDish({ id: 3, name: { en: null }, ...BURGER })
    open({ switched_off: ['addons'] }, { dishes: [other] })
    const region = await section()

    await user.click(within(region).getByRole('combobox', { name: 'Copy from another dish' }))
    await user.click(screen.getByRole('option', { name: 'Untitled dish' }))

    expect(within(region).getByLabelText('Variant name')).toHaveValue('Size')
    expect(within(region).queryByLabelText('Add-on 1')).not.toBeInTheDocument()
  })

  it('copies only the add-ons when variants are switched off', async () => {
    const user = userEvent.setup()
    const other = makeDish({ id: 3, name: { en: 'Cheeseburger' }, ...BURGER })
    open({ switched_off: ['variants'] }, { dishes: [other] })
    const region = await section()

    await user.click(within(region).getByRole('combobox', { name: 'Copy from another dish' }))
    await user.click(screen.getByRole('option', { name: 'Cheeseburger' }))

    expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Extra cheese')
    expect(within(region).queryByLabelText('Variant name')).not.toBeInTheDocument()
  })

  it(
    'offers no more options or add-ons once a dish holds the most it can',
    { timeout: 20_000 },
    async () => {
      const options = Array.from({ length: 10 }, (_, index) => ({
        id: 100 + index,
        name: { en: `Option ${index + 1}` },
        price: '0.00',
      }))
      const addons = Array.from({ length: 20 }, (_, index) => ({
        id: 200 + index,
        name: { en: `Extra ${index + 1}` },
        price: '1.00',
      }))
      open(
        {},
        { dish: makeDish({ id: 5, variants: [{ id: 7, name: { en: 'Size' }, options }], addons }) },
      )
      const region = await section()

      await waitFor(() =>
        expect(within(region).getByLabelText('Add-on 20')).toHaveValue('Extra 20'),
      )
      expect(within(region).getByLabelText('Size, option 10')).toHaveValue('Option 10')
      expect(within(region).queryByRole('button', { name: 'Add option' })).not.toBeInTheDocument()
      expect(within(region).queryByRole('button', { name: 'Add add-on' })).not.toBeInTheDocument()
      // A second variant can still be added.
      expect(within(region).getByRole('button', { name: 'Add variant' })).toBeInTheDocument()
    },
  )

  it('follows the menu’s languages when they change while the form is open', async () => {
    const dish = makeDish({
      id: 5,
      variants: [],
      addons: [{ id: 9, name: { en: 'Extra cheese', ar: 'جبنة إضافية' }, price: '1.00' }],
    })
    const { queryClient } = open({}, { dish })
    const region = await section()
    await waitFor(() =>
      expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Extra cheese'),
    )

    // The owner makes Arabic the menu's one language in another tab.
    mock
      .onGet('/api/user')
      .reply(200, { data: makeSessionUser({ languages: ['ar'], main_locale: 'ar' }) })
    await queryClient.refetchQueries()

    await waitFor(() =>
      expect(within(region).getByLabelText('Add-on 1')).toHaveValue('جبنة إضافية'),
    )
    expect(within(region).getByLabelText('Add-on 1')).toHaveAttribute('dir', 'rtl')
  })

  it('leaves a list that is switched off out of the form and the save', async () => {
    const user = userEvent.setup()
    open({ switched_off: ['variants'] }, { dish: makeDish({ id: 5, ...BURGER }) })
    const region = await section()

    expect(within(region).queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument()
    expect(within(region).getByLabelText('Add-on 1')).toHaveValue('Extra cheese')
    await user.click(screen.getByRole('button', { name: 'Save dish' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(sent('patch')).not.toHaveProperty('variants')
    expect(sent('patch')).toHaveProperty('addons')
  })

  it('has no section, and sends neither, without them on the package', async () => {
    const user = userEvent.setup()
    open({ plan: { ...FULL_PLAN, variants: false, addons: false } })
    await screen.findByRole('dialog')
    await waitFor(() =>
      expect(mock.history.get.some((call) => call.url === '/api/user')).toBe(true),
    )

    await user.type(screen.getByLabelText(/^Name/), 'Water')
    await user.click(screen.getByRole('button', { name: 'Add dish' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(screen.queryByRole('region', { name: 'Variants and add-ons' })).not.toBeInTheDocument()
    expect(sent()).not.toHaveProperty('variants')
    expect(sent()).not.toHaveProperty('addons')
  })
})
