import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeDish } from '@/test/factories/menu'
import { makeSessionUser } from '@/test/factories/session'
import { useUiStore } from '@/stores/ui.store'
import { renderWithProviders } from '@/test/render-with-providers'
import { OverviewPage } from '@/features/overview/pages/overview-page'

let mock: MockAdapter

const LIMITS = {
  dishes: { used: 12, limit: 40 },
  categories: { used: 4, limit: 10 },
  social_links: { used: 2, limit: 2 },
}

const CLOSED = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }

function stub(settings: Record<string, unknown> = {}, dishes = [makeDish()]) {
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
      opening_hours: { ...CLOSED, fri: { open: '12:00', close: '23:00' } },
      timezone: 'Asia/Beirut',
      logo_url: 'https://cdn.test/logo.webp',
      cover_url: null,
      ...settings,
    },
  })
  mock
    .onGet('/api/dishes')
    .reply(200, { data: dishes, meta: { used: dishes.length, limit: 40, currency: 'USD' } })
}

/** A count tile by its label. */
function tile(label: string): HTMLElement {
  return screen.getByText(label, { selector: 'dt' }).parentElement!
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
    expect(tile('Social links')).toHaveTextContent('2 / 2')
    // Stays "12 / 40" on an Arabic page instead of flipping to "40 / 12".
    expect(screen.getByText('12 / 40')).toHaveAttribute('dir', 'ltr')
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
    // To do: cover, location, the one dish's photo.
    expect(await screen.findByText('7 of 10 done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Menu set-up' })).toHaveAttribute(
      'aria-valuenow',
      '7',
    )
  })

  it('sends each missing item to the page that fixes it', async () => {
    stub({}, [makeDish({ image_url: null }), makeDish({ image_url: null })])
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    await user.click(await screen.findByRole('button', { name: 'Add: A cover photo' }))
    expect(onOpen).toHaveBeenLastCalledWith('restaurant')

    // The dishes are the next step: opened with a tap.
    await user.click(screen.getByRole('button', { name: /Your dishes/ }))
    await user.click(screen.getByRole('button', { name: 'Fix: 2 dishes have no photo' }))
    expect(onOpen).toHaveBeenLastCalledWith('dishes')
  })

  it('opens on the first step not done, what is left before what is done', async () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

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

    await user.click(await screen.findByRole('button', { name: /Share your menu/ }))
    await user.click(screen.getByRole('button', { name: 'Get your QR code' }))
    expect(onOpen).toHaveBeenLastCalledWith('qr')
  })

  it('puts the menu link first, to copy, open or turn into a QR code', async () => {
    stub()
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    const onOpen = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={onOpen} />)

    const card = await screen.findByRole('region', { name: 'Your menu link' })
    expect(within(card).getByRole('link', { name: 'qayema.test/beit-qayema' })).toHaveAttribute(
      'href',
      'https://qayema.test/beit-qayema',
    )

    await user.click(within(card).getByRole('button', { name: 'Copy link' }))
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

    expect(screen.getByText('Put the QR code on your tables')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide the guide' }))

    expect(screen.queryByText('Put the QR code on your tables')).not.toBeInTheDocument()
    expect(useUiStore.getState().guideHidden).toBe(true)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    expect(screen.getByText('Put the QR code on your tables')).toBeInTheDocument()
  })

  it('offers no button for what is already done', async () => {
    stub()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    const logo = (await screen.findByText('Your logo')).closest('li')!
    expect(within(logo).queryByRole('button')).not.toBeInTheDocument()
    expect(logo).toHaveTextContent('(done)')
  })

  it('says so when everything is done', async () => {
    stub(
      {
        cover_url: 'https://cdn.test/cover.webp',
        google_maps_url: 'https://maps.google.com/?q=1,2',
      },
      [makeDish({ image_url: 'https://cdn.test/a.webp' })],
    )
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(await screen.findByText('10 of 10 done')).toBeInTheDocument()
    expect(
      screen.getByText('Your menu is ready: everything guests look for is on it.'),
    ).toBeInTheDocument()
  })

  it('shows an error with a retry when the checklist cannot load', async () => {
    mock.onGet('/api/restaurant').reply(500, { message: 'Server error', code: 'server_error' })
    mock
      .onGet('/api/dishes')
      .reply(200, { data: [], meta: { used: 0, limit: 40, currency: 'USD' } })
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument()
    // The counts come from the session, so they stay up.
    expect(tile('Dishes')).toHaveTextContent('12')
  })

  it('retries only the restaurant when that is what failed', async () => {
    mock.onGet('/api/restaurant').replyOnce(500, { message: 'Server error', code: 'server_error' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /try again/i }))

    expect(await screen.findByText(/of 10 done/)).toBeInTheDocument()
    const calls = (url: string) => mock.history.get.filter((call) => call.url === url).length
    expect(calls('/api/restaurant')).toBe(2)
    expect(calls('/api/dishes')).toBe(1)
  })

  it('retries only the dishes when those failed, with their message', async () => {
    mock.onGet('/api/dishes').replyOnce(500, { message: 'Dishes are down', code: 'server_error' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<OverviewPage limits={LIMITS} switchedOff={[]} onOpen={vi.fn()} />)

    expect(await screen.findByText('Dishes are down')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText(/of 10 done/)).toBeInTheDocument()
    const calls = (url: string) => mock.history.get.filter((call) => call.url === url).length
    expect(calls('/api/restaurant')).toBe(1)
    expect(calls('/api/dishes')).toBe(2)
  })
})
