import { useState } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { CardGridSkeleton, ErrorState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { translated } from '@/shared/utils/string/translated'
import { PackageCard } from '../components/cards/package-card'
import { CurrentPackageCard } from '../components/current/current-package-card'
import { RequestPackageDialog } from '../components/request/request-package-dialog'
import { usePackages } from '../hooks/use-packages'
import type { Package } from '../schemas/package.schema'

export type PackagesPageProps = {
  locale: Locale
}

/**
 * What the owner is on and what else they could be on.
 *
 * Nothing is sold here. Moving up is a conversation: the owner asks, an admin
 * assigns the package, and the limits move on the next session read.
 */
export function PackagesPage({ locale }: PackagesPageProps) {
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
        <h2 className="font-display text-[19px] leading-tight">Your package</h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          What your menu can hold, and what a bigger package would give you.
        </p>
      </div>

      {restaurant !== null ? (
        <CurrentPackageCard
          name={currentName === '' || currentName.missing ? (current ?? 'Free') : currentName.text}
          isContactOnly={restaurant.package.is_contact_only}
          endsAt={restaurant.package.ends_at}
          limits={restaurant.limits}
          qrStudio={restaurant.features.qr_studio}
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
