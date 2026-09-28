import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '@/stores/preferences.store'
import { useUiStore } from '@/stores/ui.store'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import type { NavItem } from '@/app/layouts/authenticated/nav-items'

const NONE_HIDDEN: string[] = []

function Harness({
  hasTemplate = true,
  qrStudio = true,
  hidden = NONE_HIDDEN,
  onLogout = vi.fn(),
}: {
  hasTemplate?: boolean
  qrStudio?: boolean
  hidden?: string[]
  onLogout?: () => void
}) {
  const [activeKey, setActiveKey] = useState('overview')
  // The document direction is owned by the preferences store now, so the
  // harness drives it the same way the app does.
  const locale = usePreferencesStore((state) => state.locale)
  const setLocale = usePreferencesStore((state) => state.setLocale)

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: 'Dany', email: 'owner@example.com' }}
      packageName="Free"
      publicUrl="https://qayema.test/beit-qayema"
      hasTemplate={hasTemplate}
      plan={{ qr_studio: qrStudio, ordering: qrStudio, advanced_analytics: qrStudio }}
      switchedOff={hidden}
      locale={locale}
      onLocaleChange={setLocale}
      onLogout={onLogout}
    >
      <p>Page content</p>
    </AuthenticatedLayout>
  )
}

describe('AuthenticatedLayout', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false, mobileNavOpen: false })
    usePreferencesStore.getState().setTheme('light')
    usePreferencesStore.getState().setLocale('en')
  })

  it('renders the sidebar, the topbar and the page', () => {
    render(<Harness />)

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
    render(<Harness />)

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
    render(<Harness hasTemplate={false} qrStudio={false} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).getByRole('button', { name: 'Categories' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Dishes' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'QR code' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Appearance' })).toBeDisabled()
    // Design is how an owner escapes the locked state, so it stays open.
    expect(within(nav).getByRole('button', { name: 'Design' })).toBeEnabled()
  })

  it('collapses the sidebar to an icon rail and remembers it', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(useUiStore.getState().sidebarCollapsed).toBe(true)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('switches the whole document to Arabic and back', async () => {
    const user = userEvent.setup()
    render(<Harness />)

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
    render(<Harness />)

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
    render(<Harness onLogout={onLogout} />)

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
    render(<Harness />)

    expect(screen.getByRole('button', { name: /Free package/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    // Closed menu: no language tabs or theme switch on the bar itself.
    expect(screen.queryByRole('tab', { name: 'ع' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Dark mode' })).not.toBeInTheDocument()
  })

  it('keeps the account out of the sidebar and in the avatar menu', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByRole('button', { name: 'Account' })).not.toBeInTheDocument()
    for (const heading of ['Menu', 'Guests', 'Settings']) {
      expect(within(nav).getByText(heading)).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: /Account/ }))

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })

  it('leaves switched-off sections out of the sidebar', () => {
    render(<Harness hidden={['orders', 'analytics', 'qr']} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).queryByRole('button', { name: 'Orders' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: 'Analytics' })).not.toBeInTheDocument()
    // The QR studio switched off still leaves the plain QR code page.
    expect(within(nav).getByRole('button', { name: 'QR code' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Features' })).toBeInTheDocument()
  })

  it('never hides a core section, whatever the list says', () => {
    render(<Harness hidden={['overview', 'dishes', 'features']} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    for (const name of ['Overview', 'Dishes', 'Features']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(useUiStore.getState().mobileNavOpen).toBe(true)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(useUiStore.getState().mobileNavOpen).toBe(false))
  })
})
