import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import {
  NAV_ITEMS,
  isNavItemHidden,
  navLock,
  OPEN_WHILE_OFFLINE,
  phoneTabs,
  type NavItem,
} from '@/app/layouts/authenticated/nav-items'
import { MenuGoingOffline, MenuOfflinePage } from '@/app/layouts/authenticated/menu-offline'
import { MorePage } from '@/app/layouts/authenticated/more-page'
import { PlanLockedPage } from '@/app/layouts/authenticated/plan-locked-page'
import { tierOf } from '@/app/layouts/authenticated/topbar/package-tier'
import { usePageKey } from '@/app/layouts/authenticated/use-page-key'
import { SessionGate, useWritingHelpLeft } from '@/features/auth'
import { useLogout, useOrderingMode, useTableOrderingMode } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { useOrderPulse } from '@/features/orders'
import { OrdersPage, TableOrdersPage } from '@/features/orders/pages'
import { ErrorBoundary, PageSkeleton } from '@/shared/components/feedback'
// Straight from its file: the forms barrel would bring every field into the shell.
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help'
import { Alert, Button } from '@/shared/components/ui'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'

/**
 * Each page's code (and what only it uses: charts, the QR library, drag and
 * drop) downloads when the page is first opened, so the dashboard shows
 * after one small download instead of the whole app. Orders stays in that
 * first download: its alerts run on every page.
 */
const PAGES = {
  overview: () => import('@/features/overview/pages'),
  analytics: () => import('@/features/analytics/pages'),
  menu: () => import('@/features/menu/pages'),
  qr: () => import('@/features/qr/pages'),
  package: () => import('@/features/package/pages'),
  socialLinks: () => import('@/features/social-links/pages'),
  account: () => import('@/features/account/pages'),
  restaurant: () => import('@/features/restaurant/pages'),
  appearance: () => import('@/features/appearance/pages'),
  design: () => import('@/features/design/pages'),
  tables: () => import('@/features/tables/pages'),
}

const OverviewPage = lazy(() => PAGES.overview().then((m) => ({ default: m.OverviewPage })))
const AnalyticsPage = lazy(() => PAGES.analytics().then((m) => ({ default: m.AnalyticsPage })))
const AnalyticsTeaser = lazy(() => PAGES.analytics().then((m) => ({ default: m.AnalyticsTeaser })))
const CategoriesPage = lazy(() => PAGES.menu().then((m) => ({ default: m.CategoriesPage })))
const DishesPage = lazy(() => PAGES.menu().then((m) => ({ default: m.DishesPage })))
const QrPage = lazy(() => PAGES.qr().then((m) => ({ default: m.QrPage })))
const PackagePage = lazy(() => PAGES.package().then((m) => ({ default: m.PackagePage })))
const SocialLinksPage = lazy(() =>
  PAGES.socialLinks().then((m) => ({ default: m.SocialLinksPage })),
)
const AccountPage = lazy(() => PAGES.account().then((m) => ({ default: m.AccountPage })))
const RestaurantPage = lazy(() => PAGES.restaurant().then((m) => ({ default: m.RestaurantPage })))
const FeaturesPage = lazy(() => PAGES.restaurant().then((m) => ({ default: m.FeaturesPage })))
const AppearancePage = lazy(() => PAGES.appearance().then((m) => ({ default: m.AppearancePage })))
const DesignPage = lazy(() => PAGES.design().then((m) => ({ default: m.DesignPage })))
const TablesPage = lazy(() => PAGES.tables().then((m) => ({ default: m.TablesPage })))

/**
 * Once the first page is up and the browser has nothing better to do, the
 * other pages download too, so moving between them never waits.
 */
function usePrefetchPages() {
  useEffect(() => {
    const fetchAll = () => Object.values(PAGES).forEach((load) => void load().catch(() => {}))
    // Safari has no idle callback: a short wait does the same job there.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(fetchAll, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(fetchAll, 2000)
    return () => window.clearTimeout(id)
  }, [])
}

