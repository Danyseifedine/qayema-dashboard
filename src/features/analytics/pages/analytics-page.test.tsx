import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { AnalyticsPage } from '@/features/analytics/pages/analytics-page'

let mock: MockAdapter

/** A stat tile by its label. The same words can also be a chart legend. */
function tile(label: string): HTMLElement {
  const term = screen.getAllByText(label).find((element) => element.tagName === 'DT')
  if (!term?.parentElement) throw new Error(`No tile labelled "${label}"`)
  return term.parentElement
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    totals: { views: 120, unique_visitors: 80, qr_scans: 90, views_today: 7, orders: 12 },
    series: [
      { date: '2026-09-25', views: 50, qr_scans: 40 },
      { date: '2026-09-26', views: 70, qr_scans: 50 },
    ],
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
    previous: { views: 100, unique_visitors: 80, qr_scans: 100, orders: 0 },
    hours,
    weekdays: [1, 2, 3, 4, 20, 5, 6],
    languages: [
      { key: 'ar', count: 80 },
      { key: 'en', count: 40 },
    ],
    actions: { ...NONE, dish_add: 40, whatsapp: 9, search: 3, search_miss: 2 },
    top_added: [{ name: 'Falafel', count: 25 }],
    top_categories: [{ name: 'Mains', count: 14 }],
    searches: [{ term: 'falafel', count: 3 }],
    missed_searches: [{ term: 'sushi', count: 2 }],
    funnel: { visitors: 80, carted: 20, ordered: 12, channel: 'menu' },
    ...overrides,
  }
}

function stubSummary(range = '30d', overrides: Record<string, unknown> = {}) {
  mock
    .onGet('/api/analytics', { params: { range } })
    .reply(200, { data: summary({ range, ...overrides }) })
}

function stubAdvanced(range = '30d', overrides: Record<string, unknown> = {}) {
  mock
    .onGet('/api/analytics/advanced', { params: { range } })
    .reply(200, { data: advanced({ range, ...overrides }) })
}

