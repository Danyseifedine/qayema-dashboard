import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { MenuOrders } from '@/features/analytics/components/stats/menu-orders'
import type { AdvancedStats } from '@/features/analytics/schemas/analytics.schema'

type Orders = NonNullable<AdvancedStats['menu_orders']>

function orders(overrides: Partial<Orders> = {}): Orders {
  const hours = Array.from({ length: 24 }, () => 0)
  hours[20] = 6
  return {
    currency: 'USD',
    sales: 240.5,
    average: 20.04,
    previous_sales: 200,
    statuses: { placed: 1, accepted: 1, ready: 0, done: 8, cancelled: 2 },
    fulfilment: [
      { key: 'delivery', count: 7 },
      { key: 'pickup', count: 3 },
    ],
    guests: 9,
    returning_guests: 3,
    minutes_to_accept: 4,
    hours,
    weekdays: [0, 0, 0, 0, 6, 0, 0],
    top_ordered: [{ name: 'Shawarma', quantity: 14, sales: 112 }],
    ...overrides,
  }
}

/** A stat tile by its label. */
function tile(label: string): HTMLElement {
  const term = screen.getAllByText(label).find((element) => element.tagName === 'DT')
  if (!term?.parentElement) throw new Error(`No tile labelled "${label}"`)
  return term.parentElement
}

describe('MenuOrders', () => {
  it('shows sales against the period before, the average and returning guests', () => {
    renderWithProviders(<MenuOrders orders={orders()} locale="en" />)

    expect(tile('Sales')).toHaveTextContent('$240.50')
    expect(tile('Sales')).toHaveTextContent('20%')
    expect(tile('Average order')).toHaveTextContent('$20.04')
    expect(tile('Returning guests')).toHaveTextContent('3')
    expect(tile('Returning guests')).toHaveTextContent('of 9 guests')
    expect(tile('Time to accept')).toHaveTextContent('4 min')
  })

  it('says a long wait in hours and minutes', () => {
    renderWithProviders(<MenuOrders orders={orders({ minutes_to_accept: 80 })} locale="en" />)

    expect(tile('Time to accept')).toHaveTextContent('1 h 20 min')
  })

  it('ranks the dishes ordered most, with what they came to', () => {
    renderWithProviders(<MenuOrders orders={orders()} locale="en" />)

    const top = screen.getByRole('list', { name: 'Most ordered dishes' })
    const row = within(top).getByText('Shawarma').closest('li')
    expect(row).toHaveTextContent('14')
    expect(row).toHaveTextContent('$112')
  })

  it('splits orders into done, still open and cancelled', () => {
    renderWithProviders(<MenuOrders orders={orders()} locale="en" />)

    const outcomes = screen.getByRole('list', { name: 'How orders ended' })
    expect(within(outcomes).getByText('Done').closest('li')).toHaveTextContent('67%')
    expect(within(outcomes).getByText('Still open').closest('li')).toHaveTextContent('2')
    expect(within(outcomes).getByText('Cancelled').closest('li')).toHaveTextContent('17%')

    const fulfilment = screen.getByRole('list', { name: 'How guests got their order' })
    expect(within(fulfilment).getByText('Delivery').closest('li')).toHaveTextContent('70%')
  })

  it('has nothing to average, compare or time with no orders yet', () => {
    renderWithProviders(
      <MenuOrders
        orders={orders({
          sales: 0,
          average: null,
          previous_sales: null,
          statuses: { placed: 0, accepted: 0, ready: 0, done: 0, cancelled: 0 },
          fulfilment: [],
          guests: 0,
          returning_guests: 0,
          minutes_to_accept: null,
          hours: Array.from({ length: 24 }, () => 0),
          weekdays: [0, 0, 0, 0, 0, 0, 0],
          top_ordered: [],
        })}
        locale="en"
      />,
    )

    expect(tile('Average order')).toHaveTextContent('None yet')
    expect(tile('Time to accept')).toHaveTextContent('None yet')
    expect(screen.getAllByText('No orders in this range.')).toHaveLength(2)
    expect(screen.getByText('Not enough orders yet.')).toBeInTheDocument()
  })
})
