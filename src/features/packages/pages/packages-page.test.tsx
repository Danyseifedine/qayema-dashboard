import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { PackagesPage } from './packages-page'

let mock: MockAdapter

function pkg(overrides: Record<string, unknown>) {
  return {
    id: 1,
    slug: 'free',
    name: { en: 'Free', ar: null },
    description: { en: 'Enough to go live.', ar: null },
    price_cents: 0,
    currency: 'USD',
    is_contact_only: false,
    is_default: true,
    sort_order: 0,
    features: {
      dish_limit: 40,
      category_limit: 10,
      social_link_limit: 2,
      qr_studio: false,
    },
    ...overrides,
  }
}

const packages = [
  pkg({}),
  pkg({
    id: 2,
    slug: 'pro',
    name: { en: 'Pro', ar: null },
    price_cents: 1200,
    is_default: false,
    sort_order: 1,
    features: { dish_limit: 120, category_limit: 25, social_link_limit: 6, qr_studio: true },
  }),
  pkg({
    id: 3,
    slug: 'premium',
    name: { en: 'Premium', ar: null },
    price_cents: 2900,
    is_default: false,
    sort_order: 2,
    features: { dish_limit: 300, category_limit: 50, social_link_limit: 12, qr_studio: true },
  }),
  pkg({
    id: 4,
    slug: 'custom',
    name: { en: 'Custom', ar: null },
    price_cents: null,
    is_contact_only: true,
    is_default: false,
    sort_order: 3,
    features: {
      dish_limit: null,
      category_limit: null,
      social_link_limit: null,
      qr_studio: true,
    },
  }),
]

function session(current = 'free') {
  mock.onGet('/api/user').reply(200, {
    data: {
      id: 1,
      name: 'Dany',
      email: 'owner@example.com',
      role: 'menu_owner',
      has_completed_onboarding: true,
      has_password: true,
      restaurant: {
        id: 1,
        name: { en: 'Beit Qayema', ar: null },
        slug: 'beit-qayema',
        default_locale: 'en',
        is_active: true,
        template_id: 1,
        logo_url: null,
        public_url: 'https://qayema.test/beit-qayema',
        qr_url: 'https://qayema.test/beit-qayema?qr=1',
        package: {
          slug: current,
          name: { en: current === 'free' ? 'Free' : 'Pro', ar: null },
          is_contact_only: false,
          ends_at: null,
        },
        limits: {
          dishes: { used: 12, limit: 40 },
          categories: { used: 3, limit: 10 },
          social_links: { used: 1, limit: 2 },
        },
        features: { qr_studio: false },
      },
    },
  })
}

function stub(current = 'free') {
  session(current)
  mock.onGet('/api/packages').reply(200, { data: packages, meta: { current, ends_at: null } })
}

describe('PackagesPage', () => {
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
    renderWithProviders(<PackagesPage locale="en" />)

    expect(await screen.findByText('Your package')).toBeInTheDocument()
    expect(await screen.findByText('12 / 40')).toBeInTheDocument()
    expect(screen.getByText('3 / 10')).toBeInTheDocument()
    expect(screen.getByText(/QR studio is not included/)).toBeInTheDocument()
  })

  it('lists every package and offers only the ones worth asking about', async () => {
    stub()
    renderWithProviders(<PackagesPage locale="en" />)

    // Free is what they already have, so it is marked rather than offered.
    expect(await screen.findByRole('button', { name: 'Your package' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Request this package' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Talk to us' })).toBeInTheDocument()
  })

  it('writes an unlimited limit as a word, not a number', async () => {
    stub()
    renderWithProviders(<PackagesPage locale="en" />)

    expect(await screen.findByText('Unlimited dishes')).toBeInTheDocument()
    expect(screen.getByText("Let's talk")).toBeInTheDocument()
  })

  it('marks the package the owner is actually on', async () => {
    stub('pro')
    renderWithProviders(<PackagesPage locale="en" />)

    const mine = await screen.findByRole('button', { name: 'Your package' })
    expect(mine).toBeDisabled()
    // Free is no longer theirs, but it is still not requestable.
    expect(screen.getByRole('button', { name: 'Included for everyone' })).toBeDisabled()
  })

  it('sends the slug and the note when a package is requested', async () => {
    stub()
    mock.onPost('/api/packages/request').reply(201, { data: { id: 7, package: 'pro' } })

    const user = userEvent.setup()
    renderWithProviders(<PackagesPage locale="en" />)

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
    renderWithProviders(<PackagesPage locale="en" />)

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
    renderWithProviders(<PackagesPage locale="en" />)

    const [requestPro] = await screen.findAllByRole('button', { name: 'Request this package' })
    await user.click(requestPro!)
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText(/Try again in 12 hours/)).toBeInTheDocument()
    // The dialog stays open so the note is not lost.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('offers a retry when the catalog cannot be loaded', async () => {
    session()
    mock.onGet('/api/packages').reply(500, { message: 'Something went wrong.' })

    renderWithProviders(<PackagesPage locale="en" />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })
})
