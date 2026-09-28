import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/features/auth'
import { CardGridSkeleton, ErrorState } from '@/shared/components/feedback'
import type { Locale } from '@/shared/constants/locales'
import { PackageCard } from '@/features/package/components/cards/package-card'
import { CompareTable } from '@/features/package/components/compare/compare-table'
import { CurrentPackageCard } from '@/features/package/components/current/current-package-card'
import { RequestPackageDialog } from '@/features/package/components/request/request-package-dialog'
import { usePackages } from '@/features/package/hooks/use-packages'
import type { Package } from '@/features/package/schemas/package.schema'

export type PackagePageProps = {
  locale: Locale
}

/**
 * What the owner is on, until when, and what every package includes.
 *
 * Nothing is sold here. Moving up is a conversation: the owner asks, an admin
 * assigns the package, and the limits move on the next session read.
 */
export function PackagePage({ locale }: PackagePageProps) {
  const { t } = useTranslation('package')
  const packages = usePackages()
  const session = useSession()
  // The slug, not the package: "Ask to renew" renders from the session and
  // can be pressed before the catalogue arrives; the dialog opens once it has.
  const [requestingSlug, setRequestingSlug] = useState<string | null>(null)

  const restaurant = session.data?.restaurant ?? null
  const list = packages.data?.data ?? []
  const current = packages.data?.meta.current ?? restaurant?.package.slug ?? null
  const requesting: Package | null = list.find((pkg) => pkg.slug === requestingSlug) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] leading-tight">{t('page.title')}</h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{t('page.description')}</p>
      </div>

      {restaurant !== null ? (
        <CurrentPackageCard
          restaurant={restaurant}
          locale={locale}
          isDefault={list.some((pkg) => pkg.slug === restaurant.package.slug && pkg.is_default)}
          onAskFor={setRequestingSlug}
        />
      ) : null}

      {packages.isPending ? (
        <CardGridSkeleton count={4} />
      ) : packages.isError ? (
        <ErrorState description={packages.error.message} onRetry={() => void packages.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                previous={list[index - 1]}
                current={pkg.slug === current}
                locale={locale}
                onRequest={() => setRequestingSlug(pkg.slug)}
              />
            ))}
          </div>

          <section className="flex flex-col gap-3 pt-2">
            <div>
              <h3 className="font-display text-[17px] leading-tight">{t('page.compareTitle')}</h3>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{t('page.compareDescription')}</p>
            </div>
            <CompareTable packages={list} current={current} locale={locale} />
          </section>
        </>
      )}

      <RequestPackageDialog
        open={requesting !== null}
        pkg={requesting}
        locale={locale}
        onClose={() => setRequestingSlug(null)}
      />
    </div>
  )
}
