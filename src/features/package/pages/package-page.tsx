import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/features/auth'
import { CardGridSkeleton, ErrorState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { translated } from '@/shared/utils/string/translated'
import { PackageCard } from '@/features/package/components/cards/package-card'
import { CurrentPackageCard } from '@/features/package/components/current/current-package-card'
import { RequestPackageDialog } from '@/features/package/components/request/request-package-dialog'
import { usePackages } from '@/features/package/hooks/use-packages'
import type { Package } from '@/features/package/schemas/package.schema'

export type PackagePageProps = {
  locale: Locale
}

/**
 * What the owner is on and what else they could be on.
 *
 * Nothing is sold here. Moving up is a conversation: the owner asks, an admin
 * assigns the package, and the limits move on the next session read.
 */
export function PackagePage({ locale }: PackagePageProps) {
  const { t } = useTranslation('package')
  const packages = usePackages()
  const session = useSession()
  const [requesting, setRequesting] = useState<Package | null>(null)

  const restaurant = session.data?.restaurant ?? null
  const list = packages.data?.data ?? []
  const current = packages.data?.meta.current ?? restaurant?.package.slug ?? null

  const currentName = restaurant === null ? '' : translated(restaurant.package.name, locale)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{t('page.description')}</p>
      </div>

      {restaurant !== null ? (
        <CurrentPackageCard
          name={
            currentName === '' || currentName.missing
              ? (current ?? t('page.fallbackName'))
              : currentName.text
          }
          isContactOnly={restaurant.package.is_contact_only}
          endsAt={restaurant.package.ends_at}
          limits={restaurant.limits}
          qrStudio={restaurant.plan.qr_studio}
        />
      ) : null}

      {packages.isPending ? (
        <CardGridSkeleton count={4} />
      ) : packages.isError ? (
        <ErrorState description={packages.error.message} onRetry={() => void packages.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              current={pkg.slug === current}
              locale={locale}
              onRequest={() => setRequesting(pkg)}
            />
          ))}
        </div>
      )}

      <RequestPackageDialog
        open={requesting !== null}
        pkg={requesting}
        locale={locale}
        onClose={() => setRequesting(null)}
      />
    </div>
  )
}
