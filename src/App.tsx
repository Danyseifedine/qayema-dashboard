import { useState } from 'react'
import { AuthenticatedLayout } from '@/app/layouts/authenticated/authenticated-layout'
import { isNavItemLocked, type NavItem } from '@/app/layouts/authenticated/nav-items'
import { SessionGate } from '@/features/auth/components/session-gate'
import { useLogout } from '@/features/auth/hooks/use-logout'
import type { AuthUser } from '@/features/auth/schemas/user.schema'
import { CategoriesPage } from '@/features/menu/pages/categories-page'
import { DishesPage } from '@/features/menu/pages/dishes-page'
import { OrdersPage } from '@/features/orders/pages/orders-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { QrPage } from '@/features/qr-studio/pages/qr-page'
import { PackagesPage } from '@/features/packages/pages/packages-page'
import { SocialLinksPage } from '@/features/social-links/pages/social-links-page'
import { AccountPage } from '@/features/account/pages/account-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'
import { TemplatesPage } from '@/features/templates/pages/templates-page'
import { Alert, Button } from '@/shared/components/ui'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'

function Dashboard({ user }: { user: AuthUser }) {
  // SessionGate guarantees a restaurant, so this is never null here.
  const restaurant = user.restaurant!
  const hasTemplate = restaurant.template_id !== null
  const features = restaurant.features

  // Land where the owner can actually act. Without a design chosen, most of
  // the dashboard is locked, and Templates is the only way out of that.
  const [activeKey, setActiveKey] = useState(() => (hasTemplate ? 'overview' : 'templates'))
  const logout = useLogout()
  const locale = usePreferencesStore((state) => state.locale)
  const setLocale = usePreferencesStore((state) => state.setLocale)

  const locked = isNavItemLocked(activeKey, { hasTemplate, features })

  // The topbar pill names the package in the reader's language, falling back
  // to the slug for a package that has no name in either.
  const packageName = translated(restaurant.package.name, locale)

  return (
    <AuthenticatedLayout
      activeKey={activeKey}
      onNavigate={(item: NavItem) => setActiveKey(item.key)}
      user={{ name: user.name, email: user.email }}
      packageName={packageName.missing ? (restaurant.package.slug ?? 'Free') : packageName.text}
      publicUrl={restaurant.public_url}
      hasTemplate={hasTemplate}
      features={features}
      locale={locale}
      onLocaleChange={setLocale}
      onLogout={() => logout.mutate()}
    >
      {logout.isError ? (
        <Alert variant="error" title="Could not log out" className="mb-4">
          {logout.error.message}
        </Alert>
      ) : null}

      {locked ? (
        <div>
          <Alert variant="info" title="Choose a menu design first">
            Your menu, QR code and settings open up once you pick a design. Picking one is free, and
            you can switch whenever you like.
          </Alert>
          <Button className="mt-4" onClick={() => setActiveKey('templates')}>
            Browse designs
          </Button>
        </div>
      ) : activeKey === 'overview' ? (
        <OverviewPage
          locale={locale}
          advanced={features.advanced_analytics}
          onOpenPackage={() => setActiveKey('package')}
        />
      ) : activeKey === 'templates' ? (
        <TemplatesPage locale={locale} />
      ) : activeKey === 'categories' ? (
        <CategoriesPage locale={locale} onOpenDishes={() => setActiveKey('dishes')} />
      ) : activeKey === 'dishes' ? (
        <DishesPage locale={locale} onOpenCategories={() => setActiveKey('categories')} />
      ) : activeKey === 'orders' ? (
        <OrdersPage />
      ) : activeKey === 'qr' ? (
        <QrPage />
      ) : activeKey === 'social-links' ? (
        <SocialLinksPage />
      ) : activeKey === 'package' ? (
        <PackagesPage locale={locale} />
      ) : activeKey === 'settings' ? (
        <SettingsPage />
      ) : activeKey === 'account' ? (
        <AccountPage onOpenRestaurant={() => setActiveKey('settings')} />
      ) : (
        <Alert variant="info" title="Not built yet">
          This section has its folder and its place in the navigation. The form library, the shell
          and the API client are done; the pages come next.
        </Alert>
      )}
    </AuthenticatedLayout>
  )
}

function App() {
  return <SessionGate>{(user) => <Dashboard user={user} />}</SessionGate>
}

export default App
