import { cleanup, screen, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { makeSessionUser } from '@/test/factories/session'
import { renderWithProviders } from '@/test/render-with-providers'

/**
 * Loading the other pages ahead, in a file of its own: a page module that
 * fails to load has to fail on the first request for it, and App.test.tsx
 * opens every page (so a module there is long loaded before any test could
 * make it fail).
 *
 * Each page module is a stand-in that notes it was asked for. Social links
 * fails to load, as on a network that drops mid-download.
 */
const { asked, stubPage } = vi.hoisted(() => ({
  asked: new Set<string>(),
  stubPage: (name: string) =>
    function StubPage() {
      return <section aria-label={`${name} page`} />
    },
}))

vi.mock('@/features/overview', () => {
  asked.add('overview')
  return { OverviewPage: stubPage('overview') }
})
vi.mock('@/features/analytics', () => {
  asked.add('analytics')
  return { AnalyticsPage: stubPage('analytics'), AnalyticsTeaser: stubPage('analytics teaser') }
})
vi.mock('@/features/menu', () => {
  asked.add('menu')
  return { CategoriesPage: stubPage('categories'), DishesPage: stubPage('dishes') }
})
vi.mock('@/features/qr', () => {
  asked.add('qr')
  return { QrPage: stubPage('qr') }
})
vi.mock('@/features/package', () => {
  asked.add('package')
  return { PackagePage: stubPage('package') }
})
vi.mock('@/features/social-links', () => {
  asked.add('social-links')
  throw new Error('Failed to fetch dynamically imported module')
})
vi.mock('@/features/account', () => {
  asked.add('account')
  return { AccountPage: stubPage('account') }
})
vi.mock('@/features/restaurant', () => {
  asked.add('restaurant')
  return { RestaurantPage: stubPage('restaurant'), FeaturesPage: stubPage('features') }
})
vi.mock('@/features/appearance', () => {
  asked.add('appearance')
  return { AppearancePage: stubPage('appearance') }
})
vi.mock('@/features/design', () => {
  asked.add('design')
  return { DesignPage: stubPage('design') }
})
vi.mock('@/features/tables', () => {
  asked.add('tables')
  return { TablesPage: stubPage('tables') }
})

let mock: MockAdapter

describe('App, loading the other pages ahead', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    mock.onGet('/api/user').reply(200, { data: makeSessionUser() })
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    // Unmounted while the idle stubs are still in place.
    cleanup()
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('fetches every page once the browser is idle, and survives one that fails to load', async () => {
    let idle: (() => void) | undefined
    const requestIdleCallback = vi.fn((callback: () => void) => {
      idle = callback
      return 7
    })
    const cancelIdleCallback = vi.fn()
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback)

    const { unmount } = renderWithProviders(<App />)
    expect(
      await screen.findByRole('region', { name: 'overview page' }, { timeout: 4000 }),
    ).toBeInTheDocument()

    // The page on screen (and what the shell itself imports) is fetched; the
    // rest wait for a quiet moment.
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 4000 })
    expect(asked).toContain('overview')
    expect(asked).not.toContain('social-links')
    expect(asked).not.toContain('tables')

    idle!()

    await waitFor(() =>
      expect([...asked].sort()).toEqual(
        [
          'account',
          'analytics',
          'appearance',
          'design',
          'menu',
          'overview',
          'package',
          'qr',
          'restaurant',
          'social-links',
          'tables',
        ].sort(),
      ),
    )
    // Social links failed to load, quietly: the page on screen stays.
    expect(screen.getByRole('region', { name: 'overview page' })).toBeInTheDocument()

    // Leaving the dashboard drops the idle wait.
    unmount()
    expect(cancelIdleCallback).toHaveBeenCalledWith(7)
  })
})
