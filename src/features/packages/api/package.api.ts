import { request } from '@/lib/api'
import {
  packageListSchema,
  packageRequestResultSchema,
  type PackageList,
  type PackageRequestResult,
} from '../schemas/package.schema'

export function fetchPackages(signal?: AbortSignal): Promise<PackageList> {
  return request(packageListSchema, { method: 'GET', url: '/api/packages', signal })
}

export type PackageRequestPayload = {
  /** The package's slug. The default package cannot be requested. */
  package: string
  message?: string
}

/**
 * Asks to move to a package. Nothing is charged and nothing changes yet: the
 * request reaches the admin inbox and a human assigns it. The daily quota is
 * shared with the public contact form, so a 429 is a normal outcome.
 */
export function requestPackage(payload: PackageRequestPayload): Promise<PackageRequestResult> {
  return request(packageRequestResultSchema, {
    method: 'POST',
    url: '/api/packages/request',
    data: payload,
  })
}
