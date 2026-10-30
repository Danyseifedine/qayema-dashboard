import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRestaurant } from '@/features/auth'
import type { Dish } from '@/features/menu'
import { api } from '@/lib/api/client'
import { makeDish } from '@/test/factories/menu'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { DishPicker } from '@/features/orders/components/edit/dish-picker'

let mock: MockAdapter

const BURGER = makeDish({
  id: 5,
  name: { en: 'Burger', ar: null },
  price: '8.00',
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
})

const SOUP = makeDish({
  id: 6,
  name: { en: 'Lentil soup', ar: null },
  price: '4.00',
  is_available: false,
})

function built(overrides: Partial<Dish>, builds: Dish['builds']): Dish {
  return makeDish({ ...overrides, builds })
}

// A pizza of two halves or whole, from the Pizzas category; Margherita has
// a half priced at $7, Pepperoni pays half of $16.
const PIZZA = built({ id: 100, name: { en: 'Pizza', ar: null }, price: '2.00', category_id: 2 }, [
  {
    id: 4,
    name: { en: 'Your pizza' },
    shape: 'split',
    parts: [1, 2],
    category_id: 2,
    dish_ids: null,
    choices: [{ id: 1, dish_id: 12, name: null, price: null, part_prices: { '2': '7.00' } }],
  },
])
const MARGHERITA = makeDish({
  id: 12,
  name: { en: 'Margherita', ar: null },
  price: '12.00',
  category_id: 2,
})
const PEPPERONI = makeDish({
  id: 13,
  name: { en: 'Pepperoni', ar: null },
  price: '16.00',
  category_id: 2,
})
// Two scoops, no price but theirs.
const SCOOPS = built({ id: 200, name: { en: 'Ice cream', ar: null }, price: null }, [
  {
    id: 5,
    name: { en: 'Your scoops' },
    shape: 'pieces',
    parts: [2],
    category_id: null,
    dish_ids: null,
    choices: [
      { id: 50, dish_id: null, name: { en: 'Vanilla' }, price: '2.00', part_prices: {} },
      { id: 51, dish_id: null, name: { en: 'Chocolate' }, price: '2.50', part_prices: {} },
    ],
  },
])

function open(session: Partial<AuthRestaurant> = {}, dishes: Dish[] = [BURGER, SOUP]) {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'], ...session }) })
  const onAdd = vi.fn()
  renderWithProviders(<DishPicker dishes={dishes} onAdd={onAdd} />)
  return { onAdd, user: userEvent.setup() }
}

const BUILT_MENU = [PIZZA, MARGHERITA, PEPPERONI, SCOOPS]

/** A pizza priced by its sizes only, from the Pizzas category of the halves below. */
function sized(id: number, name: string, sizes: Record<string, string>): Dish {
  return makeDish({
    id,
    name: { en: name, ar: null },
    price: null,
    category_id: 7,
    variants: [
      {
        id: id * 10,
        name: { en: 'Size' },
        options: Object.entries(sizes).map(([size, price], index) => ({
          id: id * 10 + index + 1,
          name: { en: size },
          price,
        })),
      },
    ],
  })
}

const HALVES = built({ id: 400, name: { en: 'Half and half', ar: null }, price: null }, [
  {
    id: 9,
    name: { en: 'Your pizza' },
    shape: 'split',
    parts: [2],
    category_id: 7,
    dish_ids: null,
    choices: [],
  },
])
const SIZED_MENU = [
  HALVES,
  sized(401, 'Margherita', { Small: '8.00', Large: '12.00' }),
  sized(402, 'Pepperoni', { Small: '10.00', Large: '16.00' }),
  sized(403, 'Veggie', { Small: '9.00' }),
]

