import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { renderWithProviders } from '@/test/render-with-providers'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { FULL_PLAN, makeSessionUser } from '@/test/factories/session'
import { FeaturesPage, type FeaturesPageProps } from '@/features/restaurant/pages/features-page'

let mock: MockAdapter

const ALL = FULL_PLAN

/** How orders come in, as the session sends it: table orders on the dashboard. */
const ORDERING = makeSessionUser().restaurant!.ordering

/** A tab of one choice: delivery and pickup's, or the table's. */
function tabOf(group: string, name: string) {
  return within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name })
}

/** How delivery and pickup come in (the table's choice has a WhatsApp too). */
function orderTab(name: string) {
  return tabOf('How guests send orders', name)
}

function page(props: Partial<FeaturesPageProps> = {}) {
  return (
    <FeaturesPage
      off={[]}
      plan={ALL}
      mainLocale="en"
      secondLocale="ar"
      defaultLocale="en"
      ordering={ORDERING}
      onOpenPackage={() => {}}
      onOpenTables={() => {}}
      onOpenRestaurant={() => {}}
      onOpenDishes={() => {}}
      {...props}
    />
  )
}

/** The page as the app mounts it: everything read from the session cache. */
function FromSession() {
  const restaurant = useSession().data?.restaurant
  if (!restaurant) return null
  return (
    <FeaturesPage
      off={restaurant.switched_off}
      plan={restaurant.plan}
      mainLocale={restaurant.main_locale}
      secondLocale={restaurant.second_locale}
      defaultLocale={restaurant.default_locale}
      ordering={restaurant.ordering}
      onOpenPackage={() => {}}
      onOpenTables={() => {}}
      onOpenRestaurant={() => {}}
      onOpenDishes={() => {}}
    />
  )
}

/** The languages as `/api/menu-languages` answers, nothing left to write unless said. */
function languages(data: {
  languages: string[]
  main_locale?: string
  second_locale: string | null
  default_locale: string
  missing?: { categories: number; dishes: number }
}) {
  return {
    data: {
      main_locale: data.languages[0],
      missing: { categories: 0, dishes: 0 },
      ...data,
    },
  }
}

/** A reply the test lets go of when it is ready, to look at the in-between state. */
function held() {
  let release: (value: [number, unknown]) => void = () => {}
  const reply = () =>
    new Promise<[number, unknown]>((resolve) => {
      release = resolve
    })
  return { reply, release: (value: [number, unknown]) => release(value) }
}

