import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useDeferredValue, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import {
  navItem,
  isNavItemHidden,
  isNavKey,
  isOnPlan,
  navLock,
  OPEN_WHILE_OFFLINE,
  type NavItem,
  type NavKey,
} from '@/app/layouts/authenticated/nav-items'
import { MenuGoingOffline, MenuOfflinePage } from '@/app/layouts/authenticated/menu-offline'
import { MorePage } from '@/app/layouts/authenticated/more-page'
import { PlanLockedPage } from '@/app/layouts/authenticated/plan-locked-page'
import { tierOf } from '@/app/layouts/authenticated/topbar/package-tier'
import { usePageKey } from '@/app/layouts/authenticated/use-page-key'
import { SessionGate, useWritingHelpLeft } from '@/features/auth'
import { useLogout, useOrderingMode, useTableOrderingMode } from '@/features/auth'
import type { AuthRestaurant, AuthUser, Plan } from '@/features/auth'
import { useOrderPulse } from '@/features/orders'
import { OrdersPage, TableOrdersPage } from '@/features/orders/pages'
import { ErrorBoundary, PageSkeleton } from '@/shared/components/feedback'
// Straight from its file: the forms barrel would bring every field into the shell.
import { WritingHelpProvider } from '@/shared/components/forms/translatable/writing-help-provider'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
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
  offers: () => import('@/features/offers/pages'),
  buildYourOwn: () => import('@/features/build-your-own/pages'),
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
const OffersPage = lazy(() => PAGES.offers().then((m) => ({ default: m.OffersPage })))
const BuildYourOwnPage = lazy(() =>
  PAGES.buildYourOwn().then((m) => ({ default: m.BuildYourOwnPage })),
)
const AccountPage = lazy(() => PAGES.account().then((m) => ({ default: m.AccountPage })))
const RestaurantPage = lazy(() => PAGES.restaurant().then((m) => ({ default: m.RestaurantPage })))
const FeaturesPage = lazy(() => PAGES.restaurant().then((m) => ({ default: m.FeaturesPage })))
const AppearancePage = lazy(() => PAGES.appearance().then((m) => ({ default: m.AppearancePage })))
const DesignPage = lazy(() => PAGES.design().then((m) => ({ default: m.DesignPage })))
const TablesPage = lazy(() => PAGES.tables().then((m) => ({ default: m.TablesPage })))

/** What the pages are drawn from: the restaurant, the reader's language and the way to another page. */
type PageContext = {
  restaurant: AuthRestaurant
  plan: Plan
  switchedOff: readonly string[]
  hasTemplate: boolean
  /** The dashboard's language. */
  locale: Locale
  /** Menu text's language: the dashboard's when the menu is written in it, the main one otherwise. */
  contentLocale: Locale
  ordersWaiting: ReturnType<typeof useOrderPulse>
  /** Both kinds of order are taken, so their two pages switch between each other. */
  bothOrders: boolean
  /** Opens a page by its key; a string that names none is ignored. */
  open: (key: string) => void
}

/**
 * Each page by its nav key, with what it is handed. Keyed by `NavKey`, so a
 * nav item without a page here does not compile. Adding a page is one line.
 */
const PAGE_VIEWS: Record<NavKey, (page: PageContext) => ReactNode> = {
  overview: ({ restaurant, plan, switchedOff, ordersWaiting, open }) => (
    <OverviewPage
      limits={restaurant.limits}
      switchedOff={switchedOff}
      onOpen={open}
      ordersWaiting={ordersWaiting}
      showToday={plan.analytics && !switchedOff.includes('analytics')}
    />
  ),
  analytics: ({ locale, plan, open }) => (
    <AnalyticsPage
      locale={locale}
      advanced={plan.advanced_analytics}
      onOpenPackage={() => open('package')}
    />
  ),
  design: ({ locale, open }) => (
    <DesignPage locale={locale} onOpenPackage={() => open('package')} />
  ),
  appearance: ({ locale }) => <AppearancePage locale={locale} />,
  categories: ({ contentLocale, open }) => (
    <CategoriesPage locale={contentLocale} onOpenDishes={() => open('dishes')} />
  ),
  dishes: ({ contentLocale, open }) => (
    <DishesPage
      locale={contentLocale}
      onOpenCategories={() => open('categories')}
      onOpenBuilds={() => open('build-your-own')}
      onOpenOffers={() => open('offers')}
    />
  ),
  orders: ({ bothOrders, open }) => (
    <OrdersPage
      onOpenFeatures={() => open('features')}
      onOpenTableOrders={bothOrders ? () => open('table-orders') : undefined}
    />
  ),
  'table-orders': ({ bothOrders, open }) => (
    <TableOrdersPage
      onOpenTables={() => open('tables')}
      onOpenFeatures={() => open('features')}
      onOpenOrders={bothOrders ? () => open('orders') : undefined}
    />
  ),
  tables: ({ open }) => <TablesPage onOpenFeatures={() => open('features')} />,
  qr: ({ locale, open }) => (
    <QrPage
      locale={locale}
      onOpenFeatures={() => open('features')}
      onOpenPackage={() => open('package')}
    />
  ),
  'social-links': () => <SocialLinksPage />,
  offers: ({ contentLocale, open }) => (
    <OffersPage locale={contentLocale} onOpenCategories={() => open('categories')} />
  ),
  'build-your-own': ({ contentLocale }) => <BuildYourOwnPage locale={contentLocale} />,
  package: ({ locale }) => <PackagePage locale={locale} />,
  restaurant: () => <RestaurantPage />,
  features: ({ restaurant, plan, switchedOff, open }) => (
    <FeaturesPage
      off={switchedOff}
      plan={plan}
      mainLocale={restaurant.main_locale}
      secondLocale={restaurant.second_locale}
      defaultLocale={restaurant.default_locale}
      ordering={restaurant.ordering}
      onOpenPackage={() => open('package')}
      onOpenTables={() => open('tables')}
      onOpenRestaurant={() => open('restaurant')}
      onOpenDishes={() => open('dishes')}
    />
  ),
  more: ({ hasTemplate, plan, switchedOff, open }) => (
    <MorePage hasTemplate={hasTemplate} plan={plan} off={switchedOff} onOpen={open} />
  ),
  account: () => <AccountPage />,
}

