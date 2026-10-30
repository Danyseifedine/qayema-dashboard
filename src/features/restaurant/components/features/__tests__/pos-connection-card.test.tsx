import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import type { PosConnection } from '@/features/restaurant/api/pos-connection.api'
import { PosConnectionCard } from '@/features/restaurant/components/features/pos-connection-card'
import { FeaturesPage } from '@/features/restaurant/pages/features-page'

let mock: MockAdapter

const KEY = 'menu_abcdefghijklmnopqrstuvwxyz0123456789'

function linked(overrides: Partial<PosConnection> = {}): PosConnection {
  return {
    address: 'https://pos.example.com',
    company: 'Hamra Bites',
    branch: 'Hamra',
    currency: 'USD',
    locales: ['en', 'ar'],
    linked_at: '2026-10-30T10:00:00Z',
    last_synced_at: '2026-10-30T10:01:00Z',
    last_attempt_at: '2026-10-30T10:01:00Z',
    last_error: null,
    unreachable_since: null,
    sends_orders: false,
    orders_in_menu: true,
    problems: [],
    ...overrides,
  }
}

describe('PosConnectionCard', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
  })

  afterEach(() => {
    vi.useRealTimers()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('asks for the address and the key, and checks them before sending', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.click(await screen.findByRole('button', { name: 'Connect' }))

    expect(await screen.findByText('Enter your POS address.')).toBeInTheDocument()
    expect(screen.getByText('Paste the key from your POS.')).toBeInTheDocument()
    expect(mock.history.post.filter((call) => call.url === '/api/pos-connection')).toHaveLength(0)
    // The key is hidden until asked for.
    expect(screen.getByLabelText(/Connection key/)).toHaveAttribute('type', 'password')
  })

  it('puts what the server refused under its field', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    mock.onPost('/api/pos-connection').reply(422, {
      message: 'The given data was invalid.',
      errors: { key: ['Your POS refused the key. It may have been revoked.'] },
    })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.type(await screen.findByLabelText(/POS address/), 'https://pos.example.com')
    await user.type(screen.getByLabelText(/Connection key/), KEY)
    await user.click(screen.getByRole('button', { name: 'Connect' }))

    expect(
      await screen.findByText('Your POS refused the key. It may have been revoked.'),
    ).toBeInTheDocument()
    expect(JSON.parse(mock.history.post.at(-1)!.data as string)).toEqual({
      address: 'https://pos.example.com',
      key: KEY,
    })
  })

  it('shows a refusal that names no field above the form', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    mock.onPost('/api/pos-connection').reply(409, {
      message: 'Your menu is already connected to a POS. Disconnect it first.',
    })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.type(await screen.findByLabelText(/POS address/), 'pos.example.com')
    await user.type(screen.getByLabelText(/Connection key/), KEY)
    await user.click(screen.getByRole('button', { name: 'Connect' }))

    expect(
      await within(document.querySelector('[data-pos-link]') as HTMLElement).findByText(
        'Your menu is already connected to a POS. Disconnect it first.',
      ),
    ).toBeInTheDocument()
  })

  it('links, then waits for the first sync', async () => {
    let calls = 0
    mock.onGet('/api/pos-connection').reply(() => {
      calls += 1
      return [200, { data: calls === 1 ? null : linked() }]
    })
    mock.onPost('/api/pos-connection').reply(201, {
      data: linked({ last_synced_at: null, last_attempt_at: null }),
    })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.type(await screen.findByLabelText(/POS address/), 'https://pos.example.com')
    await user.type(screen.getByLabelText(/Connection key/), KEY)
    await user.click(screen.getByRole('button', { name: 'Connect' }))

    expect(await screen.findByText('Connected to Hamra Bites · Hamra')).toBeInTheDocument()
    expect(screen.getByText('Syncing with your POS…')).toBeInTheDocument()
    // Asked again until the server says the pull is done.
    await waitFor(() => expect(screen.getByText(/Last synced/)).toBeInTheDocument(), {
      timeout: 5000,
    })
  })

  it('shows the last error and lists what could not come over', async () => {
    mock.onGet('/api/pos-connection').reply(200, {
      data: linked({
        last_error: 'Your POS did not answer.',
        problems: [1, 2, 3, 4].map((n) => ({ type: 'limit', message: `Dish ${n} was not added.` })),
      }),
    })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    expect(await screen.findByText('Your POS did not answer.')).toBeInTheDocument()
    expect(screen.getByText('4 things could not come over')).toBeInTheDocument()
    expect(screen.queryByText('Dish 4 was not added.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all 4' }))
    expect(screen.getByText('Dish 4 was not added.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show fewer' }))
    expect(screen.queryByText('Dish 4 was not added.')).not.toBeInTheDocument()
  })

  it('says since when the POS has not answered once it has been over an hour', async () => {
    mock.onGet('/api/pos-connection').reply(200, {
      data: linked({
        last_error: 'Your POS did not answer.',
        unreachable_since: '2026-10-30T08:00:00Z',
      }),
    })
    renderWithProviders(<PosConnectionCard />)

    expect(await screen.findByText(/Your POS has not answered since/)).toBeInTheDocument()
    expect(screen.queryByText('The last sync did not work')).not.toBeInTheDocument()
  })

  it('lists a few problems without "Show all"', async () => {
    mock.onGet('/api/pos-connection').reply(200, {
      data: linked({
        problems: [{ type: 'photo', message: 'The photo of Hummus could not be fetched.' }],
      }),
    })
    renderWithProviders(<PosConnectionCard />)

    expect(await screen.findByText('1 thing could not come over')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument()
  })

  it('says when it has not synced yet', async () => {
    mock.onGet('/api/pos-connection').reply(200, {
      data: linked({ company: null, branch: null, last_synced_at: null }),
    })
    renderWithProviders(<PosConnectionCard />)

    expect(await screen.findByText('Connected to https://pos.example.com')).toBeInTheDocument()
    expect(screen.getByText('Waiting for the first sync')).toBeInTheDocument()
  })

  it('syncs now', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: linked() })
    mock.onPost('/api/pos-connection/sync').reply(202)
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.click(await screen.findByRole('button', { name: 'Sync now' }))

    await waitFor(() =>
      expect(mock.history.post.some((call) => call.url === '/api/pos-connection/sync')).toBe(true),
    )
    expect(await screen.findByText('Syncing with your POS…')).toBeInTheDocument()
  })

  it('disconnects after asking', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: linked() })
    mock.onDelete('/api/pos-connection').reply(204)
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    const dialog = await screen.findByRole('dialog', { name: 'Disconnect your POS?' })
    await user.click(within(dialog).getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => expect(mock.history.delete).toHaveLength(1))
    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('keeps the dialog open when disconnecting fails, and can be cancelled', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: linked() })
    mock.onDelete('/api/pos-connection').reply(500, { message: 'Server error.' })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    const dialog = await screen.findByRole('dialog', { name: 'Disconnect your POS?' })
    await user.click(within(dialog).getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(mock.history.delete.length).toBeGreaterThan(0))

    await user.click(within(dialog).getByRole('button', { name: /Cancel/ }))
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument()
  })

  it('offers to try again when the link cannot be read', async () => {
    mock
      .onGet('/api/pos-connection')
      .replyOnce(403, { message: 'Connect to POS is not switched on.' })
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    const user = userEvent.setup()
    renderWithProviders(<PosConnectionCard />)

    await user.click(await screen.findByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('is on the Features page only where an admin switched it on', async () => {
    mock.onGet('/api/pos-connection').reply(200, { data: null })
    const props = {
      off: [],
      mainLocale: 'en',
      secondLocale: 'ar',
      defaultLocale: 'en',
      ordering: makeSessionUser().restaurant!.ordering,
      onOpenPackage: () => {},
      onOpenTables: () => {},
      onOpenRestaurant: () => {},
      onOpenDishes: () => {},
    }
    const { unmount } = renderWithProviders(
      <FeaturesPage {...props} plan={{ ...FULL_PLAN, pos_connection: false }} />,
    )
    expect(screen.queryByRole('region', { name: 'Connect to POS' })).not.toBeInTheDocument()
    unmount()

    renderWithProviders(<FeaturesPage {...props} plan={FULL_PLAN} />)
    expect(await screen.findByRole('region', { name: 'Connect to POS' })).toBeInTheDocument()
  })

  describe('sending orders to the POS', () => {
    it('switches sending on at once and keeps what the server answered', async () => {
      mock.onGet('/api/pos-connection').reply(200, { data: linked() })
      mock.onPatch('/api/pos-connection').reply(200, { data: linked({ sends_orders: true }) })
      const user = userEvent.setup()
      renderWithProviders(<PosConnectionCard />)

      const toggle = await screen.findByRole('switch', {
        name: 'Send orders placed in your menu to your POS',
      })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByText(/reaches the guest's tracking page/)).toBeInTheDocument()

      await user.click(toggle)

      expect(toggle).toHaveAttribute('aria-checked', 'true')
      await waitFor(() => expect(mock.history.patch).toHaveLength(1))
      expect(JSON.parse(mock.history.patch[0]!.data as string)).toEqual({ sends_orders: true })
      expect(await screen.findByText('Orders now go to your POS')).toBeInTheDocument()
    })

    it('puts the switch back when the server refuses', async () => {
      mock.onGet('/api/pos-connection').reply(200, { data: linked({ sends_orders: true }) })
      mock.onPatch('/api/pos-connection').reply(500, { message: 'Server error.' })
      const user = userEvent.setup()
      renderWithProviders(<PosConnectionCard />)

      const toggle = await screen.findByRole('switch', {
        name: 'Send orders placed in your menu to your POS',
      })
      await user.click(toggle)

      expect(await screen.findByText('Could not change where orders go')).toBeInTheDocument()
      await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    })

    it('says orders come on WhatsApp and leads to the ordering setting while none are placed in the menu', async () => {
      mock
        .onGet('/api/pos-connection')
        .reply(200, { data: linked({ sends_orders: true, orders_in_menu: false }) })
      const scroll = vi.fn()
      const row = document.createElement('li')
      row.dataset.feature = 'orders'
      row.scrollIntoView = scroll
      document.body.append(row)
      const user = userEvent.setup()
      renderWithProviders(<PosConnectionCard />)

      const toggle = await screen.findByRole('switch', {
        name: 'Send orders placed in your menu to your POS',
      })
      expect(toggle).toBeDisabled()
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByText(/send their orders on WhatsApp/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Change how guests send orders' }))

      expect(scroll).toHaveBeenCalled()
      row.remove()
    })

    it('does nothing when the ordering setting is not on the page', async () => {
      mock.onGet('/api/pos-connection').reply(200, { data: linked({ orders_in_menu: false }) })
      const user = userEvent.setup()
      renderWithProviders(<PosConnectionCard />)

      await user.click(await screen.findByRole('button', { name: 'Change how guests send orders' }))

      expect(
        screen.getByRole('switch', { name: 'Send orders placed in your menu to your POS' }),
      ).toBeDisabled()
    })
  })
})
