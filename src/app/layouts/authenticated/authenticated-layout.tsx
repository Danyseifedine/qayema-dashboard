import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Sidebar, Topbar } from '@/shared/components/navigation'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { useUiStore } from '@/stores/ui.store'
import { NAV_ITEMS, type NavItem } from './nav-items'

export type AuthenticatedLayoutProps = {
  activeKey: string
  onNavigate: (item: NavItem) => void
  user: { name: string; email: string }
  /** The package the restaurant is on, in the current language. */
  packageName: string
  publicUrl?: string | null
  hasTemplate: boolean
  features: { qr_studio: boolean }
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onLogout: () => void
  children: ReactNode
}

/**
 * The signed-in shell: a sidebar beside a scrolling content column under a
 * sticky topbar. Below `lg` the sidebar becomes a drawer over the content.
 */
export function AuthenticatedLayout({
  activeKey,
  onNavigate,
  user,
  packageName,
  publicUrl,
  hasTemplate,
  features,
  locale,
  onLocaleChange,
  onLogout,
  children,
}: AuthenticatedLayoutProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const mobileOpen = useUiStore((state) => state.mobileNavOpen)
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen)

  // Escape closes the drawer, and an open drawer must not scroll the page
  // behind it.
  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen, setMobileOpen])

  const activeItem = NAV_ITEMS.find((item) => item.key === activeKey)

  const select = (item: NavItem) => {
    onNavigate(item)
    setMobileOpen(false)
  }

  const goTo = (key: string) => {
    const item = NAV_ITEMS.find((candidate) => candidate.key === key)
    if (item) select(item)
  }

  const sidebar = (mobile: boolean) => (
    <Sidebar
      activeKey={activeKey}
      onSelect={select}
      collapsed={mobile ? false : collapsed}
      onToggleCollapse={toggleSidebar}
      hasTemplate={hasTemplate}
      features={features}
    />
  )

  return (
    <div className="flex min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop rail */}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">{sidebar(false)}</div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 start-0 flex w-[248px] max-w-[85vw]',
            'transition-transform duration-300 [transition-timing-function:var(--ease-qayema)]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          )}
        >
          {sidebar(true)}
          <button
            type="button"
            tabIndex={mobileOpen ? 0 : -1}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="absolute -end-11 top-3 grid size-9 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow-lg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={activeItem?.label ?? 'Dashboard'}
          subtitle={
            publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="force-ltr hover:text-accent hover:underline"
              >
                {publicUrl.replace(/^https?:\/\//, '')}
              </a>
            ) : null
          }
          user={user}
          packageName={packageName}
          publicUrl={publicUrl}
          locale={locale}
          onLocaleChange={onLocaleChange}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenPackage={() => goTo('package')}
          onOpenProfile={() => goTo('account')}
          onLogout={onLogout}
        />
        {/* Full width: the menu builder lays cards out in a grid and wants
            every pixel. A page that needs a narrower measure caps itself.
            A flex column so a page can hand its empty state the leftover
            height instead of leaving it stranded under the heading. */}
        <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
