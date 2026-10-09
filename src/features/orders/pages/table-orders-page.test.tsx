import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { WHATSAPP_FIELDS_OFF, makeSessionUser } from '@/test/factories/session'
import { TableOrdersPage } from '@/features/orders/pages/table-orders-page'

let mock: MockAdapter

function order(id: number, table: string | null, overrides: Record<string, unknown> = {}) {
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
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    const groups = await screen.findAllByRole('region', { name: /^Table/ })
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Table 2', 'Table 10'])
    expect(within(groups[0]!).getByText('2 orders')).toBeInTheDocument()
    expect(within(groups[0]!).getByRole('button', { name: 'Start preparing' })).toBeInTheDocument()
    expect(within(groups[0]!).getByRole('button', { name: 'Served' })).toBeInTheDocument()
  })

  it('puts tables with nothing waiting in name order, and says nothing is waiting', async () => {
    mock.onGet('/api/orders', { params: { kind: 'table' } }).reply(200, {
      data: [
        order(1, 'Table 10', { status: 'done' }),
        order(2, 'Table 9', { status: 'cancelled' }),
        // A new order with no time on it waits behind every timed one, and
        // one whose table has no name left groups under a dash.
        order(3, null, { status: 'done', placed_at: null }),
      ],
      meta: { open: 0 },
    })
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    const groups = await screen.findAllByRole('region', {
      name: (name) => !name.startsWith('Notifications'),
    })
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual([
      '-',
      'Table 9',
      'Table 10',
    ])
    expect(screen.queryByText(/still waiting/)).not.toBeInTheDocument()
  })

  it('puts a waiting order with no time on it behind one that has a time', async () => {
    mock.onGet('/api/orders', { params: { kind: 'table' } }).reply(200, {
      data: [order(1, 'Bar', { placed_at: null }), order(2, 'Terrace')],
      meta: { open: 2 },
    })
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    const groups = await screen.findAllByRole('region', {
      name: (name) => !name.startsWith('Notifications'),
    })
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Terrace', 'Bar'])
    expect(screen.getByText('2 orders are still waiting.')).toBeInTheDocument()
  })

  it('filters by the steps a table order goes through', async () => {
    mock.onGet('/api/orders').reply(200, { data: [order(1, 'Table 4')], meta: { open: 1 } })
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

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
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Start preparing' }))

    await waitFor(() =>
      expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({
        status: 'accepted',
        guest_updates: 0,
      }),
    )
  })

  it('says a load failed, and tries again on request', async () => {
    mock.onGet('/api/orders').replyOnce(500, { message: 'Something went wrong.' })
    mock.onGet('/api/orders').reply(200, { data: [order(1, 'Table 4')], meta: { open: 1 } })
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Try again/ }))

    expect(await screen.findByRole('region', { name: 'Table 4' })).toBeInTheDocument()
  })

  it('says nothing has that status, without pointing to the Tables page', async () => {
    mock.onGet('/api/orders', { params: { kind: 'table', status: 'cancelled' } }).reply(200, {
      data: [],
      meta: { open: 1 },
    })
    mock.onGet('/api/orders').reply(200, { data: [order(1, 'Table 4')], meta: { open: 1 } })
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

    await screen.findByRole('region', { name: 'Table 4' })
    await user.click(screen.getByRole('tab', { name: 'Cancelled' }))

    expect(await screen.findByText('Nothing with that status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set up your tables' })).not.toBeInTheDocument()
  })

  it('points to the Tables page before the first order', async () => {
    mock.onGet('/api/orders').reply(200, { data: [], meta: { open: 0 } })
    const onOpenTables = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TableOrdersPage onOpenTables={onOpenTables} onOpenFeatures={() => {}} />)

    expect(await screen.findByText('No table orders yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Set up your tables' }))
    expect(onOpenTables).toHaveBeenCalledOnce()
  })

  describe('while table orders go to WhatsApp', () => {
    beforeEach(() => {
      mock.onGet('/api/user').reply(200, {
        data: makeSessionUser({
          ordering: {
            mode: 'menu',
            types: ['delivery', 'pickup'],
            dine_in: 'whatsapp',
            whatsapp_number: true,
            whatsapp_fields: WHATSAPP_FIELDS_OFF,
          },
        }),
      })
    })

    it('says they are handled in WhatsApp, with the way to change it', async () => {
      mock
        .onGet('/api/orders', { params: { kind: 'table' } })
        .reply(200, { data: [], meta: { open: 0 } })
      const onOpenFeatures = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(
        <TableOrdersPage onOpenTables={() => {}} onOpenFeatures={onOpenFeatures} />,
      )

      expect(await screen.findByText('Your table orders go to WhatsApp')).toBeInTheDocument()
      expect(screen.queryByText('No table orders yet')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Open Features' }))
      expect(onOpenFeatures).toHaveBeenCalledOnce()
    })

    it('still lists orders placed here before, so they can be finished', async () => {
      mock.onGet('/api/orders', { params: { kind: 'table' } }).reply(200, {
        data: [order(1, 'Table 2')],
        meta: { open: 1 },
      })
      renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

      expect(await screen.findByText(/New table orders open in WhatsApp/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Table 2' })).toBeInTheDocument()
    })

    it('keeps them here while there is no number to send to', async () => {
      mock.onGet('/api/user').reply(200, {
        data: makeSessionUser({
          ordering: {
            mode: 'menu',
            types: ['delivery', 'pickup'],
            dine_in: 'whatsapp',
            whatsapp_number: false,
            whatsapp_fields: WHATSAPP_FIELDS_OFF,
          },
        }),
      })
      mock
        .onGet('/api/orders', { params: { kind: 'table' } })
        .reply(200, { data: [], meta: { open: 0 } })
      renderWithProviders(<TableOrdersPage onOpenTables={() => {}} onOpenFeatures={() => {}} />)

      expect(await screen.findByText('No table orders yet')).toBeInTheDocument()
      expect(screen.queryByText('Your table orders go to WhatsApp')).not.toBeInTheDocument()
    })
  })
})
