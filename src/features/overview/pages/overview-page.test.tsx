import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { OverviewPage } from './overview-page'

let mock: MockAdapter

/** A stat tile by its label. The same words can also be a chart legend. */
function tile(label: string): HTMLElement {
  const term = screen.getAllByText(label).find((element) => element.tagName === 'DT')
  if (!term?.parentElement) throw new Error(`No tile labelled "${label}"`)
  return term.parentElement
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    range: '30d',
    timezone: 'Asia/Beirut',
    totals: { views: 120, unique_visitors: 80, qr_scans: 90, views_today: 7, orders: 12 },
    series: [
      { date: '2026-09-25', views: 50, qr_scans: 40 },
      { date: '2026-09-26', views: 70, qr_scans: 50 },
    ],
    last_visit_at: '2026-09-26T10:00:00Z',
    ...overrides,
  }
}

const NONE = {
  dish_add: 0,
  category_open: 0,
  search: 0,
  search_miss: 0,
  whatsapp: 0,
  map: 0,
  call: 0,
  social: 0,
  language: 0,
}

function advanced(overrides: Record<string, unknown> = {}) {
  const hours = Array.from({ length: 24 }, () => 0)
  hours[20] = 30
  hours[13] = 10
  return {
    range: '30d',
    previous: { views: 100, unique_visitors: 80, qr_scans: 100, orders: 0 },
    hours,
    weekdays: [1, 2, 3, 4, 20, 5, 6],
    devices: [
      { key: 'mobile', count: 90 },
      { key: 'desktop', count: 30 },
    ],
    browsers: [{ key: 'Safari', count: 120 }],
    systems: [{ key: 'unknown', count: 120 }],
    languages: [
      { key: 'ar', count: 80 },
      { key: 'en', count: 40 },
    ],
    actions: { ...NONE, dish_add: 40, whatsapp: 9, search: 3, search_miss: 2 },
    top_added: [{ name: 'Falafel', count: 25 }],
    top_categories: [{ name: 'Mains', count: 14 }],
    searches: [{ term: 'falafel', count: 3 }],
    missed_searches: [{ term: 'sushi', count: 2 }],
    orders: {
      count: 12,
      cancelled: 1,
      revenue: 240.5,
      average: 20.04,
      currency: 'USD',
      top_dishes: [{ name: 'Falafel', quantity: 30, revenue: 150 }],
    },
    funnel: { visitors: 80, carted: 20, ordered: 12 },
    ...overrides,
  }
}

function stubSummary(range = '30d', overrides: Record<string, unknown> = {}) {
  mock
    .onGet('/api/stats', { params: { range } })
    .reply(200, { data: summary({ range, ...overrides }) })
}

function stubAdvanced(range = '30d', overrides: Record<string, unknown> = {}) {
  mock
    .onGet('/api/stats/advanced', { params: { range } })
    .reply(200, { data: advanced({ range, ...overrides }) })
}