describe('DishPicker', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('offers a dish hidden from guests too, and says it is hidden', async () => {
    const { user } = open()

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))

    expect(await screen.findByRole('option', { name: 'Burger' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Lentil soup/ })).toHaveTextContent(
      'Hidden from guests',
    )
  })

  it('asks for a size before adding, prices every choice, then starts over', async () => {
    const { onAdd, user } = open()

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Burger' }))

    const size = await screen.findByRole('combobox', { name: 'Size' })
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeDisabled()
    expect(screen.getByText('$8.00')).toBeInTheDocument()

    await user.click(size)
    expect(screen.getByRole('option', { name: /^Large/ })).toHaveTextContent('+$3.00')
    // A free option shows no price beside it.
    expect(screen.getByRole('option', { name: 'Small' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /^Large/ }))
    expect(add).toBeEnabled()
    expect(screen.getByText('$11.00')).toBeInTheDocument()

    const cheese = screen.getByRole('switch', { name: 'Extra cheese' })
    expect(within(cheese.closest('li')!).getByText('+$1.00')).toBeInTheDocument()
    await user.click(cheese)
    expect(screen.getByText('$12.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'How many +1' }))
    expect(screen.getByText('$24.00')).toBeInTheDocument()

    // Changing their mind about the cheese takes its price back off.
    await user.click(cheese)
    expect(screen.getByText('$22.00')).toBeInTheDocument()
    await user.click(cheese)
    await user.click(add)

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 5,
      quantity: 2,
      options: [71],
      addons: [9],
    })
    // Ready for the next dish: nothing picked, nothing to add yet.
    expect(screen.getByRole('combobox', { name: 'Dish' })).toHaveValue('')
    expect(screen.queryByRole('combobox', { name: 'Size' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Extra cheese' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('keeps the size picked when Escape is pressed on its closed list', async () => {
    const { user } = open()

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Burger' }))
    const size = await screen.findByRole('combobox', { name: 'Size' })
    await user.click(size)
    await user.click(screen.getByRole('option', { name: /^Large/ }))

    size.focus()
    await user.keyboard('{Escape}')

    // A size can be changed but never taken back off, so Add stays ready.
    expect(size).toHaveValue('Large')
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    expect(screen.getByText('$11.00')).toBeInTheDocument()
  })

  it('forgets the choices of a dish when another one is picked', async () => {
    const { onAdd, user } = open()

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Burger' }))
    await user.click(await screen.findByRole('combobox', { name: 'Size' }))
    await user.click(screen.getByRole('option', { name: /^Large/ }))
    await user.click(screen.getByRole('switch', { name: 'Extra cheese' }))

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(screen.getByRole('option', { name: /^Lentil soup/ }))
    expect(screen.queryByRole('combobox', { name: 'Size' })).not.toBeInTheDocument()
    expect(screen.getByText('$4.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 6,
      quantity: 1,
      options: [],
      addons: [],
    })
  })

  it('asks no size while variants are switched off, and still offers the add-ons', async () => {
    const { onAdd, user } = open({ switched_off: ['variants'] })

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Burger' }))

    expect(await screen.findByRole('switch', { name: 'Extra cheese' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Size' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 5,
      quantity: 1,
      options: [],
      addons: [],
    })
  })

  it('asks for every part of a build before adding, prices it, and sends what was built', async () => {
    const { onAdd, user } = open({}, BUILT_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Pizza' }))

    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Your pizza' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Your pizza: how many' }))
    expect(screen.getByRole('option', { name: 'Whole' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Half & half' }))

    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 1' }))
    // A set half price, else half of the whole.
    expect(screen.getByRole('option', { name: /^Margherita/ })).toHaveTextContent('+$7.00')
    expect(screen.getByRole('option', { name: /^Pepperoni/ })).toHaveTextContent('+$8.00')
    await user.click(screen.getByRole('option', { name: /^Margherita/ }))
    // One half is not a pizza yet.
    expect(add).toBeDisabled()
    expect(screen.getByText('$2.00')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 2' }))
    await user.click(screen.getByRole('option', { name: /^Pepperoni/ }))
    expect(add).toBeEnabled()
    expect(screen.getByText('$17.00')).toBeInTheDocument()
    await user.click(add)

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 100,
      quantity: 1,
      options: [],
      addons: [],
      builds: [{ build: 4, parts: ['d12', 'd13'] }],
    })
    expect(screen.queryByRole('group', { name: 'Your pizza' })).not.toBeInTheDocument()
  })

  it('keeps the parts already picked when the count changes', async () => {
    const { onAdd, user } = open({}, BUILT_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Pizza' }))
    await user.click(screen.getByRole('combobox', { name: 'Your pizza: how many' }))
    await user.click(screen.getByRole('option', { name: 'Half & half' }))
    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 1' }))
    await user.click(screen.getByRole('option', { name: /^Pepperoni/ }))

    await user.click(screen.getByRole('combobox', { name: 'Your pizza: how many' }))
    await user.click(screen.getByRole('option', { name: 'Whole' }))

    // A whole is the choice alone, at its full price.
    const whole = screen.getByRole('combobox', { name: 'Your pizza' })
    expect(whole).toHaveValue('Pepperoni')
    expect(screen.getByText('$18.00')).toBeInTheDocument()
    await user.click(whole)
    expect(screen.getByRole('option', { name: /^Margherita/ })).toHaveTextContent('+$12.00')
    // Escape on the open list picks nothing new.
    await user.keyboard('{Escape}')
    expect(whole).toHaveValue('Pepperoni')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ builds: [{ build: 4, parts: ['d13'] }] }),
    )
  })

  it('asks no count when the build allows one, and sells a dish its build alone prices', async () => {
    const { onAdd, user } = open({}, BUILT_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Ice cream' }))

    expect(screen.queryByRole('combobox', { name: 'Your scoops: how many' })).toBeNull()
    await user.click(screen.getByRole('combobox', { name: 'Your scoops, part 1' }))
    expect(screen.getByRole('option', { name: /^Chocolate/ })).toHaveTextContent('+$2.50')
    await user.click(screen.getByRole('option', { name: /^Chocolate/ }))
    await user.click(screen.getByRole('combobox', { name: 'Your scoops, part 2' }))
    await user.click(screen.getByRole('option', { name: /^Vanilla/ }))
    expect(screen.getByText('$4.50')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'How many +1' }))
    expect(screen.getByText('$9.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 200,
      quantity: 2,
      options: [],
      addons: [],
      builds: [{ build: 5, parts: ['c51', 'c50'] }],
    })
  })

  it('forgets the parts of a build when another dish is picked', async () => {
    const { user } = open({}, BUILT_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Ice cream' }))
    await user.click(screen.getByRole('combobox', { name: 'Your scoops, part 1' }))
    await user.click(screen.getByRole('option', { name: /^Chocolate/ }))

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(screen.getByRole('option', { name: 'Pizza' }))
    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(screen.getByRole('option', { name: 'Ice cream' }))

    expect(screen.getByRole('combobox', { name: 'Your scoops, part 1' })).toHaveValue('')
  })

  it('asks the size of a build priced by size first, and prices its halves at it', async () => {
    const { onAdd, user } = open({}, SIZED_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Half and half' }))

    const size = screen.getByRole('combobox', { name: 'Your pizza: size' })
    expect(size).toHaveValue('Small')
    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 1' }))
    expect(screen.getByRole('option', { name: /^Veggie/ })).toHaveTextContent('+$4.50')
    await user.click(screen.getByRole('option', { name: /^Veggie/ }))
    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 2' }))
    await user.click(screen.getByRole('option', { name: /^Margherita/ }))
    expect(screen.getByText('$8.50')).toBeInTheDocument()

    await user.click(size)
    await user.click(screen.getByRole('option', { name: 'Large' }))
    // Veggie is not made Large: its half is asked again, Margherita stays.
    expect(screen.getByRole('combobox', { name: 'Your pizza, part 1' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Your pizza, part 2' })).toHaveValue('Margherita')
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await user.click(screen.getByRole('combobox', { name: 'Your pizza, part 1' }))
    expect(screen.queryByRole('option', { name: /^Veggie/ })).toBeNull()
    expect(screen.getByRole('option', { name: /^Pepperoni/ })).toHaveTextContent('+$8.00')
    await user.click(screen.getByRole('option', { name: /^Pepperoni/ }))
    expect(screen.getByText('$14.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 400,
      quantity: 1,
      options: [],
      addons: [],
      builds: [{ build: 9, parts: ['d402', 'd401'], size: 'large' }],
    })
  })

  it('asks no builds without them on the package, and leaves out a dish only they price', async () => {
    const { onAdd, user } = open({ plan: { ...FULL_PLAN, build_your_own: false } }, BUILT_MENU)

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    expect(await screen.findByRole('option', { name: 'Pizza' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Ice cream' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Pizza' }))

    expect(screen.queryByRole('group', { name: 'Your pizza' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledExactlyOnceWith({
      dish_id: 100,
      quantity: 1,
      options: [],
      addons: [],
    })
  })

  it('asks for a group of add-ons within its fewest and most', async () => {
    const hummus = makeDish({
      id: 50,
      name: { en: 'Hummus', ar: null },
      price: '5.00',
      addon_groups: [
        {
          id: 8,
          name: { en: 'Sauces' },
          min_select: 1,
          max_select: 2,
          addons: [
            { id: 81, name: { en: 'Garlic' }, price: '0.50' },
            { id: 82, name: { en: 'Chili' }, price: '0.50' },
            { id: 83, name: { en: 'Tahini' }, price: '1.00' },
          ],
        },
      ],
    })
    const { onAdd, user } = open({}, [hummus])

    await user.click(screen.getByRole('combobox', { name: 'Dish' }))
    await user.click(await screen.findByRole('option', { name: 'Hummus' }))

    const group = (await screen.findByText('Sauces')).closest('[data-pick-group]') as HTMLElement
    expect(within(group).getByText('Pick 1 to 2')).toBeInTheDocument()
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeDisabled()

    await user.click(within(group).getByRole('switch', { name: 'Garlic' }))
    expect(add).toBeEnabled()
    await user.click(within(group).getByRole('switch', { name: 'Tahini' }))
    // Its most is picked: the last one is off.
    expect(within(group).getByRole('switch', { name: 'Chili' })).toBeDisabled()
    expect(screen.getByText('$6.50')).toBeInTheDocument()

    await user.click(add)
    expect(onAdd).toHaveBeenCalledWith({ dish_id: 50, quantity: 1, options: [], addons: [81, 83] })
  })
})
