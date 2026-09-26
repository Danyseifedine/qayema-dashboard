import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/utils/render-with-providers'
import { SettingsPage } from './settings-page'

let mock: MockAdapter

type Translatable = { en: string | null; ar: string | null }

type SettingsFixture = {
  name: Translatable
  description: Translatable
  default_locale: string
  slug: string
  google_maps_url: string | null
  phone: string | null
  country_code: string | null
  currency: string
  timezone: string
  opening_hours: Record<string, { open: string; close: string } | null>
  logo_url: string | null
  cover_url: string | null
}

const settings: SettingsFixture = {
  name: { en: 'Beit Qayema', ar: null },
  description: { en: 'Lebanese home cooking.', ar: null },
  default_locale: 'en',
  slug: 'beit-qayema',
  google_maps_url: 'https://maps.google.com/beit',
  phone: '70123456',
  country_code: 'LB',
  currency: 'USD',
  timezone: 'Asia/Beirut',
  opening_hours: {
    mon: { open: '07:30', close: '22:00' },
    tue: { open: '07:30', close: '22:00' },
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  },
  logo_url: 'https://cdn.qayema.test/logo.webp',
  cover_url: null,
}

function stub(overrides: Partial<SettingsFixture> = {}) {
  mock.onGet('/api/settings').reply(200, { data: { ...settings, ...overrides } })
}

describe('SettingsPage', () => {
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

  it('fills every field with what is already saved', async () => {
    stub()
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema')
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Lebanese home cooking.')
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('70123456')
    expect(screen.getByLabelText(/^Location/)).toHaveValue('https://maps.google.com/beit')
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('USD')
  })

  it('links to the menu on its own domain, not the dashboard', async () => {
    stub()
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
            slug: 'free',
            name: { en: 'Free', ar: null },
            is_contact_only: false,
            ends_at: null,
          },
          limits: {
            dishes: { used: 0, limit: 40 },
            categories: { used: 0, limit: 10 },
            social_links: { used: 0, limit: 2 },
          },
          features: { qr_studio: false, ordering: false, advanced_analytics: false },
        },
      },
    })

    renderWithProviders(<SettingsPage />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /beit-qayema/ })).toHaveAttribute(
        'href',
        'https://qayema.test/beit-qayema',
      ),
    )
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('keeps save switched off until something changes', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const save = await screen.findByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Restaurant name/), '!')

    await waitFor(() => expect(save).toBeEnabled())
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
  })

  it('sends only what the server accepts, with empty text as null', async () => {
    stub({ description: { en: null, ar: null }, google_maps_url: null })
    mock.onPatch('/api/settings').reply(200, { data: settings })

    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.type(await screen.findByLabelText(/^Restaurant name/), ' Two')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/settings')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.name).toBe('Beit Qayema Two')
      expect(body.description).toBeNull()
      expect(body.google_maps_url).toBeNull()
      // The slug is immutable, and an untouched image sends no key at all.
      expect(body).not.toHaveProperty('slug')
      expect(body).not.toHaveProperty('logo_key')
    })
  })

  it('puts a server error on the field it names', async () => {
    stub()
    mock.onPatch('/api/settings').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { phone: ['Please enter a valid phone number using digits only.'] },
    })

    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.type(await screen.findByLabelText(/^Restaurant name/), '!')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Please enter a valid phone number using digits only.'),
    ).toBeInTheDocument()
  })

  it('undoes changes back to what is saved', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const name = await screen.findByLabelText(/^Restaurant name/)
    await user.clear(name)
    await user.type(name, 'Something else')

    await user.click(screen.getByRole('button', { name: 'Undo changes' }))

    await waitFor(() =>
      expect(screen.getByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema'),
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('draws a map when the link carries a point, and offers a way to open it', async () => {
    stub({ google_maps_url: 'https://www.google.com/maps?q=33.8886,35.4955' })
    renderWithProviders(<SettingsPage />)

    const map = await screen.findByTitle('Where your restaurant is')
    expect(map).toHaveAttribute('src', expect.stringContaining('openstreetmap.org'))
    expect(map).toHaveAttribute('src', expect.stringContaining('marker=33.888600,35.495500'))
    expect(screen.getByText('33.88860, 35.49550')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open in Google Maps/ })).toBeInTheDocument()
  })

  it('says why there is no map when the link hides its coordinates', async () => {
    stub({ google_maps_url: 'https://maps.app.goo.gl/abc123' })
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByText(/no coordinates in it/)).toBeInTheDocument()
    expect(screen.queryByTitle('Where your restaurant is')).not.toBeInTheDocument()
  })

  it('fills the location from the browser and marks the form dirty', async () => {
    stub({ google_maps_url: null })

    const getCurrentPosition = vi.fn(
      (onSuccess: (position: { coords: { latitude: number; longitude: number } }) => void) => {
        onSuccess({ coords: { latitude: 33.8886, longitude: 35.4955 } })
      },
    )
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })

    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(await screen.findByRole('button', { name: /Use my current location/ }))

    await waitFor(() =>
      expect(screen.getByLabelText(/^Location/)).toHaveValue(
        'https://www.google.com/maps?q=33.888600,35.495500',
      ),
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    vi.unstubAllGlobals()
  })

  it('explains a refused location instead of failing quietly', async () => {
    stub({ google_maps_url: null })

    const getCurrentPosition = vi.fn(
      (
        _onSuccess: unknown,
        onError: (failure: { code: number; PERMISSION_DENIED: number }) => void,
      ) => {
        onError({ code: 1, PERMISSION_DENIED: 1 })
      },
    )
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })

    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(await screen.findByRole('button', { name: /Use my current location/ }))

    expect(await screen.findByText(/Location is blocked for this site/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('fills the opening hours, day by day', async () => {
    stub()
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByLabelText('Monday opens')).toHaveValue('07:30')
    expect(screen.getByLabelText('Monday closes')).toHaveValue('22:00')
    expect(screen.getByRole('switch', { name: 'Monday is open' })).toBeChecked()

    // A day with no range is switched off, but keeps usable times in its
    // boxes so turning it on does not start from nothing.
    expect(screen.getByRole('switch', { name: 'Wednesday is open' })).not.toBeChecked()
    expect(screen.getByLabelText('Wednesday opens')).toBeDisabled()
  })

  it('sends a closed day as null and an open one as a range', async () => {
    stub()
    mock.onPatch('/api/settings').reply(200, { data: settings })

    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    // Open Wednesday, close Monday.
    await user.click(await screen.findByRole('switch', { name: 'Wednesday is open' }))
    await user.click(screen.getByRole('switch', { name: 'Monday is open' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/settings')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.opening_hours.mon).toBeNull()
      expect(body.opening_hours.wed).toEqual({ open: '09:00', close: '22:00' })
      expect(body.timezone).toBe('Asia/Beirut')
    })
  })

  it('lets a logo be replaced but never removed', async () => {
    stub()
    renderWithProviders(<SettingsPage />)

    // The server has no delete flag for the logo, so offering one would be a
    // button that can only fail.
    expect(await screen.findByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('surfaces a failed load with a retry', async () => {
    mock.onGet('/api/settings').reply(500, { message: 'Something went wrong.' })
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })
})
