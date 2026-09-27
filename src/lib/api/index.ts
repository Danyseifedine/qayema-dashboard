import { api } from './client'
import { installAuthRedirectInterceptor } from './interceptors/auth-redirect'
import { installCsrfInterceptor } from './interceptors/csrf'
import { installLocaleInterceptor } from './interceptors/locale'

let installed = false

/**
 * Wires the interceptors onto the shared client. Called once at boot; guarded
 * so a hot reload cannot stack duplicate handlers.
 */
export function configureApi(options: { onUnauthenticated?: () => void } = {}): void {
  if (installed) return
  installed = true

  installLocaleInterceptor(api)
  installCsrfInterceptor(api)
  installAuthRedirectInterceptor(api, options)
}

export { api } from './client'
export { toApiError } from './errors'
export { request } from './request'
