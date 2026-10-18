import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { renderWithProviders } from '@/test/render-with-providers'
import { EMPTY_PLAN, FULL_PLAN } from '@/test/factories/session'
import { usePreferencesStore } from '@/stores/preferences.store'
import { useUiStore } from '@/stores/ui.store'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import type { NavItem } from '@/app/layouts/authenticated/nav-items'

const NONE_HIDDEN: string[] = []

function Harness({
  hasTemplate = true,
  full = true,
  hidden = NONE_HIDDEN,
  onLogout = vi.fn(),
  initialKey = 'overview',
  publicUrl = 'https://qayema.test/beit-qayema',
  counts,
  impersonation = null,
}: {
  hasTemplate?: boolean
  /** Every plan flag on, or every one off (the Free package). */
  full?: boolean
  hidden?: string[]
  onLogout?: () => void
  initialKey?: string
  publicUrl?: string | null
  counts?: Partial<Record<string, number>>
  impersonation?: { admin: string | null; leave_url: string } | null
}) {
  const [activeKey, setActiveKey] = useState(initialKey)
  // The document direction is owned by the preferences store now, so the
  // harness drives it the same way the app does.
  const locale = usePreferencesStore((state) => state.locale)
  const setLocale = usePreferencesStore((state) => state.setLocale)

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: 'Dany', login: 'owner@example.com' }}
      packageName="Free"
      packageTier="bronze"
      publicUrl={publicUrl}
      hasTemplate={hasTemplate}
      plan={full ? FULL_PLAN : EMPTY_PLAN}
      switchedOff={hidden}
      counts={counts}
      locale={locale}
      onLocaleChange={setLocale}
      onLogout={onLogout}
      impersonation={impersonation}
    >
      <p>Page content</p>
    </AuthenticatedLayout>
  )
}

let mock: MockAdapter

