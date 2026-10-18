import { screen, waitFor, within } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { TodayNumbers } from '@/features/overview/components/today/today-numbers'

let mock: MockAdapter

function today(overrides: Record<string, unknown> = {}, totals: Record<string, unknown> = {}) {
  mock.onGet('/api/analytics', { params: { range: 'today' } }).reply(200, {
    data: {
      totals: {
        views: 10,
        unique_visitors: 8,
        qr_scans: 4,
        views_today: 10,
        orders: 3,
        orders_done: 1,
        ...totals,
      },
      order_channel: 'menu',
      previous: { views: 20, qr_scans: 4, orders: 0 },
      series: [],
      ...overrides,
    },
  })
}

describe('TodayNumbers', () => {
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

  it('says each number against yesterday: down, the same, up from nothing', async () => {
    today()
    renderWithProviders(<TodayNumbers onOpen={vi.fn()} />)

    const region = await screen.findByRole('region', { name: 'Today' })
    expect(within(region).getByRole('button', { name: /Views/ })).toHaveTextContent(
      '10-50%vs. yesterday',
    )
    expect(within(region).getByRole('button', { name: /QR scans/ })).toHaveTextContent(
      '40%vs. yesterday',
    )
    expect(within(region).getByRole('button', { name: /Orders/ })).toHaveTextContent(
      '3+3vs. yesterday',
    )
  })

  it('names the orders WhatsApp while they go there', async () => {
    today({ order_channel: 'whatsapp' })
    renderWithProviders(<TodayNumbers onOpen={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Orders/ })).not.toBeInTheDocument()
  })

  it('shows two tiles without orders, and no comparison without yesterday', async () => {
    today({ previous: null }, { orders: null })
    renderWithProviders(<TodayNumbers onOpen={vi.fn()} />)

    const region = await screen.findByRole('region', { name: 'Today' })
    expect(within(region).getAllByRole('button')).toHaveLength(2)
    expect(within(region).queryByText('vs. yesterday')).not.toBeInTheDocument()
  })

  it('shows nothing when the numbers cannot load', async () => {
    mock.onGet('/api/analytics').reply(500, { message: 'Down' })
    const { container } = renderWithProviders(<TodayNumbers onOpen={vi.fn()} />)

    // The placeholder goes, and nothing takes its place.
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull())
    expect(screen.queryByRole('region', { name: 'Today' })).not.toBeInTheDocument()
  })
})