describe('OverviewPage', () => {
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

  describe('on a package with basic analytics', () => {
    it('shows the headline numbers for the last 30 days', async () => {
      stubSummary()
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(tile('Menu views')).toHaveTextContent('120')
      expect(tile('Menu views')).toHaveTextContent('7 today')
      expect(tile('QR scans')).toHaveTextContent('90')
      expect(tile('Orders')).toHaveTextContent('12')
    })

    it('splits visits into QR scans and links', async () => {
      stubSummary()
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      const arrive = await screen.findByRole('list', { name: 'How guests arrive' })
      expect(within(arrive).getByText('Scanned the QR code').closest('li')).toHaveTextContent('75%')
      expect(within(arrive).getByText('Opened a link').closest('li')).toHaveTextContent('30')
    })

    it('never asks for the advanced numbers', async () => {
      stubSummary()
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(mock.history.get.some((call) => call.url === '/api/stats/advanced')).toBe(false)
      expect(screen.queryByText(/vs before/)).not.toBeInTheDocument()
    })

    it('locks the longer ranges', async () => {
      stubSummary()
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(screen.getByRole('tab', { name: '90 days' })).toBeDisabled()
      expect(screen.getByRole('tab', { name: 'All time' })).toBeDisabled()
      expect(screen.getByRole('tab', { name: '7 days' })).toBeEnabled()
    })

    it('switches between 30 and 7 days', async () => {
      stubSummary()
      stubSummary('7d', {
        totals: { views: 9, unique_visitors: 5, qr_scans: 4, views_today: 1, orders: 2 },
      })
      const user = userEvent.setup()
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      await user.click(screen.getByRole('tab', { name: '7 days' }))

      await waitFor(() => expect(tile('Menu views')).toHaveTextContent('9'))
    })

    it('shows what advanced analytics would add, with a way to the packages', async () => {
      stubSummary()
      const onOpenPackage = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(
        <OverviewPage locale="en" advanced={false} onOpenPackage={onOpenPackage} />,
      )

      expect(await screen.findByText('Advanced analytics')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'See packages' }))
      expect(onOpenPackage).toHaveBeenCalledOnce()
    })

    it('leaves orders out when the package does not take them', async () => {
      stubSummary('30d', {
        totals: { views: 1, unique_visitors: 1, qr_scans: 0, views_today: 0, orders: null },
      })
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    })

    it('says so when there are no visits yet', async () => {
      stubSummary('30d', {
        totals: { views: 0, unique_visitors: 0, qr_scans: 0, views_today: 0, orders: 0 },
      })
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      expect(await screen.findByText(/No visits in this range yet\. Share/)).toBeInTheDocument()
    })

    it('shows an error with a retry when the numbers cannot load', async () => {
      mock.onGet('/api/stats').reply(500, { message: 'Server error', code: 'server_error' })
      renderWithProviders(<OverviewPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('with advanced analytics', () => {
    it('compares each number with the period before', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await waitFor(() => expect(tile('Menu views')).toHaveTextContent('↑ 20%'))
      expect(tile('QR scans')).toHaveTextContent('↓ 10%')
      expect(tile('Visitors')).toHaveTextContent('Same as before')
      // 12 orders from none has no percentage.
      expect(tile('Orders')).toHaveTextContent('Nothing to compare yet')
    })

    it('opens the longer ranges', async () => {
      stubSummary()
      stubAdvanced()
      stubSummary('90d')
      stubAdvanced('90d')
      const user = userEvent.setup()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      await user.click(screen.getByRole('tab', { name: '90 days' }))

      await waitFor(() =>
        expect(
          mock.history.get.some(
            (call) => call.url === '/api/stats/advanced' && call.params?.range === '90d',
          ),
        ).toBe(true),
      )
      expect(screen.queryByText('See packages')).not.toBeInTheDocument()
    })

    it('says when guests are busiest', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const busiest = await screen.findByText(/Busiest around/)
      expect(busiest).toHaveTextContent('Busiest around 20:00, and on Friday.')
    })

    it('counts what guests did, searches together', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('WhatsApp taps')
      expect(tile('WhatsApp taps')).toHaveTextContent('9')
      expect(tile('Searched')).toHaveTextContent('5')
      expect(tile('Added to cart')).toHaveTextContent('40')
    })

    it('lists what guests could not find', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const missed = await screen.findByRole('list', { name: 'Searched but not found' })
      expect(within(missed).getByText('sushi')).toBeInTheDocument()
    })

    it('shows order value and the funnel', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Order value')
      expect(tile('Order value')).toHaveTextContent('240.50')
      const funnel = screen.getByRole('list', { name: 'From visit to order' })
      expect(within(funnel).getByText('Placed an order').closest('li')).toHaveTextContent('15%')
    })

    it('names devices and languages for people', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const devices = await screen.findByRole('list', { name: 'Devices' })
      expect(within(devices).getByText('Phone').closest('li')).toHaveTextContent('75%')
      const languages = screen.getByRole('list', { name: 'Languages' })
      expect(within(languages).getByText('العربية')).toBeInTheDocument()
      expect(within(screen.getByRole('list', { name: 'Systems' })).getByText('Unknown'))
    })

    it('drops the cart and order parts when the package does not take orders', async () => {
      stubSummary()
      stubAdvanced('30d', { orders: null, funnel: null })
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('WhatsApp taps')
      expect(screen.queryByText('Added to cart')).not.toBeInTheDocument()
      expect(screen.queryByText('From visit to order')).not.toBeInTheDocument()
      expect(screen.queryByText('Order value')).not.toBeInTheDocument()
    })

    it('keeps the summary up when only the advanced part fails', async () => {
      stubSummary()
      mock
        .onGet('/api/stats/advanced')
        .reply(500, { message: 'Server error', code: 'server_error' })
      renderWithProviders(<OverviewPage locale="en" advanced onOpenPackage={vi.fn()} />)

      expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByText('Menu views')).toBeInTheDocument()
    })
  })
})
