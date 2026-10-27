import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  fetchPackages,
  requestPackage,
  type PackageRequestPayload,
} from '@/features/package/api/package.api'
import type { Plan } from '@/features/auth'
import type { PackageList } from '@/features/package/schemas/package.schema'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import { packageKeys } from '@/features/package/hooks/package-keys'

export function usePackages(): UseQueryResult<PackageList, ApiError> {
  return useQuery<PackageList, ApiError>({
    queryKey: packageKeys.list(),
    queryFn: ({ signal }) => fetchPackages(signal),
  })
}

/**
 * Asks to move to a package.
 *
 * Nothing changes on the restaurant, so neither the session nor the package
 * list is invalidated; there is nothing new to read until a human acts on the
 * request.
 */
export function useRequestPackage() {
  return useMutation<void, ApiError, PackageRequestPayload>({
    mutationFn: requestPackage,
    onSuccess: () => {
      toast.success(t('package:toast.sent'), t('package:toast.sentDescription'))
    },
    onError: (error) => toast.error(t('package:toast.failed'), error),
  })
}

/** Whether a package carries a plan flag; one no package has (`build_your_own`) is never on. */
export function packageHas(features: object, flag: keyof Plan): boolean {
  return (features as Partial<Record<keyof Plan, unknown>>)[flag] === true
}

/**
 * The first package, in the catalogue's order, that includes a feature (the
 * one a locked feature points the owner to), by name in the reader's language.
 * Null while the catalogue loads, or when no package has it.
 */
export function usePackageFor(flag: keyof Plan, locale: Locale): string | null {
  const packages = usePackages()
  const found = packages.data?.data.find((pkg) => packageHas(pkg.features, flag))

  return found === undefined ? null : nameOr(found.name, locale, found.slug)
}

/**
 * Whether the catalogue is in and no package on it has the feature: one
 * Qayema turns on for a restaurant when asked, never sold.
 */
export function useOnNoPackage(flag: keyof Plan): boolean {
  const packages = usePackages()
  return (
    packages.data !== undefined && !packages.data.data.some((pkg) => packageHas(pkg.features, flag))
  )
}
