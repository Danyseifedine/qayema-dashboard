import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { toast } from '@/shared/components/feedback'
import type { ApiError } from '@/shared/types/api'
import { fetchPackages, requestPackage, type PackageRequestPayload } from '../api/package.api'
import type { PackageList, PackageRequestResult } from '../schemas/package.schema'
import { packageKeys } from './package-keys'

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
 * list is invalidated — there is nothing new to read until a human acts on the
 * request.
 */
export function useRequestPackage() {
  return useMutation<PackageRequestResult, ApiError, PackageRequestPayload>({
    mutationFn: requestPackage,
    onSuccess: () => {
      toast.success('Request sent', 'We will be in touch shortly to set this up.')
    },
    onError: (error) => toast.error('Could not send that request', error),
  })
}
