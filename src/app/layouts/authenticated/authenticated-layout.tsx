import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BottomTabs } from '@/app/layouts/authenticated/bottom-tabs/bottom-tabs'
import { ImpersonationBanner } from '@/app/layouts/authenticated/impersonation-banner'
import { Sidebar } from '@/app/layouts/authenticated/sidebar/sidebar'
import type { PackageTier } from '@/app/layouts/authenticated/topbar/package-tier'
import { Topbar } from '@/app/layouts/authenticated/topbar/topbar'
import { usePageHero } from '@/app/layouts/authenticated/topbar/use-page-hero'
import type { AuthUser } from '@/features/auth'
import type { Locale } from '@/shared/constants/locales'
import { useUiStore } from '@/stores/ui.store'
import {
  NAV_ITEMS,
  phoneTabs,
  type NavAccess,
  type NavItem,
} from '@/app/layouts/authenticated/nav-items'

export type AuthenticatedLayoutProps = {
  activeKey: string
  onNavigate: (item: NavItem) => void
  /** `login` is the email, or the username of an account made without one. */
  user: { name: string; login: string }
  /** The package the restaurant is on, in the current language. */
  packageName: string
  /** Its metal in the topbar: bronze Free, silver Pro, gold Premium. */
  packageTier: PackageTier
  /** Whole days until the package ends; null when it does not end. */
  packageDaysLeft?: number | null
  publicUrl?: string | null
  hasTemplate: boolean
  plan: NavAccess['plan']
  /** Sections the owner switched off. */
  switchedOff: readonly string[]
  /** A count to wear beside a section, by nav key: orders waiting. */
  counts?: Partial<Record<string, number>>
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onLogout: () => void
  /** An admin viewing this dashboard as its owner, with the way back. */
  impersonation?: AuthUser['impersonation']
  children: ReactNode
}

/**
 * The signed-in shell: a sidebar beside a scrolling content column under a
 * sticky topbar. Below `lg` (a phone, a small tablet) it is an app instead:
 * four tabs along the bottom (Home, Menu, the orders, More), and a back
 * button in the topbar on any section opened from More.
 */
export function AuthenticatedLayout({
  activeKey,
  onNavigate,
  user,
  packageName,
  packageTier,
  packageDaysLeft = null,
  publicUrl,
  hasTemplate,
  plan,
  switchedOff,
  counts,
  locale,
  onLocaleChange,
  onLogout,
  impersonation = null,
  children,
}: AuthenticatedLayoutProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { t } = useTranslation()

  const activeItem = NAV_ITEMS.find((item) => item.key === activeKey)
  const tabs = phoneTabs({ hasTemplate, plan }, switchedOff)

  const goTo = (key: string) => {
    const item = NAV_ITEMS.find((candidate) => candidate.key === key)
    if (item) onNavigate(item)
  }

  const hero = usePageHero(activeKey, user.name)

  // A section that is not a tab was opened from More (or from the package
  // pill or the account menu): back leads there.
  const fromMore = !tabs.some((tab) => tab.key === activeKey)

  return (
    <div className="flex min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop rail */}
      <div className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar
          activeKey={activeKey}
          onSelect={onNavigate}
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
          hasTemplate={hasTemplate}
          plan={plan}
          off={switchedOff}
          counts={counts}
        />
      </div>

      {/* Content column */}
      {/* Under the heading: a soft light from the top, a fine grain and a
          fading dot grid. */}
      <div className="home-backdrop flex min-w-0 flex-1 flex-col">
        {impersonation ? (
          <ImpersonationBanner owner={user.name} impersonation={impersonation} />
        ) : null}
        <Topbar
          title={activeItem ? t(activeItem.labelKey) : t('app.dashboard')}
          user={user}
          packageName={packageName}
          packageTier={packageTier}
          packageDaysLeft={packageDaysLeft}
          publicUrl={publicUrl}
          locale={locale}
          onLocaleChange={onLocaleChange}
          onBack={fromMore ? () => goTo('more') : undefined}
          hero={hero}
          onOpenPackage={() => goTo('package')}
          onOpenAccount={() => goTo('account')}
          onLogout={onLogout}
        />
        {/* Full width: the menu builder lays cards out in a grid and wants
            every pixel. A page that needs a narrower measure caps itself.
            A flex column so a page can hand its empty state the leftover
            height instead of leaving it stranded under the heading. */}
        <main className="flex min-w-0 flex-1 flex-col px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomTabs tabs={tabs} activeKey={activeKey} onSelect={goTo} counts={counts} />
    </div>
  )
}
