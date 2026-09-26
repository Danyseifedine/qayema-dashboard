import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { OrdersPage } from './orders-page'

let mock: MockAdapter

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    reference: 'ABC234',
    status: 'placed',
    currency: 'USD',
    total: '39.00',
    note: null,
    placed_at: '2026-09-24T11:30:00+00:00',
    items: [
      { id: 1, name: 'House Bowl', unit_price: '14.00', quantity: 2, line_total: '28.00' },
      { id: 2, name: 'Daily Tart', unit_price: '11.00', quantity: 1, line_total: '11.00' },
    ],
    ...overrides,
  }
}

function stub(data: object[] = [order()], open = 1) {
  mock.onGet('/api/orders').reply(200, { data, meta: { open } })
}

describe('OrdersPage', () => {
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

  it('shows an order with every line as it was ordered', async () => {
    stub()
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('ABC234')).toBeInTheDocument()
    expect(screen.getByText('House Bowl')).toBeInTheDocument()
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('Daily Tart')).toBeInTheDocument()
    expect(screen.getByText('$39.00')).toBeInTheDocument()
  })

  it('shows a guest note when there is one', async () => {
    stub([order({ note: 'No coriander please' })])
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('No coriander please')).toBeInTheDocument()
  })

  it('offers an empty state before any order arrives', async () => {
    stub([], 0)
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText(/lands here, and on your WhatsApp/)).toBeInTheDocument()
  })

  it('filters by status through the API', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await user.click(await screen.findByRole('tab', { name: /^Done$/ }))

    await waitFor(() => {
      const request = mock.history.get.filter((r) => r.url === '/api/orders').at(-1)
      expect(request?.params).toEqual({ status: 'done' })
    })
  })

  it('marks an order done', async () => {
    stub()
    mock.onPatch('/api/orders/1').reply(200, { data: order({ status: 'done' }) })

    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await user.click(await screen.findByRole('button', { name: 'Done' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/orders/1')
      expect(patch).toBeDefined()
      expect(JSON.parse(patch!.data as string)).toEqual({ status: 'done' })
    })
    expect(await screen.findByText(/marked Done/)).toBeInTheDocument()
  })

  it('asks before cancelling, and says the guest is not told', async () => {
    stub()
    mock.onPatch('/api/orders/1').reply(200, { data: order({ status: 'cancelled' }) })

    const user = userEvent.setup()
    renderWithProviders(<OrdersPage />)

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Cancel this order?')).toBeInTheDocument()
    expect(within(dialog).getByText(/The guest is not told/)).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/orders/1')
      expect(JSON.parse(patch!.data as string)).toEqual({ status: 'cancelled' })
    })
  })

  it('offers no actions on an order already dealt with', async () => {
    stub([order({ status: 'done' })], 0)
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('ABC234')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('says how many are still waiting when looking at everything', async () => {
    stub([order(), order({ id: 2, reference: 'DEF567' })], 2)
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByText('2 orders are still waiting.')).toBeInTheDocument()
  })

  it('surfaces a failed load with a retry', async () => {
    mock.onGet('/api/orders').reply(500, { message: 'Something went wrong.' })
    renderWithProviders(<OrdersPage />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })
})
