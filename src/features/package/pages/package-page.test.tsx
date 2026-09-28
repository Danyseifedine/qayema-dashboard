import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import type { AuthUser } from '@/features/auth'
import { makePackage, PACKAGE_CATALOGUE } from '@/test/mocks/factories/packages'
import { EMPTY_PLAN, makeSessionUser } from '@/test/mocks/factories/session'
import { PackagePage } from '@/features/package/pages/package-page'

let mock: MockAdapter

type Restaurant = NonNullable<AuthUser['restaurant']>

function session(restaurant: Partial<Restaurant> = {}) {
  mock.onGet('/api/user').reply(200, {
    data: makeSessionUser({
      limits: {
        dishes: { used: 12, limit: 40 },
        categories: { used: 3, limit: 8 },
        social_links: { used: 1, limit: 1 },
      },
      plan: EMPTY_PLAN,
      ...restaurant,
    }),
  })
}

function onPackage(slug: string, name: string, dates: Partial<Restaurant['package']> = {}) {
  return {
    package: {
      slug,
      name: { en: name, ar: null },
      is_contact_only: false,
      starts_at: null,
      ends_at: null,
      days_left: null,
      ...dates,
    },
  }
}

function stub(current = 'free', restaurant: Partial<Restaurant> = {}) {
  session(restaurant)
  mock
    .onGet('/api/packages')
    .reply(200, { data: PACKAGE_CATALOGUE, meta: { current, ends_at: null } })
}

