import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '@/stores/preferences.store'
import { useUiStore } from '@/stores/ui.store'
import { AuthenticatedLayout } from './authenticated-layout'
import type { NavItem } from './nav-items'

function Harness({
  hasTemplate = true,
  qrStudio = true,
  onLogout = vi.fn(),
}: {
  hasTemplate?: boolean
  qrStudio?: boolean
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
      features={{ qr_studio: qrStudio }}
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
      'Templates',
      'QR Studio',
      'Package',
      'Settings',
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

    await user.click(within(nav).getByRole('button', { name: 'Templates' }))

    expect(within(nav).getByRole('button', { name: 'Templates' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(overview).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument()
  })

  it('locks the sections that need a template or the QR feature', () => {
    render(<Harness hasTemplate={false} qrStudio={false} />)

    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    expect(within(nav).getByRole('button', { name: 'Categories' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'Dishes' })).toBeDisabled()
    expect(within(nav).getByRole('button', { name: 'QR Studio' })).toBeDisabled()
    // Templates is how an owner escapes the locked state, so it stays open.
    expect(within(nav).getByRole('button', { name: 'Templates' })).toBeEnabled()
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

    await user.click(screen.getByRole('switch', { name: 'Switch to dark theme' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(usePreferencesStore.getState().theme).toBe('dark')

    await user.click(screen.getByRole('switch', { name: 'Switch to light theme' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('opens the user menu and logs out', async () => {
    const onLogout = vi.fn()
    const user = userEvent.setup()
    render(<Harness onLogout={onLogout} />)

    await user.click(screen.getByRole('button', { expanded: false }))

    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('owner@example.com')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /View public menu/ })).toHaveAttribute(
      'href',
      'https://qayema.test/beit-qayema',
    )

    await user.click(within(menu).getByRole('menuitem', { name: /Log out/ }))
    expect(onLogout).toHaveBeenCalledOnce()
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
