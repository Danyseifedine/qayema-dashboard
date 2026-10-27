import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderCard } from '@/features/orders/components/list/order-card'
import type { Order } from '@/features/orders/schemas/order.schema'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
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
    placed_at: '2026-09-24T11:30:00+00:00',
    accepted_at: null,
    guest_updated_at: null,
    guest_updates: 0,
    owner_updated_at: null,
    items: [
      {
        id: 1,
        name: 'Kebab',
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
  render(
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

describe('OrderCard', () => {
  it('flags a guest change loudly while the order waits', () => {
    show(makeOrder({ guest_updates: 1, guest_updated_at: '2026-09-24T11:40:00+00:00' }))

    const note = screen.getByText(/^Changed by the guest at/).closest('[role="status"]')
    expect(note).toHaveClass('bg-status-warn-wash', 'text-status-warn')
  })

  it('keeps a guest change quiet once the order is accepted', () => {
    show(
      makeOrder({
        status: 'accepted',
        guest_updates: 2,
        guest_updated_at: '2026-09-24T11:40:00+00:00',
      }),
    )

    const note = screen
      .getByText(/^Changed by the guest 2 times, last at/)
      .closest('[role="status"]')
    expect(note).toHaveClass('text-[var(--muted)]')
    expect(note).not.toHaveClass('bg-status-warn-wash')
  })

  it('reads a built dish after its variants and before its add-ons', () => {
    show(
      makeOrder({
        items: [
          {
            id: 1,
            name: 'Pizza',
            options: {
              variants: [{ name: 'Size', choice: 'Large', price: '2.00' }],
              addons: [{ name: 'Extra cheese', price: '1.00' }],
              builds: [
                {
                  name: 'Your pizza',
                  shape: 'split',
                  parts: [
                    { choice: 'Margherita', share: 2 },
                    { choice: 'Pepperoni', share: 2 },
                  ],
                  price: '15.00',
                  build_id: 4,
                  keys: ['d12', 'd13'],
                },
              ],
            },
            unit_price: '18.00',
            quantity: 1,
            line_total: '18.00',
            currency: 'USD',
          },
        ],
      }),
    )

    expect(
      screen.getByText('Size: Large · Your pizza: ½ Margherita + ½ Pepperoni · + Extra cheese'),
    ).toBeInTheDocument()
  })

  it('names the offer a line was bought on, with what it cost before', () => {
    show(
      makeOrder({
        items: [
          {
            id: 1,
            name: 'Kafta',
            options: null,
            unit_price: '10.00',
            quantity: 2,
            line_total: '20.00',
            offer: { title: 'Grill week', full_price: '12.50' },
            currency: 'USD',
          },
        ],
      }),
    )

    expect(screen.getByText('Grill week, was $25.00')).toBeInTheDocument()
  })

  it('shows each line in its currency, the total in the order one, and the rate', () => {
    show(
      makeOrder({
        currency: 'LBP',
        total: '2230000.00',
        exchange_rate: '89000.0000000000',
        items: [
          {
            id: 1,
            name: 'Burger',
            options: null,
            unit_price: '10.00',
            quantity: 2,
            line_total: '20.00',
            offer: { title: 'Grill week', full_price: '12.50' },
            currency: 'USD',
          },
          {
            id: 2,
            name: 'Tea',
            options: null,
            unit_price: '450000.00',
            quantity: 1,
            line_total: '450000.00',
            currency: 'LBP',
          },
        ],
      }),
    )

    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('Grill week, was $25.00')).toBeInTheDocument()
    expect(screen.getByText(/^LBP\s450,000$/)).toBeInTheDocument()
    expect(screen.getByText(/^LBP\s2,230,000$/)).toBeInTheDocument()
    expect(screen.getByText('Rate: 1 USD = 89,000 LBP')).toBeInTheDocument()
  })

  it('says no rate while every line is in the order currency', () => {
    show(makeOrder({ exchange_rate: '0.0000112360' }))

    expect(screen.queryByText(/^Rate:/)).not.toBeInTheDocument()
  })

  it('says when the restaurant changed it', () => {
    show(makeOrder({ owner_updated_at: '2026-09-24T11:45:00+00:00' }))

    expect(screen.getByText(/^Changed by you at/)).toBeInTheDocument()
  })

  it('serves a table order that was moved to ready before', async () => {
    const order = makeOrder({ status: 'ready', fulfilment: 'dine_in', table: 'Table 4' })
    const { onMove, user } = show(order)

    // At a table, ready still reads as preparing; served is the next step.
    expect(screen.getByText('Preparing')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Served' }))

    expect(onMove).toHaveBeenCalledWith(order, 'done')
  })
})
