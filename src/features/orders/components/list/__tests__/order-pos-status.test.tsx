import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { OrderCard } from '@/features/orders/components/list/order-card'
import type { Order } from '@/features/orders/schemas/order.schema'

let mock: MockAdapter

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 7,
    reference: 'ABC234',
    status: 'placed',
    currency: 'USD',
    total: '12.00',
    exchange_rate: null,
    note: null,
    fulfilment: 'pickup',
    table: null,
    name: null,
    phone: null,
    address: null,
    map_url: null,
    placed_at: '2026-10-30T11:30:00+00:00',
    accepted_at: null,
    guest_updated_at: null,
    guest_updates: 0,
    owner_updated_at: null,
    pos: null,
    cancel_reason: null,
    items: [
      {
        id: 1,
        name: 'Hummus',
        options: null,
        unit_price: '6.00',
        quantity: 2,
        line_total: '12.00',
        currency: 'USD',
      },
    ],
    ...overrides,
  }
}

function show(order: Order) {
  const onMove = vi.fn()
  renderWithProviders(
    <OrderCard
      order={order}
      onMove={onMove}
      onCancel={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  )
  return { onMove, user: userEvent.setup() }
}

async function menuItems(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'More for order ABC234' }))
  return screen.getAllByRole('menuitem').map((item) => item.textContent)
}

describe('an order sent to the POS', () => {
  beforeEach(() => {
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

  it('shows it in the POS with its number, and offers no step and no edit', async () => {
    const { user } = show(makeOrder({ pos: { status: 'sent', number: 'W-0012', error: null } }))

    expect(screen.getByText('In your POS · W-0012')).toBeInTheDocument()
    expect(screen.getByText('Handled in your POS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(await menuItems(user)).toEqual(['Delete'])
  })

  it('says it is on its way, or in the POS without a number', () => {
    show(makeOrder({ pos: { status: 'sending', number: null, error: null } }))
    expect(screen.getByText('Sending to your POS')).toBeInTheDocument()
  })

  it('says it is in the POS when the POS gave no number', () => {
    show(makeOrder({ pos: { status: 'sent', number: null, error: null } }))
    expect(screen.getByText('In your POS')).toBeInTheDocument()
  })

  it('warns it was not sent, says why, and sends it again on Try again', async () => {
    mock.onPost('/api/orders/7/send-to-pos').reply(200, {
      data: makeOrder({ pos: { status: 'sending', number: null, error: null } }),
    })
    const { user } = show(
      makeOrder({ pos: { status: 'failed', number: null, error: '"Hummus" is no longer sold.' } }),
    )

    expect(screen.getByText('Not sent to your POS')).toBeInTheDocument()
    expect(screen.getByText('"Hummus" is no longer sold.')).toBeInTheDocument()
    // Not in the POS: the restaurant handles it here meanwhile.
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() =>
      expect(
        mock.history.post.filter((call) => call.url === '/api/orders/7/send-to-pos'),
      ).toHaveLength(1),
    )
  })

  it('offers no Try again once the order is finished, and words a silent POS', () => {
    show(makeOrder({ status: 'done', pos: { status: 'failed', number: null, error: null } }))

    expect(screen.getByText('Your POS did not answer.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('says why the POS called it off', () => {
    show(
      makeOrder({
        status: 'cancelled',
        pos: { status: 'sent', number: 'W-0012', error: null },
        cancel_reason: 'Out of hummus',
      }),
    )

    expect(screen.getByText('Your POS called it off')).toBeInTheDocument()
    expect(screen.getByText('Out of hummus')).toBeInTheDocument()
  })

  it('says why after a failed send too, and nothing for an order never sent', () => {
    show(
      makeOrder({
        status: 'cancelled',
        pos: { status: 'failed', number: null, error: 'No answer' },
        cancel_reason: 'Closed early',
      }),
    )
    expect(screen.getByText('Closed early')).toBeInTheDocument()
  })

  it('shows a reason on an order the POS cancelled without a send record', () => {
    show(makeOrder({ status: 'cancelled', cancel_reason: 'Out of hummus' }))
    expect(screen.getByText('Out of hummus')).toBeInTheDocument()
  })

  it('shows nothing of a POS on an order never sent', () => {
    show(makeOrder())
    expect(screen.queryByText(/your POS/)).not.toBeInTheDocument()
  })
})
