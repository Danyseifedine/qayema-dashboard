import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeSessionUser, makeWritingHelp } from '@/test/factories/session'
import type { WritingHelpUses } from '@/shared/hooks/use-writing-help'
import { useUiStore } from '@/stores/ui.store'
import { renderWithProviders } from '@/test/render-with-providers'
import { OverviewPage } from '@/features/overview/pages/overview-page'

let mock: MockAdapter

const LIMITS = {
  dishes: { used: 12, limit: 40 },
  categories: { used: 4, limit: 10 },
  social_links: { used: 2, limit: 2 },
  builds: { used: 0, limit: 3 },
}

const CLOSED = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

/** The restaurant's settings, and the session with the dishes still without a photo and its AI. */
function stub(
  settings: Record<string, unknown> = {},
  withoutPhoto = 1,
  writingHelp: WritingHelpUses | null = null,
) {
  mock.onGet('/api/restaurant').reply(200, {
    data: {
      languages: ['en', 'ar'],
      name: { en: 'Olive', ar: null },
      description: { en: 'Grill house', ar: null },
      slug: 'olive',
      google_maps_url: null,
      phone: '+96170000000',
      country_code: 'LB',
      currency: 'USD',
      opening_hours: { ...CLOSED, fri: [{ open: '12:00', close: '23:00' }] },
      timezone: 'Asia/Beirut',
      logo_url: 'https://cdn.test/logo.webp',
      cover_url: null,
      ...settings,
    },
  })
  mock.onGet('/api/user').reply(200, {
    data: makeSessionUser({ dishes_without_photo: withoutPhoto, writing_help: writingHelp }),
  })
}

/** Every step of the set-up, behind "See every step". */
async function showSteps(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'See every step' }))
}

/** A count tile under Quick, by its label. */
function tile(label: string): HTMLElement {
  const quick = screen.getByRole('region', { name: 'Quick' })
  return within(quick).getByRole('button', { name: new RegExp(`^${label}`) })
}