function Dashboard({ user }: { user: AuthUser }) {
  // SessionGate guarantees a restaurant, so this is never null here.
  const restaurant = user.restaurant!
  const hasTemplate = restaurant.template_id !== null
  const plan = restaurant.plan

  // The page in the URL, so a refresh stays on it. With none, land where the
  // owner can actually act: without a design chosen, most of the dashboard is
  // locked, and Design is the only way out of that.
  const [chosenKey, setActiveKey] = usePageKey(hasTemplate ? 'overview' : 'design')
  const switchedOff = restaurant.switched_off
  // A section switched off while it was open hands over to the overview.
  const hidden = isNavItemHidden(chosenKey, switchedOff)
  const activeKey = hidden ? 'overview' : chosenKey
  useEffect(() => {
    if (hidden) setActiveKey('overview', { replace: true })
  }, [hidden, setActiveKey])
  const logout = useLogout()
  const locale = usePreferencesStore((state) => state.locale)
  const setLocale = usePreferencesStore((state) => state.setLocale)
  const { t } = useTranslation()
  // Orders placed in the menu are watched for wherever the owner is: those
  // to a table have their own way in, apart from the rest.
  const orderingMode = useOrderingMode()
  const tableOrderingMode = useTableOrderingMode()
  const ordersWaiting = useOrderPulse(
    orderingMode === 'menu' || tableOrderingMode === 'menu',
    restaurant.id,
  )
  usePrefetchPages()

  const lock = navLock(activeKey, { hasTemplate, plan })
  // An ended package keeps the menu online for a few days, then takes it
  // offline: every page but Package and Account asks to renew.
  const lapsed = restaurant.lapsed
  const offline = lapsed?.offline === true && !OPEN_WHILE_OFFLINE.includes(activeKey)
  const activeItem = NAV_ITEMS.find((item) => item.key === activeKey)

  // Each AI answer says how many uses are left; the session keeps the count.
  const setWritingHelpLeft = useWritingHelpLeft()

  // Menu text shows in the dashboard's language when the menu is written in
  // it, and in its main language (the one every name has) otherwise.
  const contentLocale = restaurant.languages.includes(locale) ? locale : restaurant.main_locale

  // The topbar pill names the package in the reader's language, falling back
  // to the slug for a package that has no name in either.
  const packageName = translated(restaurant.package.name, locale)

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: user.name, login: user.email ?? user.username ?? '' }}
      packageDaysLeft={restaurant.package.days_left}
      packageName={
        packageName.missing ? (restaurant.package.slug ?? t('app.freePackage')) : packageName.text
      }
      packageTier={tierOf(restaurant.package.slug)}
      publicUrl={restaurant.public_url}
      hasTemplate={hasTemplate}
      plan={plan}
      switchedOff={switchedOff}
      counts={{ orders: ordersWaiting.orders, 'table-orders': ordersWaiting.tables }}
      locale={locale}
      onLocaleChange={setLocale}
      onLogout={() => logout.mutate()}
      impersonation={user.impersonation}
    >
      {logout.isError ? (
        <Alert variant="error" title={t('app.logoutFailed')} className="mb-4">
          {logout.error.message}
        </Alert>
      ) : null}

      {lapsed && !lapsed.offline && lapsed.offline_at && activeKey !== 'package' ? (
        <MenuGoingOffline
          lapsed={lapsed}
          locale={locale}
          onOpenPackage={() => setActiveKey('package')}
        />
      ) : null}

      <WritingHelpProvider uses={restaurant.writing_help} onLeft={setWritingHelpLeft}>
        {/* Keyed by the page: a page that broke is left behind when another opens. */}
        <ErrorBoundary key={activeKey}>
          <Suspense fallback={<PageSkeleton />}>
            {offline && lapsed ? (
              <MenuOfflinePage
                lapsed={lapsed}
                locale={locale}
                onOpenPackage={() => setActiveKey('package')}
              />
            ) : lock === 'plan' && activeItem ? (
              <PlanLockedPage
                item={activeItem}
                locale={locale}
                onOpenPackage={() => setActiveKey('package')}
              >
                {activeKey === 'analytics' ? <AnalyticsTeaser locale={locale} /> : null}
              </PlanLockedPage>
            ) : lock === 'template' ? (
              <div>
                <Alert variant="info" title={t('app.lockedTitle')}>
                  {t('app.lockedBody')}
                </Alert>
                <Button className="mt-4" onClick={() => setActiveKey('design')}>
                  {t('app.browseDesigns')}
                </Button>
              </div>
            ) : activeKey === 'overview' ? (
              <OverviewPage
                limits={restaurant.limits}
                switchedOff={switchedOff}
                onOpen={setActiveKey}
                ordersWaiting={ordersWaiting}
                showToday={plan.analytics && !switchedOff.includes('analytics')}
              />
            ) : activeKey === 'analytics' ? (
              <AnalyticsPage
                locale={locale}
                advanced={plan.advanced_analytics}
                onOpenPackage={() => setActiveKey('package')}
              />
            ) : activeKey === 'design' ? (
              <DesignPage locale={locale} onOpenPackage={() => setActiveKey('package')} />
            ) : activeKey === 'appearance' ? (
              <AppearancePage locale={locale} />
            ) : activeKey === 'categories' ? (
              <CategoriesPage locale={contentLocale} onOpenDishes={() => setActiveKey('dishes')} />
            ) : activeKey === 'dishes' ? (
              <DishesPage
                locale={contentLocale}
                onOpenCategories={() => setActiveKey('categories')}
              />
            ) : activeKey === 'orders' ? (
              <OrdersPage onOpenFeatures={() => setActiveKey('features')} />
            ) : activeKey === 'table-orders' ? (
              <TableOrdersPage
                onOpenTables={() => setActiveKey('tables')}
                onOpenFeatures={() => setActiveKey('features')}
              />
            ) : activeKey === 'tables' ? (
              <TablesPage onOpenFeatures={() => setActiveKey('features')} />
            ) : activeKey === 'qr' ? (
              <QrPage
                locale={locale}
                onOpenFeatures={() => setActiveKey('features')}
                onOpenPackage={() => setActiveKey('package')}
              />
            ) : activeKey === 'social-links' ? (
              <SocialLinksPage />
            ) : activeKey === 'package' ? (
              <PackagePage locale={locale} />
            ) : activeKey === 'restaurant' ? (
              <RestaurantPage />
            ) : activeKey === 'features' ? (
              <FeaturesPage
                off={switchedOff}
                plan={plan}
                mainLocale={restaurant.main_locale}
                secondLocale={restaurant.second_locale}
                defaultLocale={restaurant.default_locale}
                ordering={restaurant.ordering}
                onOpenPackage={() => setActiveKey('package')}
                onOpenTables={() => setActiveKey('tables')}
                onOpenRestaurant={() => setActiveKey('restaurant')}
                onOpenDishes={() => setActiveKey('dishes')}
              />
            ) : activeKey === 'more' ? (
              <MorePage
                tabs={phoneTabs({ hasTemplate, plan }, switchedOff)}
                hasTemplate={hasTemplate}
                plan={plan}
                off={switchedOff}
                onOpen={setActiveKey}
              />
            ) : activeKey === 'account' ? (
              <AccountPage onOpenRestaurant={() => setActiveKey('restaurant')} />
            ) : (
              <Alert variant="info" title={t('app.notBuiltTitle')}>
                {t('app.notBuiltBody')}
              </Alert>
            )}
          </Suspense>
        </ErrorBoundary>
      </WritingHelpProvider>
    </AuthenticatedLayout>
  )
}

function App() {
  return <SessionGate>{(user) => <Dashboard user={user} />}</SessionGate>
}

export default App