describe('AnalyticsPage', () => {
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
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(tile('Menu views')).toHaveTextContent('120')
      expect(tile('Menu views')).toHaveTextContent('7 today')
      expect(tile('QR scans')).toHaveTextContent('90')
      expect(tile('Orders')).toHaveTextContent('12')
    })

    it('counts orders placed in the menu, with how many were done', async () => {
      stubSummary('30d', {
        totals: {
          views: 120,
          unique_visitors: 80,
          qr_scans: 90,
          views_today: 7,
          orders: 12,
          orders_done: 9,
        },
        order_channel: 'menu',
      })
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(tile('Orders')).toHaveTextContent('12')
      expect(tile('Orders')).toHaveTextContent('9 done')
    })

    it('calls WhatsApp orders only what they are: sent there', async () => {
      stubSummary('30d', { order_channel: 'whatsapp' })
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(tile('Sent to WhatsApp')).toHaveTextContent('12')
      expect(tile('Sent to WhatsApp')).toHaveTextContent("We can't see if they were completed")
      expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    })

    it('splits visits into QR scans and links', async () => {
      stubSummary()
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      const arrive = await screen.findByRole('list', { name: 'How guests arrive' })
      expect(within(arrive).getByText('Scanned the QR code').closest('li')).toHaveTextContent('75%')
      expect(within(arrive).getByText('Opened a link').closest('li')).toHaveTextContent('30')
    })

    it('never asks for the advanced numbers', async () => {
      stubSummary()
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(mock.history.get.some((call) => call.url === '/api/analytics/advanced')).toBe(false)
      expect(screen.queryByText(/vs before/)).not.toBeInTheDocument()
    })

    it('locks the longer ranges', async () => {
      stubSummary()
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

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
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      await user.click(screen.getByRole('tab', { name: '7 days' }))

      await waitFor(() => expect(tile('Menu views')).toHaveTextContent('9'))
    })

    it('shows what advanced analytics would add, with a way to the packages', async () => {
      stubSummary()
      const onOpenPackage = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(
        <AnalyticsPage locale="en" advanced={false} onOpenPackage={onOpenPackage} />,
      )

      expect(await screen.findByText('Advanced analytics')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'See packages' }))
      expect(onOpenPackage).toHaveBeenCalledOnce()
    })

    it('leaves orders out when the package does not take them', async () => {
      stubSummary('30d', {
        totals: { views: 1, unique_visitors: 1, qr_scans: 0, views_today: 0, orders: null },
      })
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    })

    it('says so when there are no visits yet', async () => {
      stubSummary('30d', {
        totals: { views: 0, unique_visitors: 0, qr_scans: 0, views_today: 0, orders: 0 },
      })
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      expect(await screen.findByText(/No visits in this range yet\. Share/)).toBeInTheDocument()
    })

    it('shows an error with a retry when the numbers cannot load', async () => {
      mock.onGet('/api/analytics').replyOnce(500, { message: 'Server error', code: 'server_error' })
      stubSummary()
      const user = userEvent.setup()
      renderWithProviders(<AnalyticsPage locale="en" advanced={false} onOpenPackage={vi.fn()} />)

      await user.click(await screen.findByRole('button', { name: /try again/i }))
      await waitFor(() => expect(tile('Menu views')).toHaveTextContent('120'))
    })
  })

  describe('with advanced analytics', () => {
    it('compares each number with the period before', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

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
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Menu views')
      await user.click(screen.getByRole('tab', { name: '90 days' }))

      await waitFor(() =>
        expect(
          mock.history.get.some(
            (call) => call.url === '/api/analytics/advanced' && call.params?.range === '90d',
          ),
        ).toBe(true),
      )
      expect(screen.queryByText('See packages')).not.toBeInTheDocument()
    })

    it('says when guests are busiest', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const busiest = await screen.findByText(/Busiest around/)
      expect(busiest).toHaveTextContent('Busiest around 20:00, and on Friday.')
    })

    it('counts what guests did, searches together', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Tapped WhatsApp')
      expect(tile('Tapped WhatsApp')).toHaveTextContent('9')
      expect(tile('Searched')).toHaveTextContent('5')
      // A tap is all the menu sees, so nothing claims the call or the follow.
      expect(screen.queryByText('Called you')).not.toBeInTheDocument()
      expect(screen.queryByText('Followed a social link')).not.toBeInTheDocument()
      expect(tile('Added to cart')).toHaveTextContent('40')
    })

    it('lists what guests could not find', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const missed = await screen.findByRole('list', { name: 'Searched but not found' })
      expect(within(missed).getByText('sushi')).toBeInTheDocument()
    })

    it('shows the way from visit to order', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const funnel = await screen.findByRole('list', { name: 'From visit to order' })
      expect(within(funnel).getByText('Placed an order').closest('li')).toHaveTextContent('15%')
    })

    it('leaves out devices and order money', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Tapped WhatsApp')
      for (const gone of ['Devices', 'Browsers', 'Systems', 'Order value', 'Average order']) {
        expect(screen.queryByText(gone)).not.toBeInTheDocument()
      }
    })

    it('names languages for people', async () => {
      stubSummary()
      stubAdvanced()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      const languages = await screen.findByRole('list', { name: 'Languages' })
      expect(within(languages).getByText('العربية').closest('li')).toHaveTextContent('67%')
      expect(within(languages).getByText('English')).toBeInTheDocument()
    })

    it('drops the cart and order parts when the package does not take orders', async () => {
      stubSummary()
      stubAdvanced('30d', { funnel: null })
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Tapped WhatsApp')
      expect(screen.queryByText('Added to cart')).not.toBeInTheDocument()
      expect(screen.queryByText('From visit to order')).not.toBeInTheDocument()
      expect(screen.queryByText('Most added to the cart')).not.toBeInTheDocument()
    })

    it('keeps the summary up when only the advanced part fails', async () => {
      stubSummary()
      mock
        .onGet('/api/analytics/advanced')
        .reply(500, { message: 'Server error', code: 'server_error' })
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByText('Menu views')).toBeInTheDocument()
    })

    it('retries only the advanced part', async () => {
      stubSummary()
      mock
        .onGet('/api/analytics/advanced')
        .replyOnce(500, { message: 'Server error', code: 'server_error' })
      stubAdvanced()
      const user = userEvent.setup()
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await user.click(await screen.findByRole('button', { name: /try again/i }))
      expect(await screen.findByText('Tapped WhatsApp')).toBeInTheDocument()
    })

    it('has nothing to compare with on all time', async () => {
      stubSummary()
      stubAdvanced('30d', { previous: null })
      renderWithProviders(<AnalyticsPage locale="en" advanced onOpenPackage={vi.fn()} />)

      await screen.findByText('Tapped WhatsApp')
      expect(tile('Menu views')).toHaveTextContent('Nothing to compare yet')
      expect(tile('QR scans')).toHaveTextContent('Nothing to compare yet')
    })
  })
})
