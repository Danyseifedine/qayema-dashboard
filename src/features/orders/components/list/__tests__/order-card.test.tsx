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

    const note = screen.getByText(/^Changed by the guest at/)
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

    const note = screen.getByText(/^Changed by the guest 2 times, last at/)
    expect(note).toHaveClass('text-[var(--muted)]')
    expect(note).not.toHaveClass('bg-status-warn-wash')
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
