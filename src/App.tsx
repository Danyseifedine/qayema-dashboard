import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import {
  isNavItemHidden,
  isNavItemLocked,
  type NavItem,
} from '@/app/layouts/authenticated/nav-items'
import { usePageKey } from '@/app/layouts/authenticated/use-page-key'
import { SessionGate } from '@/features/auth'
import { useLogout } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { CategoriesPage } from '@/features/menu'
import { DishesPage } from '@/features/menu'
import { OrdersPage } from '@/features/orders'
import { AnalyticsPage } from '@/features/analytics'
import { OverviewPage } from '@/features/overview'
import { QrPage } from '@/features/qr'
import { PackagePage } from '@/features/package'
import { SocialLinksPage } from '@/features/social-links'
import { AccountPage } from '@/features/account'
import { FeaturesPage } from '@/features/restaurant'
import { RestaurantPage } from '@/features/restaurant'
import { AppearancePage } from '@/features/appearance'
import { DesignPage } from '@/features/design'
import { Alert, Button } from '@/shared/components/ui'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'

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

  const locked = isNavItemLocked(activeKey, { hasTemplate, plan })

  // Menu text shows in the dashboard's language when the menu is written in
  // it, and in English (the language every name has) otherwise.
  const contentLocale = restaurant.languages.includes(locale) ? locale : 'en'

  // The topbar pill names the package in the reader's language, falling back
  // to the slug for a package that has no name in either.
  const packageName = translated(restaurant.package.name, locale)

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: user.name, email: user.email }}
      packageName={
        packageName.missing ? (restaurant.package.slug ?? t('app.freePackage')) : packageName.text
      }
      publicUrl={restaurant.public_url}
      hasTemplate={hasTemplate}
      plan={plan}
      switchedOff={switchedOff}
      locale={locale}
      onLocaleChange={setLocale}
      onLogout={() => logout.mutate()}
    >
      {logout.isError ? (
        <Alert variant="error" title={t('app.logoutFailed')} className="mb-4">
          {logout.error.message}
        </Alert>
      ) : null}

      {locked ? (
        <div>
          <Alert variant="info" title={t('app.lockedTitle')}>
            {t('app.lockedBody')}
          </Alert>
          <Button className="mt-4" onClick={() => setActiveKey('design')}>
            {t('app.browseDesigns')}
          </Button>
        </div>
      ) : activeKey === 'overview' ? (
        <OverviewPage limits={restaurant.limits} switchedOff={switchedOff} onOpen={setActiveKey} />
      ) : activeKey === 'analytics' ? (
        <AnalyticsPage
          locale={locale}
          advanced={plan.advanced_analytics}
          onOpenPackage={() => setActiveKey('package')}
        />
      ) : activeKey === 'design' ? (
        <DesignPage locale={locale} />
      ) : activeKey === 'appearance' ? (
        <AppearancePage locale={locale} />
      ) : activeKey === 'categories' ? (
        <CategoriesPage locale={contentLocale} onOpenDishes={() => setActiveKey('dishes')} />
      ) : activeKey === 'dishes' ? (
        <DishesPage locale={contentLocale} onOpenCategories={() => setActiveKey('categories')} />
      ) : activeKey === 'orders' ? (
        <OrdersPage />
      ) : activeKey === 'qr' ? (
        <QrPage onOpenFeatures={() => setActiveKey('features')} />
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
          secondLocale={restaurant.second_locale}
          defaultLocale={restaurant.default_locale}
        />
      ) : activeKey === 'account' ? (
        <AccountPage onOpenRestaurant={() => setActiveKey('restaurant')} />
      ) : (
        <Alert variant="info" title={t('app.notBuiltTitle')}>
          {t('app.notBuiltBody')}
        </Alert>
      )}
    </AuthenticatedLayout>
  )
}

function App() {
  return <SessionGate>{(user) => <Dashboard user={user} />}</SessionGate>
}

export default App