/** A phone that asked to save data, or on a 2G/3G connection (where the browser says). */
function onSlowConnection(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection
  return (
    connection?.saveData === true ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
  )
}

/**
 * Once the first page and its data are in and the browser has nothing better
 * to do, the other pages download too, so moving between them never waits.
 * Never before the page's own data (on a slow line the downloads held it
 * back), and not at all on a slow or data-saving connection, where a page
 * downloads when it is opened.
 */
function usePrefetchPages() {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (onSlowConnection()) return
    let timer: number | undefined
    let idle: number | undefined
    const fetchAll = () => {
      if (queryClient.isFetching() > 0) {
        timer = window.setTimeout(fetchAll, 1000)
        return
      }
      Object.values(PAGES).forEach((load) => void load().catch(() => {}))
    }
    // Safari has no idle callback: a short wait does the same job there.
    if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(fetchAll, { timeout: 4000 })
    } else {
      timer = window.setTimeout(fetchAll, 2000)
    }
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle)
      window.clearTimeout(timer)
    }
  }, [queryClient])
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
  // The page drawn below. The sidebar moves at once; the page that was open
  // stays until the next one's code has arrived, so a page change shows only
  // that page's own skeleton, never a generic one before it.
  const shownKey = useDeferredValue(activeKey)
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

  const lock = navLock(shownKey, { hasTemplate, plan })
  // An ended package keeps the menu online for a few days, then takes it
  // offline: every page but Package and Account asks to renew.
  const lapsed = restaurant.lapsed
  const offline = lapsed?.offline === true && !OPEN_WHILE_OFFLINE.includes(shownKey)
  const shownItem = navItem(shownKey)
  // Both kinds of order taken: their two pages switch between each other.
  const bothOrders = ['orders', 'table-orders'].every(
    (key) => !isNavItemHidden(key, switchedOff) && isOnPlan(navItem(key)!, plan),
  )

  // Each AI answer says how many uses are left; the session keeps the count.
  const setWritingHelpLeft = useWritingHelpLeft()

  // Menu text shows in the dashboard's language when the menu is written in
  // it, and in its main language (the one every name has) otherwise.
  const contentLocale = restaurant.languages.includes(locale) ? locale : restaurant.main_locale

  const open = (key: string) => {
    if (isNavKey(key)) setActiveKey(key)
  }

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: user.name, login: user.email ?? user.username ?? '' }}
      packageDaysLeft={restaurant.package.days_left}
      // The package in the reader's language, else its slug, for a package
      // that has no name in either.
      packageName={nameOr(
        restaurant.package.name,
        locale,
        restaurant.package.slug ?? t('app.freePackage'),
      )}
      packageTier={tierOf(restaurant.package)}
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
        {/* Outside the keyed boundary, so it stays mounted from page to page
            (a new one would show its fallback on every change). Keyed by the
            page: a page that broke is left behind when another opens. */}
        <Suspense fallback={<PageSkeleton />}>
          <ErrorBoundary key={shownKey}>
            {offline && lapsed ? (
              <MenuOfflinePage
                lapsed={lapsed}
                locale={locale}
                onOpenPackage={() => setActiveKey('package')}
              />
            ) : lock === 'plan' && shownItem ? (
              <PlanLockedPage
                item={shownItem}
                locale={locale}
                onOpenPackage={() => setActiveKey('package')}
              >
                {shownKey === 'analytics' ? <AnalyticsTeaser locale={locale} /> : null}
              </PlanLockedPage>
            ) : lock === 'template' ? (
              <Alert
                variant="warning"
                title={t('app.lockedTitle')}
                action={{ label: t('app.browseDesigns'), onClick: () => setActiveKey('design') }}
              >
                {t('app.lockedBody')}
              </Alert>
            ) : (
              PAGE_VIEWS[shownKey]({
                restaurant,
                plan,
                switchedOff,
                hasTemplate,
                locale,
                contentLocale,
                ordersWaiting,
                bothOrders,
                open,
              })
            )}
          </ErrorBoundary>
        </Suspense>
      </WritingHelpProvider>
    </AuthenticatedLayout>
  )
}

export function App() {
  return <SessionGate>{(user) => <Dashboard user={user} />}</SessionGate>
}
