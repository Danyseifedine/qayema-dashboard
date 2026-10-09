import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { AuthUser } from '@/features/auth'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { safeRedirect } from '@/lib/security/safe-redirect'
import { usePreferencesStore } from '@/stores/preferences.store'
import { useUiStore } from '@/stores/ui.store'
import { PACKAGE_CATALOGUE } from '@/test/factories/packages'
import { EMPTY_PLAN, makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'

vi.mock('@/lib/security/safe-redirect', () => ({ safeRedirect: vi.fn(() => true) }))

/**
 * The pages have their own tests; here each is a stand-in: a region named
 * after the page that shows the props App gave it (functions left out) and a
 * button per callback, named after the prop. So the tests are about App's
 * routing, locks and hand-overs rather than about every page's requests.
 */
const { stubPage } = vi.hoisted(() => ({
  stubPage: (name: string) =>
    function StubPage(props: Record<string, unknown>) {
      const data = Object.fromEntries(
        Object.entries(props).filter(([, value]) => typeof value !== 'function'),
      )
      const callbacks = Object.entries(props).filter(
        (entry): entry is [string, (key?: string) => void] => typeof entry[1] === 'function',
      )

      return (
        <section aria-label={`${name} page`}>
          <pre data-testid="props">{JSON.stringify(data)}</pre>
          {callbacks.map(([prop, callback]) => (
            <button
              key={prop}
              type="button"
              // The overview's `onOpen` takes the key of the page to open.
              onClick={() => callback(prop === 'onOpen' ? 'overview' : undefined)}
            >
              {prop}
            </button>
          ))}
        </section>
      )
    },
}))

vi.mock('@/features/menu', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/menu')>()),
  CategoriesPage: stubPage('categories'),
  DishesPage: stubPage('dishes'),
}))
vi.mock('@/features/orders', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/orders')>()),
  OrdersPage: stubPage('orders'),
  TableOrdersPage: stubPage('table-orders'),
}))
vi.mock('@/features/tables', () => ({
  TablesPage: stubPage('tables'),
}))
vi.mock('@/features/analytics', () => ({
  AnalyticsPage: stubPage('analytics'),
  AnalyticsTeaser: stubPage('analytics teaser'),
}))
vi.mock('@/features/overview', () => ({
  OverviewPage: stubPage('overview'),
}))
vi.mock('@/features/qr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/qr')>()),
  QrPage: stubPage('qr'),
}))
vi.mock('@/features/package', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/package')>()),
  PackagePage: stubPage('package'),
}))
vi.mock('@/features/social-links', () => ({
  SocialLinksPage: stubPage('social-links'),
}))
vi.mock('@/features/account', () => ({
  AccountPage: stubPage('account'),
}))
vi.mock('@/features/restaurant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/restaurant')>()),
  FeaturesPage: stubPage('features'),
  RestaurantPage: stubPage('restaurant'),
}))
vi.mock('@/features/appearance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/appearance')>()),
  AppearancePage: stubPage('appearance'),
}))
vi.mock('@/features/design', () => ({
  DesignPage: stubPage('design'),
}))

type Restaurant = NonNullable<AuthUser['restaurant']>

let mock: MockAdapter

function signIn(restaurant: Partial<Restaurant> = {}) {
  mock.onGet('/api/user').reply(200, { data: makeSessionUser(restaurant) })
}

function openAt(path: string) {
  window.history.replaceState(null, '', path)
}

/** The stand-in for a page, once the session has loaded. */
// Pages load on demand (lazy), and the first one a file opens pays for the
// import: past Testing Library's 1s default when coverage is being measured.
const page = (name: string) =>
  screen.findByRole('region', { name: `${name} page` }, { timeout: 4000 })

/** The props App passed to the page on screen. */
async function propsOf(name: string): Promise<Record<string, unknown>> {
  const region = await page(name)
  return JSON.parse(within(region).getByTestId('props').textContent ?? '{}') as Record<
    string,
    unknown
  >
}

const sidebar = () => screen.getAllByRole('navigation', { name: 'Dashboard' })[0]!