describe('PackagePage', () => {
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

  it('shows the package in force with how much of it is used', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByRole('heading', { name: 'Package' })).toBeInTheDocument()
    expect(await screen.findByText('12 / 40')).toBeInTheDocument()
    expect(screen.getByText('3 / 8')).toBeInTheDocument()
    expect(screen.getByText('Yours for as long as you like.')).toBeInTheDocument()
  })

  it('lists every package and offers only the ones worth asking about', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    // Free is what they already have, so it is marked rather than offered.
    expect(await screen.findByRole('button', { name: 'Your package' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Request this package' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Talk to us' })).toBeInTheDocument()
  })

  it('writes an unlimited limit as a word, not a number', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Unlimited dishes')).toBeInTheDocument()
    expect(screen.getByText("Let's talk")).toBeInTheDocument()
  })

  it('marks the package the owner is actually on', async () => {
    stub('pro', onPackage('pro', 'Pro'))
    renderWithProviders(<PackagePage locale="en" />)

    const mine = await screen.findByRole('button', { name: 'Your package' })
    expect(mine).toBeDisabled()
    // Free is no longer theirs, but it is still not requestable.
    expect(screen.getByRole('button', { name: 'Included for everyone' })).toBeDisabled()
  })

  it('sends the slug and the note when a package is requested', async () => {
    stub()
    mock.onPost('/api/packages/request').reply(201, { data: { id: 7, package: 'pro' } })

    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    const [requestPro] = await screen.findAllByRole('button', { name: 'Request this package' })
    await user.click(requestPro!)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Ask about Pro')).toBeInTheDocument()

    await user.type(
      within(dialog).getByLabelText(/Anything we should know/),
      'Opening a second branch.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/packages/request')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string)).toEqual({
        package: 'pro',
        message: 'Opening a second branch.',
      })
    })

    expect(await screen.findByText('Request sent')).toBeInTheDocument()
  })

  it('sends no note when the owner leaves it empty', async () => {
    stub()
    mock.onPost('/api/packages/request').reply(201, { data: { id: 8, package: 'premium' } })

    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    const buttons = await screen.findAllByRole('button', { name: 'Request this package' })
    await user.click(buttons[1]!)
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      const post = mock.history.post.find((r) => r.url === '/api/packages/request')
      expect(post).toBeDefined()
      expect(JSON.parse(post!.data as string)).toEqual({ package: 'premium' })
    })
  })

  it('explains a rate limit instead of failing silently', async () => {
    stub()
    mock.onPost('/api/packages/request').reply(429, {
      message: 'You have already sent a few requests today. Try again in 12 hours.',
      code: 'too_many_requests',
      retry_after: 43200,
    })

    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    const [requestPro] = await screen.findAllByRole('button', { name: 'Request this package' })
    await user.click(requestPro!)
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText(/Try again in 12 hours/)).toBeInTheDocument()
    // The dialog stays open so the note is not lost.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('says until when the package runs and how many days are left', async () => {
    stub('pro', onPackage('pro', 'Pro', { ends_at: '2026-10-12T10:00:00+00:00', days_left: 18 }))
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Oct 12, 2026')).toBeInTheDocument()
    expect(screen.getByText('18 days left')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask to extend' })).not.toBeInTheDocument()
  })

  it('warns in the last week and asks for the same package again', async () => {
    stub('pro', onPackage('pro', 'Pro', { ends_at: '2026-10-01T10:00:00+00:00', days_left: 3 }))
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('3 days left')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Ask to extend' }))

    expect(within(screen.getByRole('dialog')).getByText('Ask about Pro')).toBeInTheDocument()
  })

  it('explains a package that ended and offers to renew it', async () => {
    stub('free', {
      lapsed: { slug: 'pro', name: { en: 'Pro', ar: null }, ended_at: '2026-09-01T10:00:00+00:00' },
    })
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Your Pro package ended on Sep 1, 2026')).toBeInTheDocument()
    expect(screen.getByText(/You are on Free now. Everything you made is kept/)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Ask to renew' }))

    expect(within(screen.getByRole('dialog')).getByText('Ask about Pro')).toBeInTheDocument()
  })

  it('keeps an ask pressed before the packages arrive and opens it once they do', async () => {
    session({
      lapsed: { slug: 'pro', name: { en: 'Pro', ar: null }, ended_at: '2026-09-01T10:00:00+00:00' },
    })
    let release: () => void = () => {}
    mock.onGet('/api/packages').reply(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve([200, { data: PACKAGE_CATALOGUE, meta: { current: 'free', ends_at: null } }])
        }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    await user.click(await screen.findByRole('button', { name: 'Ask to renew' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    release()

    expect(within(await screen.findByRole('dialog')).getByText('Ask about Pro')).toBeInTheDocument()
  })

  it('announces a package that starts later', async () => {
    stub('free', {
      upcoming: {
        slug: 'premium',
        name: { en: 'Premium', ar: null },
        starts_at: '2026-10-05T10:00:00+00:00',
        ends_at: null,
      },
    })
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText(/Premium starts on/)).toBeInTheDocument()
    expect(screen.getByText('Oct 5, 2026')).toBeInTheDocument()
  })

  it('lists what the package includes and what it does not', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    const included = await screen.findByText('On your package')
    const chips = within(included.parentElement!)
    expect(chips.getByText('Analytics').closest('li')).toHaveTextContent('Not included')
  })

  it('marks what the package does include', async () => {
    stub('premium', {
      ...onPackage('premium', 'Premium'),
      plan: { ...EMPTY_PLAN, qr_studio: true },
    })
    renderWithProviders(<PackagePage locale="en" />)

    const included = await screen.findByText('On your package')
    const chips = within(included.parentElement!)
    expect(chips.getByText('QR studio').closest('li')).toHaveTextContent('Included')
    expect(chips.getByText('QR studio').closest('li')).not.toHaveTextContent('Not included')
    expect(chips.getByText('Analytics').closest('li')).toHaveTextContent('Not included')
  })

  it('builds each card on the one before and marks the most popular', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    const pro = (await screen.findByRole('heading', { name: 'Pro' })).closest('article')!
    expect(within(pro).getByText('Most popular')).toBeInTheDocument()
    expect(within(pro).getByText('Everything in Free, plus:')).toBeInTheDocument()
    expect(within(pro).getByText('150 dishes')).toBeInTheDocument()
    expect(within(pro).getByText('Your colours and fonts')).toBeInTheDocument()
    expect(within(pro).queryByText('QR studio')).not.toBeInTheDocument()
  })

  it('compares every feature across every package', async () => {
    stub()
    renderWithProviders(<PackagePage locale="en" />)

    const table = await screen.findByRole('table')
    const qr = within(table).getByRole('rowheader', { name: 'QR studio' }).closest('tr')!
    expect(
      within(qr)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Not included', 'Not included', 'Included', 'Included'])
    const dishes = within(table).getByRole('rowheader', { name: 'Dishes' }).closest('tr')!
    expect(
      within(dishes)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['40', '150', '500', 'Unlimited'])
    expect(within(table).getByText('Yours')).toBeInTheDocument()
    // It scrolls sideways on a phone, so a keyboard must be able to reach it.
    expect(screen.getByRole('region', { name: 'Compare packages' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  it('offers a retry when the catalog cannot be loaded', async () => {
    session()
    mock.onGet('/api/packages').reply(500, { message: 'Something went wrong.' })

    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })

  it('retries the catalogue', async () => {
    session()
    mock.onGet('/api/packages').replyOnce(500, { message: 'Something went wrong.' })
    stub()
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    await user.click(await screen.findByRole('button', { name: /Try again/ }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('falls back to the slug wherever a package has no name', async () => {
    const nameless = { en: null, ar: null }
    session()
    mock.onGet('/api/packages').reply(200, {
      data: [
        makePackage({ name: nameless, description: nameless }),
        makePackage({
          id: 2,
          slug: 'pro',
          name: nameless,
          description: nameless,
          is_default: false,
          price_cents: 1200,
          features: { dish_limit: 150 },
        }),
      ],
      meta: { current: 'free', ends_at: null },
    })
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    const pro = (await screen.findByRole('heading', { name: 'pro' })).closest('article')!
    expect(within(pro).getByText('Everything in free, plus:')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'pro' })).toBeInTheDocument()
    expect(screen.queryByText('Enough to go live.')).not.toBeInTheDocument()

    await user.click(within(pro).getByRole('button', { name: 'Request this package' }))
    expect(within(screen.getByRole('dialog')).getByText('Ask about pro')).toBeInTheDocument()
  })

  it('names a package with no name and no slug as Free', async () => {
    stub('free', {
      package: {
        slug: null,
        name: { en: null, ar: null },
        is_contact_only: false,
        starts_at: null,
        ends_at: '2026-10-01T10:00:00+00:00',
        days_left: 2,
      },
    })
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByRole('heading', { level: 2, name: 'Free' })).toBeInTheDocument()
    // Nothing to ask for again without a slug, so no warning either.
    expect(screen.getByText('2 days left')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask to extend' })).not.toBeInTheDocument()
  })

  it('says the package ends today on its last day', async () => {
    stub('pro', onPackage('pro', 'Pro', { ends_at: '2026-09-28T20:00:00+00:00', days_left: 0 }))
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Ends today')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask to extend' })).toBeInTheDocument()
  })

  it('gives only the end date when the days left are not known', async () => {
    stub('pro', onPackage('pro', 'Pro', { ends_at: '2026-10-12T10:00:00+00:00', days_left: null }))
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Oct 12, 2026')).toBeInTheDocument()
    expect(screen.queryByText(/left$/)).not.toBeInTheDocument()
    expect(screen.queryByText('Ends today')).not.toBeInTheDocument()
  })

  it('says a contact-only package is arranged directly', async () => {
    stub('custom', { package: { ...onPackage('custom', 'Custom').package, is_contact_only: true } })
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText('Arranged with us directly.')).toBeInTheDocument()
  })

  it('says a package that is not the default has no end date', async () => {
    stub('pro', onPackage('pro', 'Pro'))
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('No end date.')).toBeInTheDocument()
  })

  it('names an ended package by slug and leaves the date out when unknown', async () => {
    stub('free', {
      lapsed: { slug: 'gold', name: { en: null, ar: null }, ended_at: null },
    })
    const user = userEvent.setup()
    renderWithProviders(<PackagePage locale="en" />)

    expect(await screen.findByText(/^Your gold package ended on\s*$/)).toBeInTheDocument()
    await screen.findByRole('table')
    // "gold" is not in the catalogue, so there is nothing to open a request for.
    await user.click(screen.getByRole('button', { name: 'Ask to renew' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('announces nothing for an upcoming package without a start date', async () => {
    stub('free', {
      upcoming: {
        slug: 'premium',
        name: { en: 'Premium', ar: null },
        starts_at: null,
        ends_at: null,
      },
    })
    renderWithProviders(<PackagePage locale="en" />)

    await screen.findByRole('table')
    expect(screen.queryByText(/starts on/)).not.toBeInTheDocument()
  })
})
