import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRestaurant } from '@/features/auth'
import { api } from '@/lib/api/client'
import { makeDish } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
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

function open(session: Partial<AuthRestaurant> = {}) {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'], ...session }) })
  const onAdd = vi.fn()
  renderWithProviders(<DishPicker dishes={[BURGER, SOUP]} currency="USD" onAdd={onAdd} />)
  return { onAdd, user: userEvent.setup() }
}

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
    expect(screen.getByRole('option', { name: /^Large/ })).toHaveTextContent('+3.00')
    // A free option shows no price beside it.
    expect(screen.getByRole('option', { name: 'Small' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /^Large/ }))
    expect(add).toBeEnabled()
    expect(screen.getByText('$11.00')).toBeInTheDocument()

    const cheese = screen.getByRole('switch', { name: 'Extra cheese' })
    expect(within(cheese.closest('li')!).getByText('+1.00')).toBeInTheDocument()
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
})
