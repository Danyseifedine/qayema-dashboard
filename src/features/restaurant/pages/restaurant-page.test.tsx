import { screen, waitFor, within } from '@testing-library/react'
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { EMPTY_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'
import { restaurantKeys } from '@/features/restaurant/hooks/restaurant-keys'
import { RestaurantPage } from '@/features/restaurant/pages/restaurant-page'

let mock: MockAdapter

const LOGO_KEY = '11111111-2222-4333-8444-555555555555'
const COVER_KEY = '66666666-7777-4888-9999-000000000000'

function uploaded(key: string) {
  return { key, optimized_size: '40 KB', saved_percent: 90 }
}

function png(name: string): File {
  return new File([new Uint8Array(32)], name, { type: 'image/png' })
}

/** The logo's file input, then the cover's, in the order the page draws them. */
function fileInputs(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')]
}

type MenuText = Record<string, string | null>

type SettingsFixture = {
  languages: string[]
  second_locale: string | null
  default_locale: string
  name: MenuText
  description: MenuText
  slug: string
  google_maps_url: string | null
  phone: string | null
  country_code: string | null
  currency: string
  timezone: string
  opening_hours: Record<string, { open: string; close: string }[] | null>
  logo_url: string | null
  cover_url: string | null
}

const settings: SettingsFixture = {
  languages: ['en', 'ar'],
  second_locale: 'ar',
  default_locale: 'en',
  name: { en: 'Beit Qayema', ar: null },
  description: { en: 'Lebanese home cooking.', ar: null },
  slug: 'beit-qayema',
  google_maps_url: 'https://maps.google.com/beit',
  phone: '70123456',
  country_code: 'LB',
  currency: 'USD',
  timezone: 'Asia/Beirut',
  opening_hours: {
    mon: [{ open: '07:30', close: '22:00' }],
    tue: [{ open: '07:30', close: '22:00' }],
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
  mock.onGet('/api/restaurant').reply(200, { data: { ...settings, ...overrides } })
}

describe('RestaurantPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    // The menu's languages come from the session: English and Arabic here.
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('fills every field with what is already saved', async () => {
    stub()
    renderWithProviders(<RestaurantPage />)

    expect(await screen.findByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema')
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Lebanese home cooking.')
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('70123456')
    expect(screen.getByLabelText(/^Location/)).toHaveValue('https://maps.google.com/beit')
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('USD')
  })

  it('links to the menu on its own domain, not the dashboard', async () => {
    stub()
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ plan: EMPTY_PLAN }) })

    renderWithProviders(<RestaurantPage />)

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /beit-qayema/ })).toHaveAttribute(
        'href',
        'https://qayema.test/beit-qayema',
      ),
    )
  })

  it('keeps save switched off until something changes', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    const save = await screen.findByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Restaurant name/), '!')

    await waitFor(() => expect(save).toBeEnabled())
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
  })

  it('sends only what the server accepts, one entry per menu language', async () => {
    stub({ description: { en: null, ar: null }, google_maps_url: null })
    mock.onPatch('/api/restaurant').reply(200, { data: settings })

    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    await user.type(await screen.findByLabelText(/^Restaurant name/), ' Two')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.name).toEqual({ en: 'Beit Qayema Two', ar: '' })
      // Blank text clears that language.
      expect(body.description).toEqual({ en: '', ar: '' })
      // The languages themselves are set on the Features page, not here.
      expect(body).not.toHaveProperty('second_locale')
      expect(body.google_maps_url).toBeNull()
      // The slug has its own call, and an untouched image sends no key at all.
      expect(body).not.toHaveProperty('slug')
      expect(body).not.toHaveProperty('logo_key')
    })
  })

  it('puts a server error on the field it names', async () => {
    stub()
    mock.onPatch('/api/restaurant').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { phone: ['Please enter a valid phone number using digits only.'] },
    })

    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    await user.type(await screen.findByLabelText(/^Restaurant name/), '!')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Please enter a valid phone number using digits only.'),
    ).toBeInTheDocument()
  })

  it('undoes changes back to what is saved', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

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
    renderWithProviders(<RestaurantPage />)

    const map = await screen.findByTitle('Where your restaurant is')
    expect(map).toHaveAttribute('src', expect.stringContaining('openstreetmap.org'))
    expect(map).toHaveAttribute('src', expect.stringContaining('marker=33.888600,35.495500'))
    expect(screen.getByText('33.88860, 35.49550')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open in Google Maps/ })).toBeInTheDocument()
  })

  it('says why there is no map when the link hides its coordinates', async () => {
    stub({ google_maps_url: 'https://maps.app.goo.gl/abc123' })
    renderWithProviders(<RestaurantPage />)

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
    renderWithProviders(<RestaurantPage />)

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
    renderWithProviders(<RestaurantPage />)

    await user.click(await screen.findByRole('button', { name: /Use my current location/ }))

    expect(await screen.findByText(/Location is blocked for this site/)).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('fills the opening hours, day by day, as a clock reads them', async () => {
    stub()
    renderWithProviders(<RestaurantPage />)

    // 07:30 - 22:00 reads 7 : 30 AM, then 10 : 00 PM, with the part of the day.
    expect(await screen.findByRole('combobox', { name: 'Monday opens: hour' })).toHaveValue('7')
    expect(screen.getByRole('combobox', { name: 'Monday opens: minutes' })).toHaveValue('30')
    expect(
      within(screen.getByRole('tablist', { name: 'Monday opens: AM or PM' })).getByRole('tab', {
        name: 'AM',
      }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('combobox', { name: 'Monday closes: hour' })).toHaveValue('10')
    expect(
      within(screen.getByRole('tablist', { name: 'Monday closes: AM or PM' })).getByRole('tab', {
        name: 'PM',
      }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText(/· Morning/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/· Night/).length).toBeGreaterThan(0)
    expect(screen.getByRole('switch', { name: 'Monday is open' })).toBeChecked()

    // A day with no range is switched off, but keeps usable times in its
    // boxes so turning it on does not start from nothing.
    expect(screen.getByRole('switch', { name: 'Wednesday is open' })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Wednesday opens: hour' })).toBeDisabled()
  })

  it('stores what was picked as HH:MM', async () => {
    stub()
    mock.onPatch('/api/restaurant').reply(200, { data: settings })
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    // Monday closes at 11:15 PM instead of 10:00 PM.
    await user.click(await screen.findByRole('combobox', { name: 'Monday closes: hour' }))
    await user.click(screen.getByRole('option', { name: '11' }))
    await user.click(screen.getByRole('combobox', { name: 'Monday closes: minutes' }))
    await user.click(screen.getByRole('option', { name: '15' }))

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(JSON.parse(patch!.data as string).opening_hours.mon).toEqual([
        { open: '07:30', close: '23:15' },
      ])
    })
  })

  it('splits a day into shifts, and saves them all', async () => {
    stub()
    mock.onPatch('/api/restaurant').reply(200, { data: settings })
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    await user.click(await screen.findByRole('button', { name: 'Add a shift on Monday' }))

    // It starts where the first one closes (10 PM), for two hours.
    expect(screen.getByText('Shift 2')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Monday, shift 2, opens: hour' })).toHaveValue('10')
    expect(screen.getByRole('combobox', { name: 'Monday, shift 2, closes: hour' })).toHaveValue(
      '12',
    )
    expect(screen.getByText('Closes the next day, after midnight.')).toBeInTheDocument()

    // Ends at 11 PM instead.
    await user.click(screen.getByRole('combobox', { name: 'Monday, shift 2, closes: hour' }))
    await user.click(screen.getByRole('option', { name: '11' }))
    expect(screen.queryByText('Closes the next day, after midnight.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(JSON.parse(patch!.data as string).opening_hours.mon).toEqual([
        { open: '07:30', close: '22:00' },
        { open: '22:00', close: '23:00' },
      ])
    })
  })

  it('takes three shifts at most, and removes any after the first', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    const add = await screen.findByRole('button', { name: 'Add a shift on Monday' })
    await user.click(add)
    await user.click(add)
    expect(screen.queryByRole('button', { name: 'Add a shift on Monday' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remove shift 1 on Monday' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove shift 3 on Monday' }))
    await user.click(screen.getByRole('button', { name: 'Remove shift 2 on Monday' }))
    expect(screen.queryByText('Shift 2')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Monday opens: hour' })).toHaveValue('7')
    expect(screen.getByRole('button', { name: 'Add a shift on Monday' })).toBeInTheDocument()
  })

  it('refuses shifts that overlap, under the one at fault, and saves nothing', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    await user.click(await screen.findByRole('button', { name: 'Add a shift on Monday' }))
    // Opens at 9 PM, while the first shift runs until 10 PM.
    await user.click(screen.getByRole('combobox', { name: 'Monday, shift 2, opens: hour' }))
    await user.click(screen.getByRole('option', { name: '9' }))

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText("Shifts on the same day can't overlap.")).toBeInTheDocument()
    expect(mock.history.patch).toHaveLength(0)
  })

  it('says when a day closes after midnight', async () => {
    stub()
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    const closes = await screen.findByRole('tablist', { name: 'Monday closes: AM or PM' })
    expect(screen.queryByText('Closes the next day, after midnight.')).not.toBeInTheDocument()

    // Opens 7:30 AM, now closes 2:00 AM: the night runs into the next day.
    await user.click(screen.getByRole('combobox', { name: 'Monday closes: hour' }))
    await user.click(screen.getByRole('option', { name: '2' }))
    await user.click(within(closes).getByRole('tab', { name: 'AM' }))

    expect(screen.getByText('Closes the next day, after midnight.')).toBeInTheDocument()
  })

  it('keeps a saved time on minutes the picker does not offer', async () => {
    stub({
      opening_hours: { ...settings.opening_hours, mon: [{ open: '07:20', close: '22:00' }] },
    })
    mock.onPatch('/api/restaurant').reply(200, { data: settings })
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    const minutes = await screen.findByRole('combobox', { name: 'Monday opens: minutes' })
    expect(minutes).toHaveValue('20')
    await user.click(minutes)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      '00',
      '15',
      '20',
      '30',
      '45',
    ])
    await user.keyboard('{Escape}')

    // A new hour keeps the 20 minutes.
    await user.click(screen.getByRole('combobox', { name: 'Monday opens: hour' }))
    await user.click(screen.getByRole('option', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(JSON.parse(patch!.data as string).opening_hours.mon).toEqual([
        { open: '08:20', close: '22:00' },
      ])
    })
  })

  it('asks for a time a day was saved without, and waits for the hour', async () => {
    stub({ opening_hours: { ...settings.opening_hours, mon: [{ open: '', close: '22:00' }] } })
    mock.onPatch('/api/restaurant').reply(200, { data: settings })
    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    // No hour yet: the minutes and AM wait with a restaurant's defaults.
    const hour = await screen.findByRole('combobox', { name: 'Monday opens: hour' })
    expect(hour).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Monday opens: minutes' })).toHaveValue('00')
    const meridiem = screen.getByRole('tablist', { name: 'Monday opens: AM or PM' })
    expect(within(meridiem).getByRole('tab', { name: 'AM' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.type(screen.getByLabelText(/^Restaurant name/), '!')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Pick a time.')).toBeInTheDocument()
    expect(hour).toHaveAttribute('aria-invalid', 'true')
    expect(mock.history.patch).toHaveLength(0)

    // Minutes and PM picked first are kept for when the hour comes.
    await user.click(screen.getByRole('combobox', { name: 'Monday opens: minutes' }))
    await user.click(screen.getByRole('option', { name: '30' }))
    await user.click(within(meridiem).getByRole('tab', { name: 'PM' }))
    expect(hour).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Monday opens: minutes' })).toHaveValue('30')

    await user.click(hour)
    await user.click(screen.getByRole('option', { name: '6' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(JSON.parse(patch!.data as string).opening_hours.mon).toEqual([
        { open: '18:30', close: '22:00' },
      ])
    })
  })

  it('opens again on the restaurant it already has, without refilling the form twice', async () => {
    stub()
    const { rerender } = renderWithProviders(<RestaurantPage />)
    expect(await screen.findByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema')

    // Opened again in development's StrictMode, which runs each effect twice
    // on mount: the second run finds the form already filled from this data.
    rerender(
      <StrictMode>
        <RestaurantPage />
      </StrictMode>,
    )

    expect(await screen.findByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(mock.history.get.filter((call) => call.url === '/api/restaurant')).toHaveLength(1)
  })

  describe('the menu link', () => {
    it('changes the link after saying the old one keeps working', async () => {
      stub()
      mock
        .onPut('/api/restaurant/slug')
        .reply(200, { data: { ...settings, slug: 'cedar-and-salt' } })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      const link = await screen.findByRole('textbox', { name: 'Link' })
      expect(link).toHaveValue('beit-qayema')
      const change = screen.getByRole('button', { name: 'Change link' })
      // Nothing to change until the link is different.
      expect(change).toBeDisabled()

      await user.clear(link)
      await user.type(link, 'cedar-and-salt')
      await user.click(change)

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog).getByText(/Your old link and the QR codes you already printed keep working/),
      ).toBeInTheDocument()
      expect(within(dialog).getByText(/\/cedar-and-salt/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Change link' }))

      await waitFor(() => {
        const put = mock.history.put.find((r) => r.url === '/api/restaurant/slug')
        expect(JSON.parse(put!.data as string)).toEqual({ slug: 'cedar-and-salt' })
      })
      expect(await screen.findByText('Link changed')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'Link' })).toHaveValue('cedar-and-salt'),
      )
    })

    it('says so when the link is taken', async () => {
      stub()
      mock.onPut('/api/restaurant/slug').reply(422, {
        message: 'That link is already taken. Try another one.',
        code: 'validation_failed',
        errors: { slug: ['That link is already taken. Try another one.'] },
      })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      const link = await screen.findByRole('textbox', { name: 'Link' })
      await user.clear(link)
      await user.type(link, 'olive')
      await user.click(screen.getByRole('button', { name: 'Change link' }))
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Change link' }),
      )

      expect(
        await screen.findAllByText('That link is already taken. Try another one.'),
      ).not.toHaveLength(0)
    })
  })

  it('sends a closed day as null and an open one as a range', async () => {
    stub()
    mock.onPatch('/api/restaurant').reply(200, { data: settings })

    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    // Open Wednesday, close Monday.
    await user.click(await screen.findByRole('switch', { name: 'Wednesday is open' }))
    await user.click(screen.getByRole('switch', { name: 'Monday is open' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.opening_hours.mon).toBeNull()
      expect(body.opening_hours.wed).toEqual([{ open: '09:00', close: '22:00' }])
      expect(body.timezone).toBe('Asia/Beirut')
    })
  })

  it('lets a logo be replaced but never removed', async () => {
    stub()
    renderWithProviders(<RestaurantPage />)

    // The server has no delete flag for the logo, so offering one would be a
    // button that can only fail.
    expect(await screen.findByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('removes a saved cover: it disappears and the save deletes it', async () => {
    stub({ cover_url: 'https://cdn.qayema.test/cover.webp' })
    mock.onPatch('/api/restaurant').reply(200, { data: { ...settings, cover_url: null } })

    const user = userEvent.setup()
    renderWithProviders(<RestaurantPage />)

    // Only the cover can be removed; the logo has Replace alone.
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = mock.history.patch.find((r) => r.url === '/api/restaurant')
      expect(patch).toBeDefined()
      const body = JSON.parse(patch!.data as string)
      expect(body.delete_cover_image).toBe(true)
      expect(body.cover_image_key).toBeUndefined()
      expect(body.logo_key).toBeUndefined()
    })
  })

  it('surfaces a failed load with a retry', async () => {
    mock.onGet('/api/restaurant').reply(500, { message: 'Something went wrong.' })
    renderWithProviders(<RestaurantPage />)

    expect(await screen.findByRole('button', { name: /Try again/ })).toBeInTheDocument()
  })

  describe('menu languages', () => {
    it('gives the name and description a tab per menu language', async () => {
      stub()
      renderWithProviders(<RestaurantPage />)

      await screen.findByLabelText(/^Restaurant name/)
      await waitFor(() =>
        expect(screen.getAllByRole('tablist', { name: 'Content language' })).toHaveLength(2),
      )
      expect(screen.getAllByRole('tab', { name: 'AR' })).toHaveLength(2)
      // Choosing the languages lives on the Features page now.
      expect(screen.queryByRole('combobox', { name: /Second language/ })).not.toBeInTheDocument()
    })

    it('edits English only on an English-only menu', async () => {
      stub()
      mock.onGet('/api/user').reply(200, { data: makeSessionUser({ languages: ['en'] }) })
      mock.onPatch('/api/restaurant').reply(200, { data: settings })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      const name = await screen.findByLabelText(/^Restaurant name/)
      expect(screen.queryByRole('tablist', { name: 'Content language' })).not.toBeInTheDocument()

      await user.type(name, '!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => {
        const body = JSON.parse(mock.history.patch[0]!.data as string)
        expect(body.name).toEqual({ en: 'Beit Qayema!' })
      })
    })

    it('asks for the name in English', async () => {
      stub()
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await user.clear(await screen.findByLabelText(/^Restaurant name/))
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(
        await screen.findByText('The restaurant name is required in English.'),
      ).toBeInTheDocument()
      expect(mock.history.patch).toHaveLength(0)
    })
  })

  describe('more of the page', () => {
    beforeEach(() => {
      // jsdom's File cannot become an object URL; the preview only needs a string.
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it('retries a failed load', async () => {
      mock.onGet('/api/restaurant').replyOnce(500, { message: 'Something went wrong.' })
      stub()
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await user.click(await screen.findByRole('button', { name: /Try again/ }))
      expect(await screen.findByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema')
    })

    it('starts empty where nothing is saved yet', async () => {
      stub({ phone: null, country_code: null, logo_url: null })
      renderWithProviders(<RestaurantPage />)

      expect(await screen.findByLabelText(/^Phone/)).toHaveValue('')
      // No saved logo: the drop zone, not Replace.
      expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /Drop an image or browse/ })).toHaveLength(2)
    })

    it('links to the menu by its slug when the session has no address', async () => {
      stub()
      mock.onGet('/api/user').reply(200, { data: { ...makeSessionUser(), restaurant: null } })
      renderWithProviders(<RestaurantPage />)

      expect(await screen.findByRole('link', { name: /beit-qayema/ })).toHaveAttribute(
        'href',
        '/beit-qayema',
      )
    })

    it('keeps what the owner typed when the same data is fetched again', async () => {
      stub()
      const user = userEvent.setup()
      const { queryClient } = renderWithProviders(<RestaurantPage />)

      const name = await screen.findByLabelText(/^Restaurant name/)
      await user.type(name, ' Two')
      await queryClient.refetchQueries({ queryKey: restaurantKeys.all })

      await waitFor(() =>
        expect(mock.history.get.filter((call) => call.url === '/api/restaurant')).toHaveLength(2),
      )
      expect(screen.getByLabelText(/^Restaurant name/)).toHaveValue('Beit Qayema Two')
    })

    it('sends an empty entry for a menu language the saved text does not have yet', async () => {
      stub({ languages: ['en'] })
      mock.onPatch('/api/restaurant').reply(200, { data: settings })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await user.type(await screen.findByLabelText(/^Restaurant name/), '!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(mock.history.patch).toHaveLength(1))
      const body = JSON.parse(mock.history.patch[0]!.data as string)
      expect(body.name).toEqual({ en: 'Beit Qayema!', ar: '' })
    })

    it('shows a failed save above the form, and lets it be dismissed', async () => {
      stub()
      mock.onPatch('/api/restaurant').reply(500, { message: 'Server down', code: 'server_error' })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await user.type(await screen.findByLabelText(/^Restaurant name/), '!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      const banner = (await screen.findByText('That did not save')).closest('[role="alert"]')
      expect(banner).not.toBeNull()
      expect(within(banner as HTMLElement).getByText('Server down')).toBeInTheDocument()

      await user.click(within(banner as HTMLElement).getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByText('That did not save')).not.toBeInTheDocument()
    })

    it('says it is finding the owner while the browser works', async () => {
      stub({ google_maps_url: null })
      vi.stubGlobal('navigator', {
        ...navigator,
        geolocation: { getCurrentPosition: vi.fn() },
      })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await user.click(await screen.findByRole('button', { name: /Use my current location/ }))

      expect(await screen.findByRole('button', { name: /Finding you/ })).toBeInTheDocument()
    })

    it('uploads a new logo and cover, showing progress, and saves their keys', async () => {
      stub()
      // jsdom cannot decode an image, so the size check is left to the server.
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decoder')))
      let releaseCover: (value: [number, unknown]) => void = () => {}
      mock.onPost('/api/uploads/temp').reply((config: AxiosRequestConfig) => {
        const context = (config.data as FormData).get('context')
        if (context === 'logo') return [200, uploaded(LOGO_KEY)]
        config.onUploadProgress?.({ loaded: 50, total: 100 } as AxiosProgressEvent)
        return new Promise((resolve) => {
          releaseCover = resolve
        })
      })
      mock.onPatch('/api/restaurant').reply(200, { data: settings })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await screen.findByLabelText(/^Restaurant name/)
      const [logoInput, coverInput] = fileInputs()
      await user.upload(logoInput!, png('logo.png'))
      expect(await screen.findByText('logo.png')).toBeInTheDocument()

      await user.upload(coverInput!, png('cover.png'))
      const progress = await screen.findByRole('progressbar')
      await waitFor(() => expect(progress).toHaveAttribute('aria-valuenow', '50'))
      expect(screen.getByText('Uploading…')).toBeInTheDocument()

      releaseCover([200, uploaded(COVER_KEY)])
      expect(await screen.findByText('cover.png')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(mock.history.patch).toHaveLength(1))
      const body = JSON.parse(mock.history.patch[0]!.data as string)
      expect(body.logo_key).toBe(LOGO_KEY)
      expect(body.cover_image_key).toBe(COVER_KEY)
      expect(body).not.toHaveProperty('delete_cover_image')
      const contexts = mock.history.post
        .filter((call) => call.url === '/api/uploads/temp')
        .map((call) => (call.data as FormData).get('context'))
      expect(contexts).toEqual(['logo', 'cover_image'])
    })

    it('takes back a cover picked by mistake before saving', async () => {
      stub()
      vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decoder')))
      mock.onPost('/api/uploads/temp').reply(200, uploaded(COVER_KEY))
      mock.onPatch('/api/restaurant').reply(200, { data: settings })
      const user = userEvent.setup()
      renderWithProviders(<RestaurantPage />)

      await screen.findByLabelText(/^Restaurant name/)
      await user.upload(fileInputs()[1]!, png('cover.png'))
      expect(await screen.findByText('cover.png')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove' }))
      expect(screen.queryByText('cover.png')).not.toBeInTheDocument()

      await user.type(screen.getByLabelText(/^Restaurant name/), '!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(mock.history.patch).toHaveLength(1))
      const body = JSON.parse(mock.history.patch[0]!.data as string)
      expect(body).not.toHaveProperty('cover_image_key')
    })
  })
})
