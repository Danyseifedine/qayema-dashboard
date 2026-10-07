import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { TableOrdersPage } from '@/features/orders/pages/table-orders-page'

let mock: MockAdapter

function order(id: number, table: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    reference: `REF${id}`,
    status: 'placed',
    currency: 'USD',
    total: '12.00',
    note: null,
    fulfilment: 'dine_in',
    table,
    placed_at: `2026-10-06T12:0${id}:00+00:00`,
    items: [{ id, name: 'Kebab', quantity: 2, line_total: '12.00' }],
    ...overrides,
  }
}

describe('TableOrdersPage', () => {
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

  it('asks for orders to a table only, grouped by table, waiting longest first', async () => {
    mock.onGet('/api/orders', { params: { kind: 'table' } }).reply(200, {
      data: [
        order(3, 'Table 2'),
        order(2, 'Table 10', { status: 'done' }),
        order(1, 'Table 2', { status: 'accepted' }),
      ],
      meta: { open: 1 },
    })
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} />)

    const groups = await screen.findAllByRole('region', { name: /^Table/ })
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Table 2', 'Table 10'])
    expect(within(groups[0]!).getByText('2 orders')).toBeInTheDocument()
    expect(within(groups[0]!).getByRole('button', { name: 'Start preparing' })).toBeInTheDocument()
    expect(within(groups[0]!).getByRole('button', { name: 'Served' })).toBeInTheDocument()
  })

  it('filters by the steps a table order goes through', async () => {
    mock.onGet('/api/orders').reply(200, { data: [order(1, 'Table 4')], meta: { open: 1 } })
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} />)

    const filter = await screen.findByRole('tablist', { name: 'Filter orders by status' })
    expect(
      within(filter)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual(['All', 'New', 'Preparing', 'Served', 'Cancelled'])

    mock.onGet('/api/orders', { params: { kind: 'table', status: 'accepted' } }).reply(200, {
      data: [],
      meta: { open: 0 },
    })
    await user.click(within(filter).getByRole('tab', { name: 'Preparing' }))
    await waitFor(() =>
      expect(mock.history.get.at(-1)?.params).toEqual({ kind: 'table', status: 'accepted' }),
    )
  })

  it('moves an order on like the Orders page does', async () => {
    mock.onGet('/api/orders').reply(200, { data: [order(1, 'Table 4')], meta: { open: 1 } })
    mock.onPatch('/api/orders/1').reply(200, { data: order(1, 'Table 4', { status: 'accepted' }) })
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Start preparing' }))

    await waitFor(() =>
      expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({
        status: 'accepted',
        guest_updates: 0,
      }),
    )
  })

  it('points to the Tables page before the first order', async () => {
    mock.onGet('/api/orders').reply(200, { data: [], meta: { open: 0 } })
    const onOpenTables = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={onOpenTables} />)

    expect(await screen.findByText('No table orders yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Set up your tables' }))
    expect(onOpenTables).toHaveBeenCalledOnce()
  })
})
