import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeBuild, makeCategory, makeDish, resetFactories } from '@/test/factories/menu'
import { makeSessionUser, makeWritingHelp } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { moveDown, stubSortableRects } from '@/test/sortable'
import type { Category, Dish } from '@/features/menu'
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import type { WritingHelpUses } from '@/shared/hooks/use-writing-help'
import { BuildYourOwnPage } from '@/features/build-your-own/pages/build-your-own-page'

let mock: MockAdapter

const CATEGORIES = [
  makeCategory({ id: 1, name: { en: 'Burgers', ar: null } }),
  makeCategory({ id: 2, name: { en: 'Pizzas', ar: null } }),
  makeCategory({ id: 3, name: { en: 'Ice cream', ar: null } }),
  makeCategory({ id: 4, name: { en: 'Drinks', ar: null } }),
]

const PIZZA = makeBuild({
  id: 3,
  name: { en: 'Your pizza', ar: null },
  shape: 'split',
  parts: [1, 2],
  category_id: 2,
  choices: [
    { id: 30, dish_id: 10, name: null, price: null, part_prices: { '2': '7.00' } },
    // Sold out for now: its price is kept all the same.
    { id: 31, dish_id: 12, name: null, price: null, part_prices: { '2': '5.00' } },
  ],
})
const SCOOPS = makeBuild({ id: 5, name: { en: 'Your scoops', ar: null } })
const TOPPING = makeBuild({ id: 6, name: { en: 'Topping', ar: null }, parts: [1] })

const DISHES: Dish[] = [
  makeDish({ id: 10, name: { en: 'Margherita' }, price: '12.00', category_id: 2 }),
  makeDish({ id: 11, name: { en: 'Pepperoni' }, price: '16.00', category_id: 2 }),
  makeDish({ id: 12, name: { en: 'Sold out' }, category_id: 2, is_available: false }),
  makeDish({
    id: 13,
    name: { en: 'Build your pizza' },
    price: null,
    category_id: 2,
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
  makeDish({
    id: 18,
    name: { en: 'Poke bowl' },
    category_id: 3,
    builds: [
      makeBuild({
        id: 8,
        name: { en: 'Big bowl', ar: null },
        choices: Array.from({ length: 29 }, (_, index) => ({
          id: 800 + index,
          dish_id: null,
          name: { en: `Topping ${index + 1}`, ar: null },
          price: '1.00',
          part_prices: {},
        })),
      }),
    ],
  }),
]

function open({
  languages = ['en'],
  categories = CATEGORIES,
  dishes = DISHES,
  uses = null,
}: {
  languages?: string[]
  categories?: Category[]
  dishes?: Dish[]
  uses?: WritingHelpUses | null
} = {}) {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages }) })
  mock.onGet('/api/categories').reply(200, { data: categories, meta: { used: 3, limit: 10 } })
  mock
    .onGet('/api/dishes')
    .reply(200, { data: dishes, meta: { used: dishes.length, limit: 40, currency: 'USD' } })
  return renderWithProviders(
    <WritingHelpProvider uses={uses} onLeft={() => {}}>
      <BuildYourOwnPage locale="en" />
    </WritingHelpProvider>,
  )
}

async function startNew(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'New build' }))
}

function next(user: UserEvent) {
  return user.click(screen.getByRole('button', { name: 'Next' }))
}

async function heading(name: string) {
  return screen.findByRole('heading', { level: 3, name })
}

async function pick(user: UserEvent, box: string, option: string | RegExp) {
  await user.click(screen.getByRole('combobox', { name: new RegExp(`^${box}`) }))
  await user.click(await screen.findByRole('option', { name: option }))
}

function sent(method: 'post' | 'patch'): Record<string, unknown> {
  return JSON.parse(mock.history[method][0]!.data as string) as Record<string, unknown>
}