describe('App', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/packages').reply(200, {
      data: PACKAGE_CATALOGUE,
      meta: { current: 'free', ends_at: null },
    })
    openAt('/')
    useUiStore.setState({ sidebarCollapsed: false, mobileNavOpen: false })
    usePreferencesStore.getState().setLocale('en')
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    vi.mocked(safeRedirect).mockClear()
    vi.restoreAllMocks()
    usePreferencesStore.getState().setLocale('en')
    openAt('/')
  })

  it('checks the session before showing anything', async () => {
    signIn()
    renderWithProviders(<App />)

    expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
    expect(await page('overview')).toBeInTheDocument()
  })

  it('lands on the overview with a design chosen, and writes it into the URL', async () => {
    signIn({
      limits: {
        dishes: { used: 3, limit: 40 },
        categories: { used: 1, limit: 8 },
        social_links: { used: 0, limit: 1 },
      },
    })
    renderWithProviders(<App />)

    const props = await propsOf('overview')
    expect(props).toMatchObject({ limits: { dishes: { used: 3, limit: 40 } }, switchedOff: [] })
    expect(window.location.pathname).toBe('/overview')
    expect(screen.getByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument()
  })

  it('lands on Design without one, since that is the way out of the lock', async () => {
    signIn({ template_id: null })
    renderWithProviders(<App />)

    expect(await page('design')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/design')
  })

  it('switches page from the sidebar and from the pages themselves', async () => {
    signIn()
    const user = userEvent.setup()
    renderWithProviders(<App />)
    await page('overview')

    await user.click(within(sidebar()).getByRole('button', { name: 'Categories' }))
    expect(await page('categories')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/categories')

    await user.click(screen.getByRole('button', { name: 'onOpenDishes' }))
    expect(await page('dishes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'onOpenCategories' }))
    expect(await page('categories')).toBeInTheDocument()
  })

  it.each([
    { path: '/analytics', name: 'analytics', action: 'onOpenPackage', lands: 'package' },
    { path: '/design', name: 'design', action: 'onOpenPackage', lands: 'package' },
    { path: '/appearance', name: 'appearance' },
    { path: '/orders', name: 'orders', action: 'onOpenFeatures', lands: 'features' },
    { path: '/qr', name: 'qr', action: 'onOpenFeatures', lands: 'features' },
    { path: '/qr', name: 'qr', action: 'onOpenPackage', lands: 'package' },
    { path: '/social-links', name: 'social-links' },
    { path: '/features', name: 'features', action: 'onOpenPackage', lands: 'package' },
    { path: '/features', name: 'features', action: 'onOpenTables', lands: 'tables' },
    { path: '/features', name: 'features', action: 'onOpenDishes', lands: 'dishes' },
    { path: '/table-orders', name: 'table-orders', action: 'onOpenTables', lands: 'tables' },
    { path: '/tables', name: 'tables', action: 'onOpenFeatures', lands: 'features' },
    { path: '/restaurant', name: 'restaurant' },
    { path: '/account', name: 'account', action: 'onOpenRestaurant', lands: 'restaurant' },
    { path: '/overview', name: 'overview', action: 'onOpen', lands: 'overview' },
  ])('opens $path from its URL and wires $action', async ({ path, name, action, lands }) => {
    signIn()
    openAt(path)
    const user = userEvent.setup()
    renderWithProviders(<App />)

    expect(await page(name)).toBeInTheDocument()
    if (action && lands) {
      await user.click(screen.getByRole('button', { name: action }))
      expect(await page(lands)).toBeInTheDocument()
      expect(window.location.pathname).toBe(`/${lands}`)
    }
  })

  it('passes the analytics page whether the advanced numbers are on', async () => {
    signIn({ plan: { ...EMPTY_PLAN, analytics: true } })
    openAt('/analytics')
    renderWithProviders(<App />)

    expect(await propsOf('analytics')).toMatchObject({ locale: 'en', advanced: false })
  })

  it("hands the features page the restaurant's switches and languages", async () => {
    signIn({
      switched_off: ['qr'],
      second_locale: 'fr',
      default_locale: 'fr',
      languages: ['en', 'fr'],
    })
    openAt('/features')
    renderWithProviders(<App />)

    expect(await propsOf('features')).toMatchObject({
      off: ['qr'],
      secondLocale: 'fr',
      defaultLocale: 'fr',
      ordering: { mode: 'whatsapp', types: ['delivery', 'pickup'] },
    })
  })

  describe('content language', () => {
    it("shows menu text in the dashboard's language when the menu has it", async () => {
      usePreferencesStore.getState().setLocale('ar')
      signIn({ languages: ['en', 'ar'] })
      openAt('/categories')
      renderWithProviders(<App />)

      expect(await propsOf('categories')).toMatchObject({ locale: 'ar' })
    })

    it('falls back to English when the menu is not written in it', async () => {
      usePreferencesStore.getState().setLocale('ar')
      signIn({ languages: ['en', 'fr'], second_locale: 'fr' })
      openAt('/dishes')
      renderWithProviders(<App />)

      expect(await propsOf('dishes')).toMatchObject({ locale: 'en' })
    })
  })

  describe('locks', () => {
    it('shows the design lock on a section that needs one, with the way out', async () => {
      signIn({ template_id: null })
      openAt('/categories')
      const user = userEvent.setup()
      renderWithProviders(<App />)

      expect(await screen.findByText('Choose a menu design first')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'categories page' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Browse designs' }))
      expect(await page('design')).toBeInTheDocument()
      expect(window.location.pathname).toBe('/design')
    })

    it("prefers the design lock over the package's", async () => {
      signIn({ template_id: null, plan: EMPTY_PLAN })
      openAt('/appearance')
      renderWithProviders(<App />)

      expect(await screen.findByText('Choose a menu design first')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'See packages' })).not.toBeInTheDocument()
    })

    it('opens a section the package lacks on what it would give, with the teaser for analytics', async () => {
      signIn({ plan: EMPTY_PLAN })
      openAt('/analytics')
      const user = userEvent.setup()
      renderWithProviders(<App />)

      expect(await screen.findByText('See how guests use your menu')).toBeInTheDocument()
      expect(await page('analytics teaser')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'analytics page' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'See packages' }))
      expect(await page('package')).toBeInTheDocument()
      expect(window.location.pathname).toBe('/package')
    })

    it('shows no teaser on another locked section', async () => {
      signIn({ plan: EMPTY_PLAN })
      openAt('/orders')
      renderWithProviders(<App />)

      expect(await screen.findByRole('button', { name: 'See packages' })).toBeInTheDocument()
      expect(
        screen.queryByRole('region', { name: 'analytics teaser page' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'orders page' })).not.toBeInTheDocument()
    })
  })

  it('hands a switched-off section over to the overview, replacing the history entry', async () => {
    signIn({ switched_off: ['orders'] })
    openAt('/orders')
    const replace = vi.spyOn(window.history, 'replaceState')
    const push = vi.spyOn(window.history, 'pushState')
    renderWithProviders(<App />)

    expect(await page('overview')).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/overview'))
    expect(replace).toHaveBeenCalledWith(null, '', '/overview')
    expect(push).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'orders page' })).not.toBeInTheDocument()
  })

  describe('package pill', () => {
    it('warns in the last week of the package', async () => {
      signIn({
        package: {
          slug: 'pro',
          name: { en: 'Pro', ar: 'برو' },
          is_contact_only: false,
          ends_at: '2026-10-05T00:00:00Z',
          days_left: 7,
        },
      })
      renderWithProviders(<App />)

      expect(
        await screen.findByRole('button', { name: 'Pro package, ending soon. Open your package.' }),
      ).toBeInTheDocument()
    })

    it('stays quiet with more than a week left, or no end', async () => {
      signIn({
        package: {
          slug: 'pro',
          name: { en: 'Pro', ar: null },
          is_contact_only: false,
          ends_at: '2026-12-01T00:00:00Z',
          days_left: 8,
        },
      })
      const { unmount } = renderWithProviders(<App />)
      expect(
        await screen.findByRole('button', { name: 'Pro package. Open your package.' }),
      ).toBeInTheDocument()
      unmount()

      mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
      renderWithProviders(<App />)
      expect(
        await screen.findByRole('button', { name: 'Free package. Open your package.' }),
      ).toBeInTheDocument()
    })

    it('names the package in the dashboard language', async () => {
      usePreferencesStore.getState().setLocale('ar')
      signIn({
        package: {
          slug: 'pro',
          name: { en: 'Pro', ar: 'برو' },
          is_contact_only: false,
          ends_at: null,
          days_left: null,
        },
      })
      renderWithProviders(<App />)

      expect(await screen.findByText('برو')).toBeInTheDocument()
    })

    it('falls back to the slug, then to "Free", for a package with no name', async () => {
      const unnamed = (slug: string | null) => ({
        package: {
          slug,
          name: { en: null, ar: null },
          is_contact_only: false,
          starts_at: null,
          ends_at: null,
          days_left: null,
        },
      })
      signIn(unnamed('custom'))
      const { unmount } = renderWithProviders(<App />)
      expect(
        await screen.findByRole('button', { name: 'custom package. Open your package.' }),
      ).toBeInTheDocument()
      unmount()

      mock.onGet('/api/user').reply(200, { data: makeSessionUser(unnamed(null)) })
      renderWithProviders(<App />)
      expect(
        await screen.findByRole('button', { name: 'Free package. Open your package.' }),
      ).toBeInTheDocument()
    })
  })

  describe('the account menu', () => {
    it('shows how the owner signs in: their email', async () => {
      signIn()
      const user = userEvent.setup()
      renderWithProviders(<App />)
      await page('overview')

      await user.click(screen.getByRole('button', { name: 'Account menu' }))

      expect(within(screen.getByRole('menu')).getByText('owner@example.com')).toBeInTheDocument()
    })

    it('shows the username of an account made without an email', async () => {
      mock.onGet('/api/user').reply(200, {
        data: { ...makeSessionUser(), email: null, username: 'beit-qayema' },
      })
      const user = userEvent.setup()
      renderWithProviders(<App />)
      await page('overview')

      await user.click(screen.getByRole('button', { name: 'Account menu' }))

      expect(within(screen.getByRole('menu')).getByText('beit-qayema')).toBeInTheDocument()
    })
  })

  it('follows the interface language picked in the account menu', async () => {
    signIn()
    const user = userEvent.setup()
    renderWithProviders(<App />)
    await page('overview')

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('tab', { name: 'ع' }))

    expect(usePreferencesStore.getState().locale).toBe('ar')
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
  })

  describe('logging out', () => {
    it('leaves for the login page once the server ends the session', async () => {
      signIn()
      mock.onPost('/api/logout').reply(204)
      const user = userEvent.setup()
      renderWithProviders(<App />)
      await page('overview')

      await user.click(screen.getByRole('button', { name: 'Account menu' }))
      await user.click(screen.getByRole('menuitem', { name: /Log out/ }))

      await waitFor(() =>
        expect(safeRedirect).toHaveBeenCalledWith('https://qayema.test/get-started'),
      )
      expect(screen.queryByText('Could not log out')).not.toBeInTheDocument()
    })

    it('says so, and stays, when it fails', async () => {
      signIn()
      mock.onPost('/api/logout').reply(500, { message: 'The server is busy.' })
      const user = userEvent.setup()
      renderWithProviders(<App />)
      await page('overview')

      await user.click(screen.getByRole('button', { name: 'Account menu' }))
      await user.click(screen.getByRole('menuitem', { name: /Log out/ }))

      expect(await screen.findByText('Could not log out')).toBeInTheDocument()
      expect(screen.getByText('The server is busy.')).toBeInTheDocument()
      expect(safeRedirect).not.toHaveBeenCalled()
      expect(await page('overview')).toBeInTheDocument()
    })
  })
})