describe('OverviewPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
  })

  afterEach(() => {
    useUiStore.getState().setGuideHidden(false)
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('counts what is on the menu against the package', () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(tile('Dishes')).toHaveTextContent('12 / 40')
    expect(tile('Categories')).toHaveTextContent('4 / 10')
    // The links show their count alone.
    expect(tile('Links')).toHaveTextContent(/^Links2$/)
    // Stays "12 / 40" on an Arabic page instead of flipping to "40 / 12".
    expect(screen.getByText('12 / 40')).toHaveAttribute('dir', 'ltr')
  })

  it('opens the page each count is about', async () => {
    stub()
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    await user.click(tile('Dishes'))
    expect(onOpen).toHaveBeenLastCalledWith('dishes')
    await user.click(tile('Categories'))
    expect(onOpen).toHaveBeenLastCalledWith('categories')
    await user.click(tile('Links'))
    expect(onOpen).toHaveBeenLastCalledWith('social-links')
  })

  it('shows the AI credits left this month, a tap from the Package page', async () => {
    stub({}, 1, makeWritingHelp({}, { limit: 7500, left: 6840 }))
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    await waitFor(() => expect(tile('AI credits')).toHaveTextContent('6,840'))
    expect(tile('AI credits')).toHaveTextContent('left of 7,500 this month')
    await user.click(tile('AI credits'))
    expect(onOpen).toHaveBeenLastCalledWith('package')
  })

  it('says when the credits come back once none are left', async () => {
    stub({}, 1, makeWritingHelp({}, { limit: 500, left: 0, resets_on: '2099-11-01' }))
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await waitFor(() => expect(tile('AI credits')).toHaveTextContent('Back on Nov 1'))
  })

  it('takes too few for a translation as none left', async () => {
    stub(
      {},
      1,
      makeWritingHelp({}, { limit: 500, left: 3, prices: { translation: 5, description: 9 } }),
    )
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await waitFor(() => expect(tile('AI credits')).toHaveTextContent('Back on Nov 1'))
  })

  it('takes the credits as back once their day came, in a tab left open', async () => {
    stub({}, 1, makeWritingHelp({}, { limit: 500, left: 0, resets_on: '2020-11-01' }))
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await waitFor(() => expect(tile('AI credits')).toHaveTextContent('500'))
    expect(tile('AI credits')).not.toHaveTextContent('Back on')
  })

  it('has no credits tile without the AI, or with no cap on it', async () => {
    stub({}, 1, makeWritingHelp({}, { limit: null, left: null }))
    const { unmount } = renderWithProviders(
      <OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />,
    )
    await screen.findByRole('button', { name: 'See every step' })
    expect(
      within(screen.getByRole('region', { name: 'Quick' })).getAllByRole('button'),
    ).toHaveLength(3)
    unmount()

    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)
    await screen.findByRole('button', { name: 'See every step' })
    expect(screen.queryByText('AI credits')).not.toBeInTheDocument()
  })

  it('never shows an unlimited allowance as a number', () => {
    stub()
    renderWithProviders(
      <OverviewPage
        limits={{ ...LIMITS, dishes: { used: 300, limit: null } }}
        switchedOff={[]}
        onOpen={vi.fn()}
      />,
    )

    expect(tile('Dishes')).toHaveTextContent('No limit on your package')
    expect(tile('Dishes')).not.toHaveTextContent('/')
  })

  it('shows how much of the menu is finished', async () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    // Done: logo, description, hours, phone, categories, dishes, social.
    // To do: cover, location, the dish without a photo.
    expect(await screen.findByText('7 of 10 done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Menu set-up' })).toHaveAttribute(
      'aria-valuenow',
      '7',
    )
  })

  it('sends each missing item to the page that fixes it', async () => {
    stub({}, 2)
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    await user.click(await screen.findByRole('button', { name: 'Add a cover photo' }))
    expect(onOpen).toHaveBeenLastCalledWith('restaurant')

    // The dishes are the next step: opened with a tap.
    await showSteps(user)
    await user.click(screen.getByRole('button', { name: /Your dishes/ }))
    await user.click(screen.getByRole('button', { name: 'Fix: 2 dishes have no photo' }))
    expect(onOpen).toHaveBeenLastCalledWith('dishes')
    // The session counts them: the menu itself is never downloaded for it.
    expect(mock.history.get.some((request) => request.url === '/api/dishes')).toBe(false)
  })

  it('opens on the first step not done, what is left before what is done', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)
    await showSteps(user)

    const step = await screen.findByRole('list', { name: 'Your restaurant' })
    const rows = within(step).getAllByRole('listitem')
    expect(rows.slice(0, 2).map((row) => row.textContent)).toEqual([
      expect.stringContaining('A cover photo'),
      expect.stringContaining('Your location'),
    ])
    expect(screen.getByRole('button', { name: /Your restaurant/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('button', { name: /Your dishes/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: /Your restaurant/ })).toHaveTextContent(
      '2 things left',
    )
    // Sharing has its social link: done.
    expect(screen.getByRole('button', { name: /Share your menu/ })).toHaveTextContent('Done')
  })

  it('opens another step on a tap, and folds an open one away on a second tap', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)
    await showSteps(user)

    const restaurant = await screen.findByRole('button', { name: /Your restaurant/ })
    const dishes = screen.getByRole('button', { name: /Your dishes/ })

    await user.click(dishes)
    expect(dishes).toHaveAttribute('aria-expanded', 'true')
    expect(restaurant).toHaveAttribute('aria-expanded', 'false')

    await user.click(dishes)
    expect(dishes).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Your dishes' })).not.toBeInTheDocument()
  })

  it('sends the sharing step to the QR code', async () => {
    stub()
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)
    await showSteps(user)

    await user.click(await screen.findByRole('button', { name: /Share your menu/ }))
    await user.click(screen.getByRole('button', { name: 'Get your QR code' }))
    expect(onOpen).toHaveBeenLastCalledWith('qr')
  })

  it('puts the menu link first, to share, preview or turn into a QR code', async () => {
    stub()
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    const card = await screen.findByRole('region', { name: 'Your menu link' })
    expect(within(card).getByRole('link', { name: 'qayema.test/beit-qayema' })).toHaveAttribute(
      'href',
      'https://qayema.test/beit-qayema',
    )

    // No share menu in the test browser: the link is copied instead.
    await user.click(within(card).getByRole('button', { name: 'Share my menu' }))
    // user-event stands in a clipboard of its own.
    expect(await navigator.clipboard.readText()).toBe('https://qayema.test/beit-qayema')
    expect(await screen.findByText('Link copied')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'QR code' }))
    expect(onOpen).toHaveBeenLastCalledWith('qr')
  })

  it('shows how it works until put away, and offers it back', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)
    await showSteps(user)

    expect(screen.getByText('Put the QR code on your tables')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide the guide' }))

    // It slides away, then leaves the page.
    await waitFor(() =>
      expect(screen.queryByText('Put the QR code on your tables')).not.toBeInTheDocument(),
    )
    expect(useUiStore.getState().guideHidden).toBe(true)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    expect(screen.getByText('Put the QR code on your tables')).toBeInTheDocument()
  })

  it('offers no button for what is already done', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)
    await showSteps(user)

    const logo = (await screen.findByText('Your logo')).closest('li')!
    expect(within(logo).queryByRole('button')).not.toBeInTheDocument()
    expect(logo).toHaveTextContent('(done)')
  })

  it('leaves the set-up out once everything is done', async () => {
    stub(
      {
        cover_url: 'https://cdn.test/cover.webp',
        google_maps_url: 'https://maps.google.com/?q=1,2',
      },
      0,
    )
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await waitFor(() => expect(document.querySelector('.animate-pulse')).toBeNull())
    expect(screen.queryByRole('region', { name: 'Set up your menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'See every step' })).not.toBeInTheDocument()
  })

  it('shows only the next thing to set up, why it matters, and the way to add it', async () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    const card = await screen.findByRole('region', { name: 'Set up your menu' })
    expect(within(card).getByText('Next: A cover photo')).toBeInTheDocument()
    expect(
      within(card).getByText('The first thing guests see when the menu opens.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Your restaurant' })).not.toBeInTheDocument()
  })

  it('says how many orders are waiting, and opens them', async () => {
    stub()
    const onOpen = vi.fn()
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <OverviewPage
        limits={LIMITS}
        switchedOff={[]}
        onOpen={onOpen}
        ordersWaiting={{ orders: 2, tables: 1 }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '3 new orders waiting' }))
    expect(onOpen).toHaveBeenLastCalledWith('orders')

    rerender(
      <OverviewPage
        limits={LIMITS}
        switchedOff={[]}
        onOpen={onOpen}
        ordersWaiting={{ orders: 0, tables: 1 }}
      />,
    )
    await user.click(screen.getByRole('button', { name: '1 new order waiting' }))
    expect(onOpen).toHaveBeenLastCalledWith('table-orders')
  })

  it("shows today's numbers when asked, each a way to the analytics", async () => {
    stub()
    mock.onGet('/api/analytics', { params: { range: 'today' } }).reply(200, {
      data: {
        totals: {
          views: 42,
          unique_visitors: 30,
          qr_scans: 18,
          views_today: 42,
          orders: 7,
          orders_done: 2,
        },
        order_channel: 'menu',
        previous: { views: 21, unique_visitors: 15, qr_scans: 0, orders: 7 },
        series: [{ date: '2026-10-13T09:00', views: 42, qr_scans: 18 }],
      },
    })
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} showToday />)

    const today = await screen.findByRole('region', { name: 'Today' })
    // Against yesterday up to now: double, up from nothing (the count itself), the same.
    expect(within(today).getByRole('button', { name: /Views/ })).toHaveTextContent(
      '42+100%vs. yesterday',
    )
    expect(within(today).getByRole('button', { name: /QR scans/ })).toHaveTextContent(
      '18+18vs. yesterday',
    )
    expect(within(today).getByRole('button', { name: /Orders/ })).toHaveTextContent(
      '70%vs. yesterday',
    )
    await user.click(within(today).getByRole('button', { name: /Orders/ }))
    expect(onOpen).toHaveBeenLastCalledWith('analytics')
  })

  it("asks for no numbers when today's are not shown", async () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await screen.findByRole('region', { name: 'Set up your menu' })
    expect(mock.history.get.some((request) => request.url === '/api/analytics')).toBe(false)
  })

  it('shows an error with a retry when the checklist cannot load', async () => {
    mock.onGet('/api/restaurant').reply(500, { message: 'Server error', code: 'server_error' })
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
    // The counts come from the session, so they stay up.
    expect(tile('Dishes')).toHaveTextContent('12')
  })

  it('asks for the restaurant again on a retry, with its message', async () => {
    mock
      .onGet('/api/restaurant')
      .replyOnce(500, { message: 'Restaurant is down', code: 'server_error' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(await screen.findByText('Restaurant is down')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText(/of 10 done/)).toBeInTheDocument()
    expect(mock.history.get.filter((call) => call.url === '/api/restaurant')).toHaveLength(2)
  })
})