describe('FeaturesPage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock
      .onGet('/api/menu-languages')
      .reply(200, languages({ languages: ['en', 'ar'], second_locale: 'ar', default_locale: 'en' }))
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('groups related features in sections, each feature a switch', () => {
    renderWithProviders(page({ off: ['orders'] }))

    const section = (title: string) => screen.getByRole('region', { name: title })
    const switchesIn = (title: string) =>
      within(section(title))
        .getAllByRole('switch')
        .map((element) => element.getAttribute('aria-label'))

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Orders', 'Dishes', 'Menu languages', 'QR code and analytics', 'Connect to POS'])
    expect(switchesIn('Orders')).toEqual(['Delivery and pickup on', 'Ordering at the table on'])
    expect(switchesIn('Dishes')).toEqual(['Variants on', 'Add-ons on'])
    expect(switchesIn('QR code and analytics')).toEqual(['QR Studio on', 'Analytics on'])
    // The main language and the second one, together.
    expect(switchesIn('Menu languages')).toEqual(['Second language on'])
    expect(
      within(section('Menu languages')).getByRole('combobox', { name: 'Your menu is written in' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Delivery and pickup on' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Analytics on' })).toBeChecked()
  })

  it('saves the whole list when a feature is switched off', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: ['orders', 'analytics'] } })
    const user = userEvent.setup()
    renderWithProviders(page({ off: ['orders'] }))

    await user.click(screen.getByRole('switch', { name: 'Analytics on' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({
      off: ['orders', 'analytics'],
    })
  })

  it('says what switching orders and the QR studio off means', () => {
    renderWithProviders(page({ off: ['orders', 'qr'] }))

    expect(screen.getByText(/Guests can't order for delivery or pickup/)).toBeInTheDocument()
    expect(screen.getByText(/plain QR code/)).toBeInTheDocument()
  })

  it('hides the language choice while multiple languages are off', () => {
    renderWithProviders(page({ off: ['languages'] }))

    expect(screen.queryByRole('combobox', { name: /Which language/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Your menu shows only its main language/)).toBeInTheDocument()
  })

  it('marks a feature the package does not include', () => {
    renderWithProviders(page({ plan: { ...ALL, qr_studio: false } }))

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
  })

  it('shows a feature the package lacks with where it comes from, not a switch', () => {
    // The owner never switched QR Studio off; without the package there is
    // nothing to switch, and nothing is sent until the package includes it.
    renderWithProviders(page({ plan: { ...ALL, qr_studio: false } }))

    expect(screen.queryByRole('switch', { name: 'QR Studio on' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Not on your package. See packages' }),
    ).toHaveTextContent('Not on your package')
    // Its "while this is off" warning is about switching it off yourself.
    expect(screen.queryByText(/QR code goes back to plain/)).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Delivery and pickup on' })).toBeEnabled()
  })

  it('names the package each missing feature comes with', async () => {
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free' },
    })
    renderWithProviders(page({ plan: { ...ALL, ordering: false, analytics: false } }))

    // Analytics, missing whole, names the first package that has it.
    expect(await screen.findByText('Available on Pro')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Available on Pro. See packages' }),
    ).toBeInTheDocument()
    // A way of ordering the package lacks is left out, not offered locked.
    expect(
      screen.queryByRole('tablist', { name: 'How guests send orders' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Available on Premium. See packages' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Not on your package')).not.toBeInTheDocument()
  })

  it('says a feature Qayema turned off is turned off, with no way to a package', async () => {
    const plan = { ...ALL, analytics: false }
    mock.onGet('/api/user').reply(200, {
      data: makeSessionUser({ plan, turned_off: ['analytics'] }),
    })
    renderWithProviders(page({ plan }))

    expect(await screen.findByText('Turned off by Qayema.')).toBeInTheDocument()
    expect(screen.getByText(/Contact us if you need it back/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /See packages/ })).not.toBeInTheDocument()
  })

  it('hides the language pickers when the package has no second language', () => {
    renderWithProviders(page({ plan: { ...ALL, multiple_languages: false } }))

    expect(screen.getByText('Not on your package')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Which language/ })).not.toBeInTheDocument()
  })

  it('switches a feature back on by taking it off the list', async () => {
    mock.onPut('/api/features').reply(200, { data: { off: [] } })
    const user = userEvent.setup()
    renderWithProviders(page({ off: ['orders'] }))

    await user.click(screen.getByRole('switch', { name: 'Delivery and pickup on' }))

    await waitFor(() => expect(mock.history.put).toHaveLength(1))
    expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ off: [] })
  })

  it('moves the switch at once and keeps what the server saved', async () => {
    // The session reloads after a save, so it answers with what was saved.
    let saved: string[] = []
    mock.onGet('/api/user').reply(() => [200, { data: makeSessionUser({ switched_off: saved }) }])
    const answer = held()
    mock.onPut('/api/features').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('switch', { name: 'Analytics on' }))

    // Optimistic: off before the server has answered.
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()

    saved = ['analytics', 'qr']
    answer.release([200, { data: { off: saved } }])
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'QR Studio on' })).not.toBeChecked(),
    )
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()
  })

  it('snaps the switch back and says why when the save fails', async () => {
    mock.onGet('/api/user').reply(200, { data: makeSessionUser({ switched_off: [] }) })
    const answer = held()
    mock.onPut('/api/features').reply(answer.reply)
    const user = userEvent.setup()
    renderWithProviders(<FromSession />)

    await user.click(await screen.findByRole('switch', { name: 'Analytics on' }))
    expect(screen.getByRole('switch', { name: 'Analytics on' })).not.toBeChecked()

    answer.release([500, { message: 'Server down', code: 'server_error' }])

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Analytics on' })).toBeChecked())
    expect(await screen.findByText('Could not update your features')).toBeInTheDocument()
  })

  it('has no choice to make while orders are off', () => {
    renderWithProviders(page({ off: ['orders'] }))

    expect(
      screen.queryByRole('tablist', { name: 'How guests send orders' }),
    ).not.toBeInTheDocument()
  })

  describe('ordering at the table', () => {
    it('is a feature of its own, switched off like any other', async () => {
      mock.onPut('/api/features').reply(200, { data: { off: ['dine_in'] } })
      const user = userEvent.setup()
      renderWithProviders(page())

      await user.click(screen.getByRole('switch', { name: 'Ordering at the table on' }))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ off: ['dine_in'] })
    })

    it('opens the Tables page while it is on', async () => {
      const onOpenTables = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(page({ onOpenTables }))

      await user.click(screen.getByRole('button', { name: 'Set up your tables' }))

      expect(onOpenTables).toHaveBeenCalledOnce()
    })

    it('says what switching it off means', () => {
      renderWithProviders(page({ off: ['dine_in'] }))

      expect(screen.getByText(/but can't order/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Set up your tables' })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('tablist', { name: 'Where table orders go' }),
      ).not.toBeInTheDocument()
    })

    it('sends table orders to WhatsApp, apart from delivery and pickup', async () => {
      mock.onGet('/api/user').reply(200, {
        data: makeSessionUser({ ordering: { ...ORDERING, mode: 'menu' } }),
      })
      mock.onPut('/api/features/dine-in').reply(200, { data: { dine_in: 'whatsapp' } })
      const user = userEvent.setup()
      renderWithProviders(<FromSession />)

      expect(await screen.findByText(/They appear on your Table orders page/)).toBeInTheDocument()
      await user.click(tabOf('Where table orders go', 'WhatsApp'))

      await waitFor(() => expect(mock.history.put).toHaveLength(1))
      expect(mock.history.put[0]!.url).toBe('/api/features/dine-in')
      expect(JSON.parse(mock.history.put[0]!.data as string)).toEqual({ mode: 'whatsapp' })
      expect(tabOf('Where table orders go', 'WhatsApp')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText(/with the table's name/)).toBeInTheDocument()
      // Delivery and pickup keep their own way in.
      expect(orderTab('Dashboard')).toHaveAttribute('aria-selected', 'true')
    })
  })
})