describe('AuthenticatedLayout', () => {
  afterEach(() => mock.restore())

  beforeEach(() => {
    mock = new MockAdapter(api)
    useUiStore.setState({ sidebarCollapsed: false })
    usePreferencesStore.getState().setTheme('light')
    usePreferencesStore.getState().setLocale('en')
  })

  it('renders the sidebar, the topbar and the page', () => {
    renderWithProviders(<Harness />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    for (const label of [
      'Overview',
      'Categories',
      'Dishes',
      'Design',
      'Appearance',
      'QR code',
      'Package',
      'Restaurant',
    ]) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Free package/ })).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('moves the active item and the page title when a section is picked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    const overview = within(nav).getByRole('button', { name: 'Overview' })
    expect(overview).toHaveAttribute('aria-current', 'page')

    await user.click(within(nav).getByRole('button', { name: 'Design' }))

    expect(within(nav).getByRole('button', { name: 'Design' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(overview).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { name: 'Design' })).toBeInTheDocument()
  })

  it('locks the sections that need a template', () => {
    renderWithProviders(<Harness hasTemplate={false} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).getByRole('button', { name: 'Categories' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Dishes' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'QR code' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Appearance' })).toBeDisabled()
    // Design is how an owner escapes the locked state, so it stays open.
    expect(within(nav).getByRole('button', { name: 'Design' })).toBeEnabled()
  })

  it('leaves out every section the package does not include, with its heading', () => {
    renderWithProviders(<Harness full={false} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    for (const name of ['Analytics', 'Orders', 'Table orders', 'Tables', 'Appearance']) {
      expect(within(nav).queryByRole('button', { name: new RegExp(`^${name}`) })).toBeNull()
    }
    // The Orders group has nothing left, so its heading goes too.
    expect(within(nav).queryByText('Orders')).not.toBeInTheDocument()
    // What every package has stays, the plain QR code included.
    for (const name of ['Overview', 'Dishes', 'Design', 'QR code', 'Package']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('leaves a design-locked section out too when the package lacks it', () => {
    renderWithProviders(<Harness hasTemplate={false} full={false} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByRole('button', { name: 'Appearance' })).toBeNull()
    expect(within(nav).getByRole('button', { name: 'Dishes' })).toBeDisabled()
  })

  it('collapses the sidebar to an icon rail and remembers it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(useUiStore.getState().sidebarCollapsed).toBe(true)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('switches the whole document to Arabic and back', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    expect(document.documentElement).toHaveAttribute('dir', 'ltr')

    // Language lives in the account menu, not the top bar.
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('tab', { name: 'ع' }))

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('dir', 'rtl')
      expect(document.documentElement).toHaveAttribute('lang', 'ar')
    })

    await user.click(screen.getByRole('tab', { name: 'EN' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'ltr'))
  })

  it('toggles dark mode on the document', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('switch', { name: 'Dark mode' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(usePreferencesStore.getState().theme).toBe('dark')

    await user.click(screen.getByRole('switch', { name: 'Dark mode' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('opens the user menu and logs out', async () => {
    const onLogout = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<Harness onLogout={onLogout} />)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))

    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('owner@example.com')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /View public menu/ })).toHaveAttribute(
      'href',
      'https://qayema.test/beit-qayema',
    )

    await user.click(within(menu).getByRole('menuitem', { name: /Log out/ }))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('keeps only the package and the account in the top bar', () => {
    renderWithProviders(<Harness />)

    expect(screen.getByRole('button', { name: /Free package/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    // Closed menu: no language tabs or theme switch on the bar itself.
    expect(screen.queryByRole('tab', { name: 'ع' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Dark mode' })).not.toBeInTheDocument()
  })

  it('keeps the account out of the sidebar and in the avatar menu', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByRole('button', { name: 'Account' })).not.toBeInTheDocument()
    for (const heading of ['Menu', 'Look', 'Sharing', 'Settings']) {
      expect(within(nav).getByText(heading)).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Account/ }))

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })

  it('puts the pages opened all day first and setup last', () => {
    renderWithProviders(<Harness />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    const items = [
      'Overview',
      'Analytics',
      'Orders',
      'Table orders',
      'Categories',
      'Dishes',
      'Design',
      'Appearance',
      'QR code',
      'Tables',
      'Social links',
      'Restaurant',
      'Features',
      'Package',
    ].map((name) => within(nav).getByRole('button', { name: new RegExp(`^${name}`) }))

    items.slice(1).forEach((item, index) => {
      // Each one comes after the one before it in the sidebar.
      expect(
        items[index]!.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })
  })

  it('drops the Orders heading when both kinds of order are switched off', () => {
    renderWithProviders(<Harness hidden={['orders', 'dine_in']} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByText('Orders')).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: /Table orders/ })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: /Tables/ })).not.toBeInTheDocument()
  })

  it('shows an admin viewing as the owner the way back to the admin', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const user = userEvent.setup()
    renderWithProviders(
      <Harness
        impersonation={{ admin: 'Dani', leave_url: 'http://localhost:8000/impersonate/leave' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/signed in as Dani/)
    await user.click(screen.getByRole('button', { name: 'Back to admin' }))

    expect(assign).toHaveBeenCalledWith('http://localhost:8000/impersonate/leave')
    vi.unstubAllGlobals()
  })

  it('names only the owner when the admin is not named', () => {
    renderWithProviders(
      <Harness
        impersonation={{ admin: null, leave_url: 'http://localhost:8000/impersonate/leave' }}
      />,
    )

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent("You are viewing Dany's dashboard from the admin.")
    expect(banner).not.toHaveTextContent(/signed in as/)
    expect(screen.getByRole('button', { name: 'Back to admin' })).toBeInTheDocument()
  })

  it('shows no banner to the owner themself', () => {
    renderWithProviders(<Harness />)

    expect(screen.queryByRole('button', { name: 'Back to admin' })).not.toBeInTheDocument()
  })

  it('leaves switched-off sections out of the sidebar', () => {
    renderWithProviders(<Harness hidden={['orders', 'analytics', 'qr']} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: 'Analytics' })).not.toBeInTheDocument()
    // The QR studio switched off still leaves the plain QR code page.
    expect(within(nav).getByRole('button', { name: 'QR code' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Features' })).toBeInTheDocument()
  })

  it('shows how many orders are waiting beside Orders, and nothing at none', () => {
    const { rerender } = renderWithProviders(<Harness counts={{ orders: 3 }} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).getByLabelText('3 orders waiting')).toHaveTextContent('3')

    rerender(<Harness counts={{ orders: 0 }} />)
    expect(within(nav).queryByLabelText(/orders waiting/)).not.toBeInTheDocument()
  })

  it('never hides a core section, whatever the list says', () => {
    renderWithProviders(<Harness hidden={['overview', 'dishes', 'features']} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    for (const name of ['Overview', 'Dishes', 'Features']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument()
    }
  })

  describe('on a phone', () => {
    const tabs = () => screen.getByRole('navigation', { name: 'Sections' })

    it('has four tabs at the bottom: Home, Menu, Orders and More', () => {
      renderWithProviders(<Harness />)

      expect(
        within(tabs())
          .getAllByRole('button')
          .map((tab) => tab.textContent),
      ).toEqual(['Home', 'Menu', 'Orders', 'More'])
      expect(within(tabs()).getByRole('button', { name: 'Home' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })

    it('puts the analytics in the third tab for a restaurant without orders, and the QR code without either', () => {
      const { unmount } = renderWithProviders(<Harness hidden={['orders', 'dine_in']} />)
      expect(within(tabs()).getByRole('button', { name: 'Analytics' })).toBeInTheDocument()
      unmount()

      renderWithProviders(<Harness full={false} />)
      expect(within(tabs()).getByRole('button', { name: 'QR code' })).toBeInTheDocument()
    })

    it('opens a tab, and lights Menu up for categories as well as dishes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Harness initialKey="categories" />)

      expect(within(tabs()).getByRole('button', { name: 'Menu' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await user.click(within(tabs()).getByRole('button', { name: 'Orders' }))
      expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    })

    it('counts the orders waiting on the Orders tab, table orders included', () => {
      renderWithProviders(<Harness counts={{ orders: 2, 'table-orders': 1 }} />)

      expect(
        within(tabs()).getByRole('button', { name: /^Orders\s*3 orders waiting$/ }),
      ).toHaveTextContent('3')
      expect(within(tabs()).getByLabelText('3 orders waiting')).toBeInTheDocument()
    })

    it('shows the way back to More on a section opened from it, and none on a tab', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Harness initialKey="design" />)

      expect(within(tabs()).getByRole('button', { name: 'More' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await user.click(screen.getByRole('button', { name: 'Back' }))
      expect(screen.getByRole('heading', { name: 'More' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    })
  })

  it('opens the package page from the package pill', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: /Free package/ }))

    expect(screen.getByRole('heading', { name: 'Package' })).toBeInTheDocument()
  })

  it('keeps the page name and the menu address out of the topbar', () => {
    renderWithProviders(<Harness />)

    expect(screen.queryByRole('link', { name: 'qayema.test/beit-qayema' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveClass('sr-only')
  })

  it('falls back to "Dashboard" for a page that is not a section, and no address', () => {
    renderWithProviders(<Harness initialKey="nowhere" publicUrl={null} />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /qayema\.test/ })).not.toBeInTheDocument()
  })
})
