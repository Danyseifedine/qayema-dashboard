import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeDish } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { EditOrderDialog } from '@/features/orders/components/edit/edit-order-dialog'
import type { Order } from '@/features/orders/schemas/order.schema'

let mock: MockAdapter

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    reference: 'ABC234',
    status: 'accepted',
    currency: 'USD',
    total: '24.00',
    note: null,
    fulfilment: 'pickup',
    table: null,
    name: null,
    phone: null,
    address: null,
    map_url: null,
    placed_at: '2026-09-24T11:30:00+00:00',
    accepted_at: '2026-09-24T11:35:00+00:00',
    guest_updated_at: null,
    guest_updates: 0,
    owner_updated_at: null,
    items: [
      {
        id: 1,
        name: 'Burger',
        options: {
          variants: [{ name: 'Size', choice: 'Large', price: '3.00' }],
          addons: [{ name: 'Extra cheese', price: '1.00' }],
        },
        unit_price: '12.00',
        quantity: 2,
        line_total: '24.00',
      },
    ],
    ...overrides,
  }
}

const WRAP = makeDish({
  id: 5,
  name: { en: 'Wrap', ar: null },
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
  addons: [
    { id: 9, name: { en: 'Extra cheese' }, price: '1.00' },
    { id: 10, name: { en: 'Fries' }, price: '2.00' },
  ],
})

const SOUP = makeDish({ id: 6, name: { en: 'Lentil soup', ar: null }, price: '4.00' })

function open(order: Order = makeOrder()) {
  const onClose = vi.fn()
  const view = renderWithProviders(<EditOrderDialog order={order} onClose={onClose} />)
  return { onClose, user: userEvent.setup(), dialog: screen.getByRole('dialog'), ...view }
}

async function pickDish(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  name: string,
) {
  await user.click(within(dialog).getByRole('combobox', { name: 'Dish' }))
  await user.click(await screen.findByRole('option', { name }))
}

describe('EditOrderDialog', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
    mock.onGet('/api/dishes').reply(200, {
      data: [WRAP, SOUP],
      meta: { used: 2, limit: 40, currency: 'USD' },
    })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('shows each line with what the guest chose and the price it was sold at', () => {
    const { dialog } = open()

    expect(within(dialog).getByRole('heading', { name: 'Edit order ABC234' })).toBeInTheDocument()
    expect(within(dialog).getByText(/Dishes already on it keep the price/)).toBeInTheDocument()
    expect(within(dialog).getByText('Large · + Extra cheese · 12.00 each')).toBeInTheDocument()
    expect(within(dialog).getByText('$24.00')).toBeInTheDocument()
  })

  it('adds a dish with its choices, counts it in the total, and sends it', async () => {
    mock.onPut('/api/orders/1/items').reply(200, { data: makeOrder({ total: '60.00' }) })
    const { dialog, onClose, user } = open()

    await pickDish(user, dialog, 'Wrap')
    await user.click(await within(dialog).findByRole('combobox', { name: 'Size' }))
    await user.click(screen.getByRole('option', { name: /^Large/ }))
    await user.click(within(dialog).getByRole('switch', { name: 'Extra cheese' }))
    await user.click(within(dialog).getByRole('switch', { name: 'Fries' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))

    const added = within(dialog).getByText('Added').closest('li')!
    expect(added).toHaveTextContent('Wrap')
    expect(within(added).getByText('Large · + Extra cheese · + Fries')).toBeInTheDocument()
    // 2 x 12.00 kept, plus 8.00 + 3.00 + 1.00 + 2.00 added.
    expect(within(dialog).getByText('$38.00')).toBeInTheDocument()

    await user.click(within(added).getByRole('button', { name: 'Wrap +1' }))
    expect(within(added).getByRole('group', { name: 'Wrap' })).toHaveTextContent('2')
    expect(within(dialog).getByText('$52.00')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      items: [{ id: 1, quantity: 2 }],
      add: [{ dish_id: 5, quantity: 2, options: [71], addons: [9, 10] }],
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(await screen.findByText('Order ABC234 updated')).toBeInTheDocument()
  })

  it('takes an added dish back off before saving', async () => {
    const { dialog, user } = open()

    await pickDish(user, dialog, 'Lentil soup')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(within(dialog).getByText('$28.00')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Remove Lentil soup' }))

    expect(within(dialog).queryByText('Added')).not.toBeInTheDocument()
    expect(within(dialog).getByText('$24.00')).toBeInTheDocument()
  })

  it('keeps an added dish that left the menu meanwhile, unnamed and out of the total', async () => {
    mock.onPut('/api/orders/1/items').reply(200, { data: makeOrder() })
    const { dialog, user, queryClient } = open()

    await pickDish(user, dialog, 'Lentil soup')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(within(dialog).getByText('$28.00')).toBeInTheDocument()

    // The soup is deleted in another tab, and the menu is fetched again.
    mock.onGet('/api/dishes').reply(200, {
      data: [WRAP],
      meta: { used: 1, limit: 40, currency: 'USD' },
    })
    await queryClient.refetchQueries()

    const added = (await within(dialog).findByRole('button', { name: 'Remove -' })).closest('li')!
    expect(added).not.toHaveTextContent('Lentil soup')
    expect(within(dialog).getByText('$24.00')).toBeInTheDocument()

    // The server has the last word: the line is still sent for it to judge.
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toMatchObject({
      add: [{ dish_id: 6, quantity: 1 }],
    })
  })

  it('says saving accepts a new order, and sends the version it showed', async () => {
    mock.onPut('/api/orders/1/items').reply(200, { data: makeOrder() })
    const { dialog, user } = open(makeOrder({ status: 'placed', guest_updates: 2 }))

    expect(within(dialog).getByText(/Saving accepts the order/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Burger +1' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      items: [{ id: 1, quantity: 3 }],
      add: [],
      guest_updates: 2,
    })
  })

  it('stays open and says why when the change could not be saved', async () => {
    mock.onPut('/api/orders/1/items').reply(500, { message: 'Server down', code: 'server_error' })
    const { dialog, onClose, user } = open()

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('Server down')).toBeInTheDocument()
    expect((await screen.findAllByText('Could not update that order')).length).toBeGreaterThan(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape and on the backdrop, but not on a click inside', () => {
    const { dialog, onClose } = open()

    fireEvent.click(within(dialog).getByRole('heading', { name: 'Edit order ABC234' }))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('cannot be closed while the change is on its way', async () => {
    let answer: (value: [number, unknown]) => void = () => {}
    mock.onPut('/api/orders/1/items').reply(
      () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    )
    const { dialog, onClose, user } = open()

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled(),
    )
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    answer([200, { data: makeOrder() }])
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('says so when the menu could not be loaded, and still edits what is there', async () => {
    mock.onGet('/api/dishes').reply(500, { message: 'Server down', code: 'server_error' })
    const { dialog } = open()

    expect(await within(dialog).findByText('Server down')).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Dish' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Burger +1' })).toBeEnabled()
  })
})