/** Two priced rows of an own list. */
async function fillRows(user: UserEvent, rows: [string, string][]) {
  for (const [index, [name, price]] of rows.entries()) {
    const number = index + 1
    // Typed in order, one row after the other, as an owner does.
    // oxlint-disable-next-line no-await-in-loop
    await user.type(await screen.findByRole('textbox', { name: `Choice ${number}` }), name)
    // oxlint-disable-next-line no-await-in-loop
    await user.type(screen.getByRole('spinbutton', { name: `Choice ${number}, price` }), price)
  }
}

describe('the build editor', () => {
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

  it('makes a pizza half and half with its dish, a Margherita half at its own price', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
    open()
    await startNew(user)

    // 1 What: Next checks only this step.
    await next(user)
    expect(await screen.findByText('Pick what guests build.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /A pizza, half and half/ }))
    await next(user)

    // 2 Choices: the pizzas guests can pick.
    await heading('What can guests choose from?')
    expect(screen.getByRole('radio', { name: /From a category/ })).toBeChecked()
    expect(screen.getByRole('combobox', { name: /^Category/ })).toHaveValue('Pizzas')
    const offered = screen.getByRole('group', { name: 'Guests will choose from' })
    expect(within(offered).getByRole('checkbox', { name: /Margherita/ })).toBeChecked()
    expect(within(offered).getByRole('checkbox', { name: /Pepperoni/ })).toBeChecked()
    expect(within(offered).queryByText('Sold out')).not.toBeInTheDocument()

    // A list starts with the two rows it needs; back on the category, it is kept.
    await user.click(screen.getByRole('radio', { name: /Type your own list/ }))
    expect(screen.getAllByRole('textbox', { name: /^Choice \d$/ })).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: /From a category/ }))
    expect(screen.getByRole('combobox', { name: /^Category/ })).toHaveValue('Pizzas')

    // Burgers has one dish, Drinks none guests can pick.
    await pick(user, 'Category', 'Burgers')
    expect(screen.getByText(/Guests see this build once at least 2 dishes/)).toBeInTheDocument()
    await pick(user, 'Category', 'Drinks')
    expect(screen.getByText(/No dish in this category can be picked yet/)).toBeInTheDocument()
    await pick(user, 'Category', 'Pizzas')
    await next(user)

    // 3 Sizes.
    await heading('How it is made and its sizes')
    expect(screen.getByRole('button', { name: 'Whole' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Half & half' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Thirds' })).toHaveAttribute('aria-pressed', 'false')
    // A pizza is split, as its card set: nothing to change here.
    expect(screen.queryByText('Like a pizza: one item in different parts')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change how it is made' })).not.toBeInTheDocument()
    expect(screen.getByText('Each part costs its share of the whole price.')).toBeInTheDocument()
    const ownPrices = screen.getByRole('button', { name: 'Set your own prices' })
    expect(ownPrices).toHaveAttribute('aria-expanded', 'false')
    await user.click(ownPrices)
    const half = await screen.findByLabelText('Margherita, price for one of 2 parts')
    expect(half).toHaveAttribute('placeholder', '6.00 auto')
    await user.type(half, '7')
    await next(user)

    // 4 On your menu: its name and icon, nothing else.
    await heading('On your menu')
    expect(screen.getByRole('textbox', { name: /^Name on the menu/ })).toHaveValue(
      'Build your pizza',
    )
    expect(screen.getByRole('radio', { name: 'Pizza' })).toBeChecked()
    expect(screen.queryByRole('combobox', { name: /^Category/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: /^Price/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /^Description/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Spicy' }))
    await next(user)

    // 5 Review: what a guest sees and pays.
    await heading('Review')
    const preview = screen.getByRole('region', { name: 'What guests see' })
    expect(preview).toHaveTextContent('Build your pizza')
    expect(preview).toHaveTextContent('Add $15.00')
    // A whole, then: the Margherita alone.
    await user.click(within(preview).getByRole('tab', { name: 'Whole' }))
    expect(preview).toHaveTextContent('Add $12.00')
    const summary = screen.getByRole('region', { name: 'Your build' })
    expect(summary).toHaveTextContent('From Pizzas: 2 dishes guests can pick')
    expect(summary).toHaveTextContent('Whole and halves')
    expect(summary).toHaveTextContent('DishBuild your pizza')
    expect(within(summary).getByRole('list', { name: 'Every choice' })).toHaveTextContent(
      'Margherita$12.00Half $7.00',
    )

    await user.click(screen.getByRole('button', { name: 'Add build' }))
    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent('post')).toEqual({
      name: { en: 'Build your pizza' },
      icon: 'flame',
      category_id: null,
      price: null,
      ingredients: { en: '' },
      builds: [
        {
          // Titled with the dish's name.
          name: { en: 'Build your pizza' },
          shape: 'split',
          parts: [1, 2],
          category_id: 2,
          dish_ids: null,
          choices: [{ dish_id: 10, part_prices: { '2': 7 } }],
        },
      ],
    })
    expect((await screen.findAllByText('Build added'))[0]).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'New build' })).toBeInTheDocument()
  })

  it('keeps a pizza to the dishes the owner leaves ticked', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
    open({
      dishes: [
        ...DISHES,
        makeDish({ id: 16, name: { en: 'Hawaiian' }, price: '14.00', category_id: 2 }),
      ],
    })
    await startNew(user)
    await user.click(await screen.findByRole('radio', { name: /A pizza, half and half/ }))
    await next(user)

    // Every pizza starts ticked; unticking leaves one out.
    await heading('What can guests choose from?')
    const offered = () => screen.getByRole('group', { name: 'Guests will choose from' })
    const box = (name: string) =>
      within(offered()).getByRole('checkbox', { name: new RegExp(name) })
    expect(screen.getByText('3 of 3')).toBeInTheDocument()
    await user.click(box('Pepperoni'))
    await user.click(box('Hawaiian'))
    expect(box('Pepperoni')).not.toBeChecked()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByText(/Tick at least 2 dishes/)).toBeInTheDocument()
    await user.click(box('Hawaiian'))

    // Another category's dishes all start ticked, and so do these again.
    await pick(user, 'Category', 'Burgers')
    await pick(user, 'Category', 'Pizzas')
    expect(box('Pepperoni')).toBeChecked()
    await user.click(box('Pepperoni'))
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
    await next(user)
    await next(user)
    await next(user)

    // Guests choose from the two ticked.
    await heading('Review')
    expect(screen.getByRole('region', { name: 'Your build' })).toHaveTextContent(
      'From Pizzas: 2 dishes guests can pick',
    )
    await user.click(screen.getByRole('button', { name: 'Add build' }))
    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent('post').builds).toEqual([expect.objectContaining({ dish_ids: [10, 16] })])
  })

  it('makes scoops with their dish, a list typed in', { timeout: 20_000 }, async () => {
    stubSortableRects()
    const user = userEvent.setup()
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
    open({ languages: ['en', 'ar'] })
    await startNew(user)

    await user.click(await screen.findByRole('radio', { name: /Scoops or pieces/ }))
    await next(user)

    // Three blank rows to fill, one language at a time.
    await heading('What can guests choose from?')
    expect(screen.getByRole('radio', { name: /Type your own list/ })).toBeChecked()
    expect(screen.getAllByRole('textbox', { name: /^Choice \d$/ })).toHaveLength(3)
    await fillRows(user, [
      ['Vanilla', '0'],
      ['Mango', '1'],
    ])
    await user.click(screen.getByRole('button', { name: 'Remove choice 3' }))
    await user.click(screen.getByRole('button', { name: 'Add a choice' }))
    expect(screen.getByRole('textbox', { name: 'Choice 3' })).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Remove choice 3' }))
    await moveDown(user, screen.getAllByRole('button', { name: 'Reorder' })[0]!)
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Choice 1' })).toHaveValue('Mango'),
    )
    await user.click(screen.getByRole('tab', { name: 'AR' }))
    expect(screen.getByRole('textbox', { name: 'Choice 1' })).toHaveAttribute('dir', 'rtl')
    await next(user)

    // Pieces: how many, More for the rest, no part prices.
    await heading('How it is made and its sizes')
    expect(screen.queryByText('Like ice cream: separate pieces')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3 pieces' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Set your own prices' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5 pieces' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('button', { name: '5 pieces' }))
    // "Fewer" would hide a size that is on.
    expect(screen.queryByRole('button', { name: 'Fewer' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '5 pieces' }))
    await user.click(screen.getByRole('button', { name: 'Fewer' }))
    expect(screen.queryByRole('button', { name: '5 pieces' })).not.toBeInTheDocument()
    await next(user)

    // On your menu: named and given an icon by the card.
    await heading('On your menu')
    expect(screen.getByRole('textbox', { name: /^Name on the menu/ })).toHaveValue('Ice cream')
    expect(screen.getByRole('radio', { name: 'Ice cream' })).toBeChecked()
    await next(user)

    await heading('Review')
    const summary = screen.getByRole('region', { name: 'Your build' })
    expect(summary).toHaveTextContent('DishIce cream')
    expect(summary).toHaveTextContent('Your own list: 2 choices')
    expect(summary).toHaveTextContent('3 pieces')
    await user.click(screen.getByRole('button', { name: 'Add build' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent('post')).toEqual({
      name: { en: 'Ice cream', ar: 'بوظة' },
      icon: 'ice-cream',
      category_id: null,
      price: null,
      ingredients: { en: '', ar: '' },
      builds: [
        {
          name: { en: 'Ice cream', ar: 'بوظة' },
          shape: 'pieces',
          parts: [3],
          category_id: null,
          dish_ids: null,
          choices: [
            { name: { en: 'Mango', ar: '' }, price: 1 },
            { name: { en: 'Vanilla', ar: '' }, price: 0 },
          ],
        },
      ],
    })
    expect((await screen.findAllByText('Build added'))[0]).toBeInTheDocument()
  })

  it('changes a saved build and its dish, sending the dish’s other build as it was', async () => {
    const user = userEvent.setup()
    mock.onPatch('/api/dishes/20').reply(200, { data: makeDish({ id: 20 }) })
    open()

    await user.click(await screen.findByRole('button', { name: 'Edit Topping on Three scoops' }))
    expect(screen.getByRole('heading', { name: 'Edit build' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Scoops or pieces/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Save build' })).toBeInTheDocument()

    // Its dish, as it is on the menu.
    await user.click(screen.getByRole('button', { name: 'Step 4: On your menu, done' }))
    expect(await screen.findByRole('textbox', { name: /^Name on the menu/ })).toHaveValue(
      'Three scoops',
    )
    expect(screen.getByRole('radio', { name: 'No icon' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Ice cream' }))

    await user.click(screen.getByRole('button', { name: 'Step 3: Sizes, done' }))
    await user.click(await screen.findByRole('button', { name: '2 pieces' }))
    // The review sends the owner back to a step.
    await user.click(screen.getByRole('button', { name: 'Step 5: Review' }))
    await user.click(await screen.findByRole('button', { name: 'Edit What guests build' }))
    await heading('What do guests build?')
    await user.click(screen.getByRole('button', { name: 'Save build' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    // Its old category and price go: it sits above the search now.
    expect(sent('patch')).toEqual({
      name: { en: 'Three scoops' },
      icon: 'ice-cream',
      category_id: null,
      price: null,
      ingredients: { en: '' },
      builds: [
        {
          id: 5,
          name: { en: 'Your scoops' },
          shape: 'pieces',
          parts: [3],
          category_id: null,
          dish_ids: null,
          choices: [
            { id: 50, name: { en: 'Vanilla' }, price: 0 },
            { id: 51, name: { en: 'Pistachio' }, price: 1 },
          ],
        },
        {
          id: 6,
          name: { en: 'Three scoops' },
          shape: 'pieces',
          parts: [1, 2],
          category_id: null,
          dish_ids: null,
          choices: [
            { id: 60, name: { en: 'Vanilla' }, price: 0 },
            { id: 61, name: { en: 'Pistachio' }, price: 1 },
          ],
        },
      ],
    })
    expect((await screen.findAllByText('Build saved'))[0]).toBeInTheDocument()
  })

  it('opens the step at fault when the server refuses a save', async () => {
    const user = userEvent.setup()
    mock.onPatch('/api/dishes/13').reply(422, {
      message: 'The given data was invalid.',
      errors: {
        'builds.0.parts.1': ['Too many parts.'],
        'builds.0.choices.0.part_prices.2': ['That half costs too much.'],
        'name.en': ['That name is taken.'],
        builds: ['A dish can have 3 builds at most.'],
      },
    })
    open()

    await user.click(
      await screen.findByRole('button', { name: 'Edit Your pizza on Build your pizza' }),
    )
    // Saved from the first step, as it is.
    await user.click(screen.getByRole('button', { name: 'Save build' }))
    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(sent('patch')).toEqual({
      name: { en: 'Build your pizza' },
      icon: null,
      category_id: null,
      price: null,
      ingredients: { en: '' },
      builds: [
        {
          id: 3,
          name: { en: 'Build your pizza' },
          shape: 'split',
          parts: [1, 2],
          category_id: 2,
          dish_ids: null,
          choices: [
            { dish_id: 10, part_prices: { '2': 7 } },
            { dish_id: 12, part_prices: { '2': 5 } },
          ],
        },
      ],
    })

    await heading('How it is made and its sizes')
    expect(screen.getByText('Too many parts.')).toBeInTheDocument()
    expect(screen.getByText('A dish can have 3 builds at most.')).toBeInTheDocument()
    // Its own prices are open: it has some, and one was refused.
    expect(screen.getByRole('button', { name: 'Set your own prices' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByLabelText('Margherita, price for one of 2 parts')).toHaveValue(7)
    expect(screen.getByText('That half costs too much.')).toBeInTheDocument()

    // A pizza stays split: how it is made is not asked again.
    expect(screen.queryByRole('radio', { name: /Like a pizza/ })).not.toBeInTheDocument()

    // The dish's own mistake waits on its step.
    await user.click(screen.getByRole('button', { name: 'Step 4: On your menu, done' }))
    expect(await screen.findByText('That name is taken.')).toBeInTheDocument()
  })

  it('asks how something else is made, and titles it with its dish’s name', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/dishes').reply(201, { data: makeDish({ id: 99 }) })
    open()
    await startNew(user)

    await user.click(await screen.findByRole('radio', { name: /Something else/ }))
    await next(user)

    await heading('What can guests choose from?')
    expect(screen.getAllByRole('textbox', { name: /^Choice \d$/ })).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: /From a category/ }))
    expect(screen.getByRole('combobox', { name: /^Category/ })).toHaveValue('Pizzas')
    await user.click(screen.getByRole('radio', { name: /Type your own list/ }))
    await next(user)
    expect(await screen.findAllByText('Give every choice a name in English.')).toHaveLength(2)
    await fillRows(user, [
      ['Rice', '2'],
      ['Fries', '3'],
    ])
    await next(user)

    await heading('How it is made and its sizes')
    expect(screen.getByRole('radio', { name: /Like a pizza/ })).toBeChecked()
    await next(user)
    expect(await screen.findByText('Pick at least one size.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Like ice cream/ }))
    await user.click(screen.getByRole('button', { name: '2 pieces' }))
    await next(user)

    await heading('On your menu')
    await next(user)
    expect(await screen.findByText('Give the dish a name in English.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /^Name on the menu/ }), 'Sides')
    // Something else starts with no icon.
    expect(screen.getByRole('radio', { name: 'No icon' })).toBeChecked()
    await next(user)

    await heading('Review')
    const preview = screen.getByRole('region', { name: 'What guests see' })
    expect(preview).toHaveTextContent('Part 1')
    expect(preview).toHaveTextContent('Add $5.00')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await heading('On your menu')
    await next(user)
    await user.click(await screen.findByRole('button', { name: 'Add build' }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(sent('post')).toMatchObject({
      name: { en: 'Sides' },
      icon: null,
      category_id: null,
      builds: [{ name: { en: 'Sides' }, shape: 'pieces', parts: [2] }],
    })
  })

  it('shows what thirds come to', async () => {
    const user = userEvent.setup()
    open()
    await startNew(user)
    await user.click(await screen.findByRole('radio', { name: /Something else/ }))
    await next(user)
    await fillRows(user, [
      ['Nuts', '1'],
      ['Caramel', '2'],
    ])
    await next(user)
    await user.click(await screen.findByRole('button', { name: 'Thirds' }))
    await next(user)
    await user.type(
      await screen.findByRole('textbox', { name: /^Name on the menu/ }),
      'Topping bowl',
    )
    await next(user)

    const preview = await screen.findByRole('region', { name: 'What guests see' })
    // A third of each in turn: 1/3 + 2/3 + 1/3 of their prices.
    expect(preview).toHaveTextContent('Third')
    expect(preview).toHaveTextContent('Add $1.33')
  })

  it('keeps an icon the owner picked when another card is chosen', async () => {
    const user = userEvent.setup()
    open()
    await startNew(user)
    await user.click(await screen.findByRole('radio', { name: /Scoops or pieces/ }))
    await next(user)
    await fillRows(user, [
      ['Vanilla', '0'],
      ['Mango', '1'],
    ])
    await user.click(screen.getByRole('button', { name: 'Remove choice 3' }))
    await next(user)
    await heading('How it is made and its sizes')
    await next(user)

    await heading('On your menu')
    await user.click(screen.getByRole('radio', { name: 'Coffee' }))
    await user.click(screen.getByRole('button', { name: 'Step 1: What, done' }))
    await user.click(await screen.findByRole('radio', { name: /A pizza, half and half/ }))
    await user.click(screen.getByRole('button', { name: /^Step 4: On your menu/ }))
    expect(await screen.findByRole('radio', { name: 'Coffee' })).toBeChecked()
  })

  it('asks before dropping what was changed', async () => {
    const user = userEvent.setup()
    open()
    await startNew(user)

    // Nothing changed yet: it leaves at once.
    await user.click(screen.getByRole('button', { name: 'Back to your builds' }))
    await startNew(user)

    await user.click(await screen.findByRole('radio', { name: /A pizza, half and half/ }))
    await user.click(screen.getByRole('button', { name: 'Back to your builds' }))
    const dialog = screen.getByRole('dialog', { name: 'Leave without saving?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'New build' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to your builds' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Leave' }))
    expect(await screen.findByRole('heading', { name: 'Build your pizza' })).toBeInTheDocument()
  })

  it('says when the save fails for another reason', async () => {
    const user = userEvent.setup()
    mock.onPatch('/api/dishes/20').reply(500, { message: 'Server error' })
    open()

    await user.click(await screen.findByRole('button', { name: 'Edit Topping on Three scoops' }))
    await user.click(screen.getByRole('button', { name: 'Save build' }))
    expect((await screen.findAllByText('Could not save the build'))[0]).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit build' })).toBeInTheDocument()
  })

  it('holds 30 choices at most', async () => {
    const user = userEvent.setup()
    open()

    await user.click(await screen.findByRole('button', { name: 'Edit Big bowl on Poke bowl' }))
    await user.click(screen.getByRole('button', { name: 'Step 2: Choices, done' }))
    await user.click(await screen.findByRole('button', { name: 'Add a choice' }))
    expect(screen.getAllByRole('textbox', { name: /^Choice \d+$/ })).toHaveLength(30)
    expect(screen.queryByRole('button', { name: 'Add a choice' })).not.toBeInTheDocument()
  })

  it('asks for 2 choices in a list', async () => {
    const user = userEvent.setup()
    open()
    await startNew(user)
    await user.click(await screen.findByRole('radio', { name: /Something else/ }))
    await next(user)

    await heading('What can guests choose from?')
    await user.click(screen.getByRole('button', { name: 'Remove choice 2' }))
    await next(user)
    expect(await screen.findByText('A list needs 2 to 30 choices.')).toBeInTheDocument()
  })

  it('says what guests pay only once there is a choice to pay for', async () => {
    const user = userEvent.setup()
    open()
    await startNew(user)
    await user.click(await screen.findByRole('radio', { name: /A pizza, half and half/ }))
    await next(user)
    await heading('What can guests choose from?')
    await pick(user, 'Category', 'Drinks')
    await next(user)
    await heading('How it is made and its sizes')
    await next(user)
    await heading('On your menu')
    await next(user)

    await heading('Review')
    expect(screen.getByRole('region', { name: 'What guests see' })).toHaveTextContent(
      'Add choices with a price to see what guests pay.',
    )
  })

  it('opens the step with a mistake when a saved build no longer holds up', async () => {
    const user = userEvent.setup()
    open()

    await user.click(await screen.findByRole('button', { name: 'Edit Topping on Three scoops' }))
    await user.click(screen.getByRole('button', { name: 'Step 4: On your menu, done' }))
    await user.clear(await screen.findByRole('textbox', { name: /^Name on the menu/ }))
    await user.click(screen.getByRole('button', { name: 'Step 1: What, done' }))
    await heading('What do guests build?')
    await user.click(screen.getByRole('button', { name: 'Save build' }))

    await heading('On your menu')
    expect(screen.getByText('Give the dish a name in English.')).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)
  })

  it('says when a new build’s dish could not be made', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/dishes').reply(500, { message: 'Server error' })
    open()
    await startNew(user)

    await user.click(await screen.findByRole('radio', { name: /Scoops or pieces/ }))
    await next(user)
    await fillRows(user, [
      ['Vanilla', '1'],
      ['Mango', '1'],
    ])
    await user.click(screen.getByRole('button', { name: 'Remove choice 3' }))
    await next(user)
    await heading('How it is made and its sizes')
    await next(user)
    await heading('On your menu')
    await next(user)
    await heading('Review')
    await user.click(screen.getByRole('button', { name: 'Add build' }))

    expect((await screen.findAllByText('Could not save the build'))[0]).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New build' })).toBeInTheDocument()
  })

  it('fills in the other language with AI as it saves', async () => {
    const user = userEvent.setup()
    mock.onPost('/api/writing/translate-many').reply(200, {
      data: { texts: ['ثلاث كرات', 'فانيلا', 'فستق'], left: 29 },
    })
    mock.onPatch('/api/dishes/20').reply(200, { data: makeDish({ id: 20 }) })
    open({ languages: ['en', 'ar'], uses: makeWritingHelp({ limit: 30, left: 30 }) })

    await user.click(await screen.findByRole('button', { name: 'Edit Topping on Three scoops' }))
    await user.click(screen.getByRole('button', { name: 'Step 2: Choices, done' }))
    expect(screen.getByText(/one is enough/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save build' }))

    await waitFor(() => expect(mock.history.patch).toHaveLength(1))
    expect(JSON.parse(mock.history.post[0]!.data as string)).toEqual({
      items: [
        { text: 'Three scoops', from: 'en', to: 'ar', max: 60 },
        { text: 'Vanilla', from: 'en', to: 'ar', max: 40 },
        { text: 'Pistachio', from: 'en', to: 'ar', max: 40 },
      ],
    })
    expect(sent('patch')).toMatchObject({ name: { en: 'Three scoops', ar: 'ثلاث كرات' } })
    // Its title is the dish's name, in both languages.
    expect((sent('patch').builds as { name: unknown }[])[1]).toMatchObject({
      name: { en: 'Three scoops', ar: 'ثلاث كرات' },
      choices: [
        { name: { en: 'Vanilla', ar: 'فانيلا' } },
        { name: { en: 'Pistachio', ar: 'فستق' } },
      ],
    })
  })
})
