import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { t } from '@/lib/i18n'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import {
  fetchPackages,
  requestPackage,
  type PackageRequestPayload,
} from '@/features/package/api/package.api'
import type { PackageFlag, PackageList } from '@/features/package/schemas/package.schema'
import type { Locale } from '@/shared/constants/locales'
import { translated } from '@/shared/utils/string/translated'
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

/**
 * The first package, in the catalogue's order, that includes a feature (the
 * one a locked feature points the owner to), by name in the reader's language.
 * Null while the catalogue loads, or when no package has it.
 */
export function usePackageFor(flag: PackageFlag, locale: Locale): string | null {
  const packages = usePackages()
  const found = packages.data?.data.find((pkg) => pkg.features[flag])

  if (found === undefined) return null
  const name = translated(found.name, locale)
  return name.missing ? found.slug : name.text
}
