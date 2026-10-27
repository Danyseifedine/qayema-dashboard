import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import type { Plan } from '@/features/auth'
import { packageHas, usePackages } from '@/features/package/hooks/use-packages'
import type { Package } from '@/features/package/schemas/package.schema'

/**
 * The request form loads when "Contact us" is pressed: this notice sits on
 * the locked page, which is part of the first download, and the form (its
 * fields, its modal) is not needed until then.
 */
const RequestPackageDialog = lazy(() =>
  import('@/features/package/components/request/request-package-dialog').then((module) => ({
    default: module.RequestPackageDialog,
  })),
)

export type TurnedOffNoticeProps = {
  /** The feature an admin turned off for this restaurant, or one no package has. */
  flag: keyof Plan
  locale: Locale
  /**
   * `back` (the default): an admin turned it off, ask for it back. `on`: no
   * package has it (an admin turns it on per restaurant), ask for it.
   */
  ask?: 'back' | 'on'
}

/**
 * Where a feature an admin turned off for this restaurant would be. Not an
 * upsell: the package may well include it, so there is no way to the
 * packages, only the way to ask Qayema for it back. A feature no package
 * has (`ask="on"`) is asked for the same way, worded as turning it on.
 * That goes through the
 * package request (the dashboard's one line to Qayema's inbox), which needs
 * a package other than the default one: the restaurant's own, else the first
 * that has the feature, else any.
 */
export function TurnedOffNotice({ flag, locale, ask = 'back' }: TurnedOffNoticeProps) {
  const { t } = useTranslation('package')
  const packages = usePackages()
  const [asking, setAsking] = useState(false)

  const about = requestableFor(packages.data?.data ?? [], packages.data?.meta.current, flag)
  const words = ask === 'on' ? 'askOn' : 'turnedOff'

  return (
    <>
      <Alert
        variant="warning"
        title={t(`${words}.title`)}
        action={
          about ? { label: t(`${words}.contact`), onClick: () => setAsking(true) } : undefined
        }
      >
        {t(`${words}.description`)}
      </Alert>
      {asking ? (
        <Suspense fallback={null}>
          <RequestPackageDialog
            open
            pkg={about}
            locale={locale}
            onClose={() => setAsking(false)}
            title={t(`${words}.dialogTitle`)}
            description={t('turnedOff.dialogDescription')}
            message={t(`${words}.message`, { feature: t(`turnedOff.names.${flag}`) })}
          />
        </Suspense>
      ) : null}
    </>
  )
}

function requestableFor(
  list: readonly Package[],
  current: string | null | undefined,
  flag: keyof Plan,
): Package | null {
  const requestable = list.filter((pkg) => !pkg.is_default)
  return (
    requestable.find((pkg) => pkg.slug === current) ??
    requestable.find((pkg) => packageHas(pkg.features, flag)) ??
    requestable[0] ??
    null
  )
}
